import { PLATFORM_ACCOUNT_ID } from '@api/core/constants';
import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import {
  RecordLedgerEntryCommand,
  LedgerEntryType,
  LedgerCategory,
  LedgerReferenceType,
} from '@api/modules/ledger';
import { PaymentProviderRegistry, PaymentStatus } from '@api/modules/payment';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus, CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ProcessPayoutCommand } from '../commands/process-payout.command';
import { SettlementStatus } from '../dto/settlement.enums';
import { SettlementBatchEntity } from '../entities/settlement-batch.entity';
import { PayoutInitiatedEventV1 } from '../events/payout-initiated.event';
import { PayoutCompletedEventV1 } from '../events/payout-completed.event';
import { PayoutFailedEventV1 } from '../events/payout-failed.event';
import { PayoutRiskService, RiskDecision } from '../services/payout-risk.service';

/**
 * ProcessPayoutCommandHandler
 * Executes payout via payment provider (B2C flow), updates batch status, records ledger entries
 */
@Injectable()
@CommandHandler(ProcessPayoutCommand)
export class ProcessPayoutCommandHandler implements ICommandHandler<ProcessPayoutCommand> {
  private readonly logger = new Logger(ProcessPayoutCommandHandler.name);

  constructor(
    @InjectRepository(SettlementBatchEntity)
    private readonly batchRepository: Repository<SettlementBatchEntity>,
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly eventBus: EventBus,
    private readonly commandBus: CommandBus,
    @Optional() private readonly eventBusService?: EventBusService,
    @Optional() private readonly payoutRiskService?: PayoutRiskService,
  ) {}

