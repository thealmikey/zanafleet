import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { LedgerEntryType, LedgerCategory, LedgerReferenceType , RecordLedgerEntryCommand } from '@api/modules/ledger';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus, CommandBus } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ProcessPaymentCommand } from '../commands/process-payment.command';
import { PaymentIntentStatus } from '../dto/payment.enums';
import { PaymentIntentEntity } from '../entities/payment-intent.entity';
import { PaymentTransactionEntity } from '../entities/payment-transaction.entity';
import { PaymentCompletedEventV1 } from '../events/payment-completed.event';
import { PaymentFailedEventV1 } from '../events/payment-failed.event';
import { PaymentStatus } from '../providers/dto/payment-provider.types';
import { PaymentProviderRegistry } from '../providers/payment-provider-registry.service';
import { FraudCheckService, FraudDecision } from '../services/fraud-check.service';

/**
 * ProcessPaymentCommandHandler
 * Executes payment via provider, records transaction, and creates ledger entries on success
 */
@Injectable()
@CommandHandler(ProcessPaymentCommand)
export class ProcessPaymentCommandHandler implements ICommandHandler<ProcessPaymentCommand> {
  private readonly logger = new Logger(ProcessPaymentCommandHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly eventBus: EventBus,
    private readonly commandBus: CommandBus,
    @Optional() private readonly eventBusService?: EventBusService,
    @Optional() private readonly fraudCheckService?: FraudCheckService,
  ) {}

