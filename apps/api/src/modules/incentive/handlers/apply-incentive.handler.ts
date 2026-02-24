import { PLATFORM_ACCOUNT_ID } from '@api/core/constants';
import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import {
  RecordLedgerEntryCommand,
  LedgerEntryType,
  LedgerCategory,
  LedgerReferenceType,
} from '@api/modules/ledger';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus, CommandBus } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';

import { ApplyIncentiveCommand } from '../commands/apply-incentive.command';
import { FundingSource } from '../dto/incentive.enums';
import { BudgetExhaustedEventV1 } from '../events/budget-exhausted.event';
import { IncentiveAppliedEventV1 } from '../events/incentive-applied.event';
import { SponsorshipConsumedEventV1 } from '../events/sponsorship-consumed.event';
import { IncentiveEngineService, ApplyIncentiveResult } from '../services/incentive-engine.service';

/**
 * ApplyIncentiveCommandHandler
 * Handles applying an incentive to an invoice
 */
@Injectable()
@CommandHandler(ApplyIncentiveCommand)
export class ApplyIncentiveCommandHandler implements ICommandHandler<ApplyIncentiveCommand> {
  private readonly logger = new Logger(ApplyIncentiveCommandHandler.name);

  constructor(
    private readonly incentiveEngine: IncentiveEngineService,
    private readonly eventBus: EventBus,
    private readonly commandBus: CommandBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  async execute(command: ApplyIncentiveCommand): Promise<ApplyIncentiveResult> {
    const campaign = await this.incentiveEngine.getCampaign(command.campaignId);

    if (!campaign) {
      throw new NotFoundException(`Campaign not found: ${command.campaignId}`);
    }

    const campaignDomain = campaign.toDomain();

    const discountAmount = this.incentiveEngine.calculateDiscountAmount(
      campaign,
      command.baseAmount
    );

    if (discountAmount <= 0) {
      throw new Error('Calculated discount amount is zero or negative');
    }

    const chargeResult = this.incentiveEngine.createIncentiveCharge(
      campaign,
      uuidv4(),
      discountAmount,
      command.currency
    );

    const result = await this.incentiveEngine.applyToInvoice(
      command.campaignId,
      command.invoiceId,
      chargeResult.chargeId,
      command.beneficiaryAccountId,
      discountAmount,
      command.currency
    );

    const appliedEvent = new IncentiveAppliedEventV1({
      eventId: uuidv4(),
      applicationId: result.applicationId,
      campaignId: command.campaignId,
      invoiceId: command.invoiceId,
      chargeId: result.chargeId,
      beneficiaryAccountId: command.beneficiaryAccountId,
      discountAmount,
      currency: command.currency,
      incentiveType: campaignDomain.incentiveType,
      fundingSource: campaignDomain.fundingSource,
      correlationId: command.correlationId,
    });

    this.eventBus.publish(appliedEvent);

    if (this.eventBusService) {
      this.eventBusService
        .publish(NatsSubjects.Incentive.INCENTIVE_APPLIED_V1, appliedEvent)
        .catch((error) => {
          this.logger.error(`Failed to publish IncentiveAppliedEvent to NATS: ${error.message}`);
        });
    }

    if (
      campaignDomain.fundingSource !== FundingSource.PLATFORM &&
      campaignDomain.sponsorAccountId
    ) {
      await this.recordSponsorshipLedgerEntries(
        campaignDomain.sponsorAccountId,
        discountAmount,
        command.currency,
        command.campaignId,
        command.invoiceId,
        command.correlationId
      );

      const updatedCampaign = await this.incentiveEngine.getCampaign(command.campaignId);
      const updatedDomain = updatedCampaign!.toDomain();

      const sponsorshipEvent = new SponsorshipConsumedEventV1({
        eventId: uuidv4(),
        campaignId: command.campaignId,
        sponsorAccountId: campaignDomain.sponsorAccountId,
        fundingSource: campaignDomain.fundingSource,
        amountConsumed: discountAmount,
        currency: command.currency,
        budgetRemaining: updatedDomain.budgetTotal - updatedDomain.budgetUsed,
        applicationId: result.applicationId,
        invoiceId: command.invoiceId,
        correlationId: command.correlationId,
      });

      this.eventBus.publish(sponsorshipEvent);

      if (this.eventBusService) {
        this.eventBusService
          .publish(NatsSubjects.Incentive.SPONSORSHIP_CONSUMED_V1, sponsorshipEvent)
          .catch((error) => {
            this.logger.error(
              `Failed to publish SponsorshipConsumedEvent to NATS: ${error.message}`
            );
          });
      }
    }

    if (result.budgetExhausted) {
      const updatedCampaign = await this.incentiveEngine.getCampaign(command.campaignId);
      const updatedDomain = updatedCampaign!.toDomain();

      const exhaustedEvent = new BudgetExhaustedEventV1({
        eventId: uuidv4(),
        campaignId: command.campaignId,
        name: updatedDomain.name,
        fundingSource: updatedDomain.fundingSource,
        sponsorAccountId: updatedDomain.sponsorAccountId,
        budgetTotal: updatedDomain.budgetTotal,
        budgetUsed: updatedDomain.budgetUsed,
        currency: command.currency,
        correlationId: command.correlationId,
      });

      this.eventBus.publish(exhaustedEvent);

      if (this.eventBusService) {
        this.eventBusService
          .publish(NatsSubjects.Incentive.BUDGET_EXHAUSTED_V1, exhaustedEvent)
          .catch((error) => {
            this.logger.error(`Failed to publish BudgetExhaustedEvent to NATS: ${error.message}`);
          });
      }
    }

    this.logger.log(
      `Applied incentive from campaign ${command.campaignId} to invoice ${command.invoiceId}: -${discountAmount} ${command.currency}`
    );

    return result;
  }

  private async recordSponsorshipLedgerEntries(
    sponsorAccountId: string,
    amount: number,
    currency: string,
    campaignId: string,
    invoiceId: string,
    correlationId?: string
  ): Promise<void> {
    await this.commandBus.execute(
      new RecordLedgerEntryCommand({
        referenceType: LedgerReferenceType.INVOICE,
        referenceId: invoiceId,
        entries: [
          {
            accountId: sponsorAccountId,
            entryType: LedgerEntryType.DEBIT,
            category: LedgerCategory.SUBSIDY,
            amount,
            currency,
            description: `Sponsorship for campaign ${campaignId}`,
            metadata: { campaignId, invoiceId },
          },
          {
            accountId: PLATFORM_ACCOUNT_ID,
            entryType: LedgerEntryType.CREDIT,
            category: LedgerCategory.SUBSIDY,
            amount,
            currency,
            description: `Sponsorship received for campaign ${campaignId}`,
            metadata: { campaignId, invoiceId, sponsorAccountId },
          },
        ],
        correlationId,
      })
    );
  }
}