  async execute(command: ProcessPayoutCommand): Promise<string> {
    const batch = await this.batchRepository.findOne({
      where: { id: command.batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Settlement batch not found: ${command.batchId}`);
    }

    if (batch.status !== SettlementStatus.PENDING) {
      this.logger.warn(
        `Settlement batch ${batch.id} is not in PENDING status (current: ${batch.status})`,
      );
      throw new Error(`Settlement batch is not in PENDING status: ${batch.status}`);
    }

    if (this.payoutRiskService) {
      const riskResult = await this.payoutRiskService.checkPayoutEligibility(batch);

      if (riskResult.decision === RiskDecision.REJECT) {
        this.logger.warn(
          `Settlement batch ${batch.id} rejected by risk check: ${riskResult.holdReason}`,
        );

        await this.batchRepository.update(batch.id, {
          status: SettlementStatus.FAILED,
          failureReason: `Risk check rejected: ${riskResult.holdReason}`,
        });

        const batchDomain = batch.toDomain();

        const failedEvent = new PayoutFailedEventV1({
          eventId: uuidv4(),
          batchId: batch.id,
          riderAccountId: batchDomain.riderAccountId,
          amount: batchDomain.netPayout,
          currency: batchDomain.currency,
          payoutMethod: batchDomain.payoutMethod,
          providerId: command.providerId,
          errorCode: 'RISK_CHECK_REJECTED',
          errorMessage: riskResult.holdReason,
          correlationId: command.correlationId,
        });

        this.eventBus.publish(failedEvent);

        if (this.eventBusService) {
          this.eventBusService
            .publish(NatsSubjects.Settlement.PAYOUT_FAILED_V1, failedEvent)
            .catch((error) => {
              this.logger.error(
                `Failed to publish PayoutFailedEvent to NATS: ${error.message}`,
              );
            });
        }

        return batch.id;
      }

      if (riskResult.decision === RiskDecision.HOLD) {
        this.logger.warn(
          `Settlement batch ${batch.id} held for review: ${riskResult.holdReason}`,
        );

        await this.batchRepository.update(batch.id, {
          metadata: {
            ...batch.metadata,
            riskCheckHold: true,
            riskCheckReason: riskResult.holdReason,
            riskCheckAt: new Date().toISOString(),
          },
        });
      }

      this.logger.debug(
        `Risk check passed for batch ${batch.id}: decision=${riskResult.decision}, risk=${riskResult.riskLevel}`,
      );
    }

    const provider = this.providerRegistry.get(command.providerId);
    if (!provider) {
      throw new NotFoundException(`Payment provider not found: ${command.providerId}`);
    }

    await this.batchRepository.update(batch.id, {
      status: SettlementStatus.PROCESSING,
    });

    const batchDomain = batch.toDomain();

    const initiatedEvent = new PayoutInitiatedEventV1({
      eventId: uuidv4(),
      batchId: batch.id,
      riderAccountId: batchDomain.riderAccountId,
      amount: batchDomain.netPayout,
      currency: batchDomain.currency,
      payoutMethod: batchDomain.payoutMethod,
      providerId: command.providerId,
      correlationId: command.correlationId,
    });

    this.eventBus.publish(initiatedEvent);

    if (this.eventBusService) {
      this.eventBusService
        .publish(NatsSubjects.Settlement.PAYOUT_INITIATED_V1, initiatedEvent)
        .catch((error) => {
          this.logger.error(
            `Failed to publish PayoutInitiatedEvent to NATS: ${error.message}`,
          );
        });
    }

    const providerResult = await provider.initiatePayment({
      amount: batchDomain.netPayout,
      currency: batchDomain.currency,
      customerId: batchDomain.riderAccountId,
      metadata: {
        batchId: batch.id,
        flowType: 'B2C',
        payoutMethod: batchDomain.payoutMethod,
      },
      idempotencyKey: `payout-${batch.id}`,
    });

    const processedAt = new Date();

    if (providerResult.success && providerResult.status === PaymentStatus.SUCCEEDED) {
      await this.batchRepository.update(batch.id, {
        status: SettlementStatus.COMPLETED,
        payoutReference: providerResult.providerReference,
        processedAt,
      });

      await this.commandBus.execute(
        new RecordLedgerEntryCommand({
          referenceType: LedgerReferenceType.SETTLEMENT,
          referenceId: batch.id,
          entries: [
            {
              accountId: batchDomain.riderAccountId,
              entryType: LedgerEntryType.DEBIT,
              category: LedgerCategory.PAYOUT,
              amount: batchDomain.netPayout,
              currency: batchDomain.currency,
              description: `Payout for settlement batch ${batch.id}`,
            },
            {
              accountId: PLATFORM_ACCOUNT_ID,
              entryType: LedgerEntryType.CREDIT,
              category: LedgerCategory.PLATFORM_FEE,
              amount: batchDomain.platformCommission,
              currency: batchDomain.currency,
              description: `Commission for settlement batch ${batch.id}`,
            },
            {
              accountId: PLATFORM_ACCOUNT_ID,
              entryType: LedgerEntryType.DEBIT,
              category: LedgerCategory.PAYOUT,
              amount: batchDomain.netPayout,
              currency: batchDomain.currency,
              description: `Payout disbursement for batch ${batch.id}`,
            },
            {
              accountId: batchDomain.riderAccountId,
              entryType: LedgerEntryType.CREDIT,
              category: LedgerCategory.PAYOUT,
              amount: batchDomain.netPayout,
              currency: batchDomain.currency,
              description: `Payout received for batch ${batch.id}`,
              metadata: { providerReference: providerResult.providerReference },
            },
          ],
          correlationId: command.correlationId,
        }),
      );

      const completedEvent = new PayoutCompletedEventV1({
        eventId: uuidv4(),
        batchId: batch.id,
        riderAccountId: batchDomain.riderAccountId,
        amount: batchDomain.netPayout,
        currency: batchDomain.currency,
        payoutMethod: batchDomain.payoutMethod,
        providerId: command.providerId,
        providerReference: providerResult.providerReference ?? batch.id,
        processedAt,
        correlationId: command.correlationId,
      });

      this.eventBus.publish(completedEvent);

      if (this.eventBusService) {
        this.eventBusService
          .publish(NatsSubjects.Settlement.PAYOUT_COMPLETED_V1, completedEvent)
          .catch((error) => {
            this.logger.error(
              `Failed to publish PayoutCompletedEvent to NATS: ${error.message}`,
            );
          });
      }

      this.logger.log(
        `Payout completed for batch ${batch.id}: ${batchDomain.netPayout} ${batchDomain.currency}`,
      );
    } else {
      await this.batchRepository.update(batch.id, {
        status: SettlementStatus.FAILED,
        failureReason: providerResult.errorMessage ?? 'Unknown error',
      });

      const failedEvent = new PayoutFailedEventV1({
        eventId: uuidv4(),
        batchId: batch.id,
        riderAccountId: batchDomain.riderAccountId,
        amount: batchDomain.netPayout,
        currency: batchDomain.currency,
        payoutMethod: batchDomain.payoutMethod,
        providerId: command.providerId,
        errorCode: providerResult.errorCode,
        errorMessage: providerResult.errorMessage,
        correlationId: command.correlationId,
      });

      this.eventBus.publish(failedEvent);

      if (this.eventBusService) {
        this.eventBusService
          .publish(NatsSubjects.Settlement.PAYOUT_FAILED_V1, failedEvent)
          .catch((error) => {
            this.logger.error(
              `Failed to publish PayoutFailedEvent to NATS: ${error.message}`,
            );
          });
      }

      this.logger.warn(
        `Payout failed for batch ${batch.id}: ${providerResult.errorCode} - ${providerResult.errorMessage}`,
      );
    }

    return batch.id;
  }
}