  async execute(command: ProcessPaymentCommand): Promise<string> {
    const intentRepo = this.dataSource.getRepository(PaymentIntentEntity);
    const transactionRepo = this.dataSource.getRepository(PaymentTransactionEntity);

    const intent = await intentRepo.findOne({
      where: { id: command.paymentIntentId },
    });

    if (!intent) {
      throw new NotFoundException(
        `Payment intent not found: ${command.paymentIntentId}`,
      );
    }

    if (intent.status !== PaymentIntentStatus.CREATED) {
      this.logger.warn(
        `Payment intent ${intent.id} is not in CREATED status (current: ${intent.status})`,
      );
      throw new Error(`Payment intent is not in CREATED status: ${intent.status}`);
    }

    if (this.fraudCheckService) {
      const fraudResult = await this.fraudCheckService.checkPaymentIntent(intent);

      if (fraudResult.decision === FraudDecision.BLOCK) {
        this.logger.warn(
          `Payment intent ${intent.id} blocked by fraud check: ${fraudResult.blockReason}`,
        );

        await intentRepo.update(intent.id, { status: PaymentIntentStatus.FAILED });

        const intentDomain = intent.toDomain();
        const transactionId = uuidv4();

        const failedEvent = new PaymentFailedEventV1({
          eventId: uuidv4(),
          paymentIntentId: intent.id,
          payerAccountId: intentDomain.payerAccountId,
          payeeAccountId: intentDomain.payeeAccountId,
          flowType: intentDomain.flowType,
          amount: intentDomain.amount,
          currency: intentDomain.currency,
          providerId: intent.providerId,
          errorCode: 'FRAUD_CHECK_BLOCKED',
          errorMessage: fraudResult.blockReason,
          transactionId,
          correlationId: command.correlationId,
        });

        this.eventBus.publish(failedEvent);

        if (this.eventBusService) {
          this.eventBusService
            .publish(NatsSubjects.Payment.FAILED_V1, failedEvent)
            .catch((error) => {
              this.logger.error(
                `Failed to publish PaymentFailedEvent to NATS: ${error.message}`,
              );
            });
        }

        return transactionId;
      }

      this.logger.debug(
        `Fraud check passed for payment ${intent.id}: decision=${fraudResult.decision}, risk=${fraudResult.riskLevel}`,
      );
    }

    const provider = this.providerRegistry.get(intent.providerId);
    if (!provider) {
      throw new NotFoundException(`Payment provider not found: ${intent.providerId}`);
    }

    await intentRepo.update(intent.id, { status: PaymentIntentStatus.PROCESSING });

    const transactionId = uuidv4();
    const now = new Date();
    const intentDomain = intent.toDomain();

    const providerResult = await provider.initiatePayment({
      amount: intentDomain.amount,
      currency: intentDomain.currency,
      customerId: intentDomain.payerAccountId,
      metadata: intentDomain.metadata ?? undefined,
      idempotencyKey: intentDomain.idempotencyKey,
    });

    const transactionEntity = PaymentTransactionEntity.fromDomain({
      transactionId,
      paymentIntentId: intent.id,
      providerId: intent.providerId,
      providerTransactionId: providerResult.providerReference,
      status: providerResult.status,
      amount: intentDomain.amount,
      errorCode: providerResult.errorCode,
      errorMessage: providerResult.errorMessage,
      rawResponse: providerResult.metadata ,
      createdAt: now,
    });

    await transactionRepo.save(transactionEntity);

    if (providerResult.success && providerResult.status === PaymentStatus.SUCCEEDED) {
      await intentRepo.update(intent.id, { status: PaymentIntentStatus.SUCCEEDED });

      await this.commandBus.execute(
        new RecordLedgerEntryCommand({
          referenceType: LedgerReferenceType.PAYMENT,
          referenceId: intent.id,
          entries: [
            {
              accountId: intentDomain.payerAccountId,
              entryType: LedgerEntryType.DEBIT,
              category: LedgerCategory.DELIVERY_FEE,
              amount: intentDomain.amount,
              currency: intentDomain.currency,
              description: `Payment ${intent.id}`,
            },
            {
              accountId: intentDomain.payeeAccountId,
              entryType: LedgerEntryType.CREDIT,
              category: LedgerCategory.RIDER_EARNING,
              amount: intentDomain.amount,
              currency: intentDomain.currency,
              description: `Payment ${intent.id}`,
            },
          ],
          correlationId: command.correlationId,
        }),
      );

      const completedEvent = new PaymentCompletedEventV1({
        eventId: uuidv4(),
        paymentIntentId: intent.id,
        payerAccountId: intentDomain.payerAccountId,
        payeeAccountId: intentDomain.payeeAccountId,
        flowType: intentDomain.flowType,
        amount: intentDomain.amount,
        currency: intentDomain.currency,
        providerId: intent.providerId,
        providerTransactionId: providerResult.providerReference ?? transactionId,
        transactionId,
        invoiceId: intentDomain.invoiceId,
        correlationId: command.correlationId,
      });

      this.eventBus.publish(completedEvent);

      if (this.eventBusService) {
        this.eventBusService
          .publish(NatsSubjects.Payment.COMPLETED_V1, completedEvent)
          .catch((error) => {
            this.logger.error(
              `Failed to publish PaymentCompletedEvent to NATS: ${error.message}`,
            );
          });
      }

      this.logger.log(
        `Payment completed: ${intent.id}, transaction: ${transactionId}`,
      );
    } else {
      await intentRepo.update(intent.id, { status: PaymentIntentStatus.FAILED });

      const failedEvent = new PaymentFailedEventV1({
        eventId: uuidv4(),
        paymentIntentId: intent.id,
        payerAccountId: intentDomain.payerAccountId,
        payeeAccountId: intentDomain.payeeAccountId,
        flowType: intentDomain.flowType,
        amount: intentDomain.amount,
        currency: intentDomain.currency,
        providerId: intent.providerId,
        errorCode: providerResult.errorCode,
        errorMessage: providerResult.errorMessage,
        transactionId,
        correlationId: command.correlationId,
      });

      this.eventBus.publish(failedEvent);

      if (this.eventBusService) {
        this.eventBusService
          .publish(NatsSubjects.Payment.FAILED_V1, failedEvent)
          .catch((error) => {
            this.logger.error(
              `Failed to publish PaymentFailedEvent to NATS: ${error.message}`,
            );
          });
      }

      this.logger.warn(
        `Payment failed: ${intent.id}, error: ${providerResult.errorCode} - ${providerResult.errorMessage}`,
      );
    }

    return transactionId;
  }
}
