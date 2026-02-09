import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { PolicyTrigger } from '@zanafleet/contracts';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { PolicyEvaluationEngineService } from '../../policy/services/policy-evaluation-engine.service';
import { RecordLedgerEntryCommand } from '../commands/record-ledger-entry.command';
import {
  LedgerEntryType,
  LedgerCategory,
  LedgerReferenceType,
  DeliveryType,
  AccountType,
} from '../dto/ledger.enums';
import {
  RevenueDistributionInput,
  SplitContext,
  RevenueSplits,
  DistributionResult,
  EarnedBalance,
  PayableBalance,
  LedgerEntryReference,
  DefaultCommissionRates,
  CommissionRateSet,
} from '../dto/revenue-distribution.types';
import {
  RevenueDistributedEventV1,
  EarningsAccruedEventV1,
} from '../events/revenue-distribution.events';
import { LedgerService } from './ledger.service';

const DEFAULT_COMMISSION_RATES: DefaultCommissionRates = {
  [DeliveryType.STANDARD]: {
    platformRate: 0.15,
    saccoRate: 0.05,
    riderRate: 0.80,
  },
  [DeliveryType.EXPRESS]: {
    platformRate: 0.18,
    saccoRate: 0.05,
    riderRate: 0.77,
  },
  [DeliveryType.SCHEDULED]: {
    platformRate: 0.12,
    saccoRate: 0.05,
    riderRate: 0.83,
  },
  [DeliveryType.BULK]: {
    platformRate: 0.10,
    saccoRate: 0.05,
    riderRate: 0.85,
  },
};

const PLATFORM_ESCROW_ACCOUNT = 'PLATFORM_ESCROW';

@Injectable()
export class RevenueDistributionEngine {
  private readonly logger = new Logger(RevenueDistributionEngine.name);

  constructor(
    private readonly ledgerService: LedgerService,
    private readonly commandBus: CommandBus,
    @Optional() private readonly eventBusService?: EventBusService,
    @Optional() private readonly policyEngine?: PolicyEvaluationEngineService,
  ) {}

  async distributeDeliveryRevenue(
    input: RevenueDistributionInput,
  ): Promise<DistributionResult> {
    const distributionId = uuidv4();
    const now = new Date();

    this.logger.log(
      `Starting revenue distribution ${distributionId} for delivery ${input.deliveryId}`,
    );

    try {
      const splitContext = this.buildSplitContext(input);
      let splits = this.calculateSplits(input.totalAmount, splitContext);

      if (this.policyEngine) {
        splits = await this.applyPolicyOverrides(splits, input);
      }

      this.validateSplits(splits, input.totalAmount);

      const ledgerEntries = await this.executeLedgerTransfers(
        distributionId,
        input,
        splits,
      );

      await this.emitDistributionEvents(
        distributionId,
        input,
        splits,
        ledgerEntries,
        now,
      );

      this.logger.log(
        `Revenue distribution ${distributionId} completed successfully`,
      );

      return {
        success: true,
        distributionId,
        deliveryId: input.deliveryId,
        splits,
        ledgerEntries,
        distributedAt: now,
      };
    } catch (error) {
      this.logger.error(
        `Revenue distribution ${distributionId} failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      return {
        success: false,
        distributionId,
        deliveryId: input.deliveryId,
        splits: this.createEmptySplits(),
        ledgerEntries: [],
        error: error instanceof Error ? error.message : 'Distribution failed',
        distributedAt: now,
      };
    }
  }

  calculateSplits(totalAmount: number, context: SplitContext): RevenueSplits {
    const baseRates = this.getBaseRates(context.deliveryType);
    const appliedRates = this.applyCustomRates(baseRates, context);

    let platformAmount = this.roundToTwoDecimals(totalAmount * appliedRates.platformRate);
    let saccoAmount = context.saccoId
      ? this.roundToTwoDecimals(totalAmount * appliedRates.saccoRate)
      : 0;
    let riderAmount = this.roundToTwoDecimals(totalAmount * appliedRates.riderRate);
    let campaignSubsidyAmount = context.campaignSubsidyAmount ?? 0;

    if (campaignSubsidyAmount > 0) {
      riderAmount = this.roundToTwoDecimals(riderAmount + campaignSubsidyAmount);
    }

    const subtotal = platformAmount + saccoAmount + riderAmount - campaignSubsidyAmount;
    const totalDistributed = totalAmount + campaignSubsidyAmount;
    const rounding = this.roundToTwoDecimals(totalDistributed - subtotal - campaignSubsidyAmount);
    
    if (Math.abs(rounding) > 0.01) {
      riderAmount = this.roundToTwoDecimals(riderAmount + rounding);
    }

    return {
      riderAmount,
      saccoAmount,
      platformAmount,
      campaignSubsidyAmount,
      totalDistributed: this.roundToTwoDecimals(
        platformAmount + saccoAmount + riderAmount,
      ),
      appliedRates: {
        ...appliedRates,
        campaignSubsidyRate: campaignSubsidyAmount / totalAmount,
      },
    };
  }

  async getEarnedBalance(accountId: string): Promise<EarnedBalance> {
    const balance = await this.ledgerService.getBalance(accountId);
    const entries = await this.ledgerService.getEntriesByAccount(accountId);

    const totalEarned = entries
      .filter(
        (e) =>
          e.entryType === LedgerEntryType.CREDIT &&
          [
            LedgerCategory.RIDER_EARNING,
            LedgerCategory.SACCO_COMMISSION,
            LedgerCategory.PLATFORM_FEE,
          ].includes(e.category as LedgerCategory),
      )
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      accountId,
      accountType: this.inferAccountType(entries),
      totalEarned: this.roundToTwoDecimals(totalEarned),
      currency: balance?.currency ?? 'KES',
      lastUpdated: new Date(),
    };
  }

  async getPayableBalance(accountId: string): Promise<PayableBalance> {
    const balance = await this.ledgerService.getBalance(accountId);
    const entries = await this.ledgerService.getEntriesByAccount(accountId);

    const totalEarned = entries
      .filter(
        (e) =>
          e.entryType === LedgerEntryType.CREDIT &&
          [
            LedgerCategory.RIDER_EARNING,
            LedgerCategory.SACCO_COMMISSION,
            LedgerCategory.PLATFORM_FEE,
          ].includes(e.category as LedgerCategory),
      )
      .reduce((sum, e) => sum + e.amount, 0);

    const totalPaid = entries
      .filter(
        (e) =>
          e.entryType === LedgerEntryType.DEBIT &&
          e.category === LedgerCategory.PAYOUT,
      )
      .reduce((sum, e) => sum + e.amount, 0);

    const pendingAmount = this.roundToTwoDecimals(totalEarned - totalPaid);

    return {
      accountId,
      accountType: this.inferAccountType(entries),
      totalPayable: this.roundToTwoDecimals(totalEarned),
      totalPaid: this.roundToTwoDecimals(totalPaid),
      pendingAmount: Math.max(0, pendingAmount),
      currency: balance?.currency ?? 'KES',
      lastUpdated: new Date(),
    };
  }

  private buildSplitContext(input: RevenueDistributionInput): SplitContext {
    return {
      deliveryType: input.deliveryType,
      saccoId: input.saccoAccountId,
      campaignId: input.campaignAccountId,
      campaignSubsidyAmount: input.campaignSubsidyAmount,
      customRates: input.customRates,
      metadata: input.metadata,
    };
  }

  private getBaseRates(deliveryType: DeliveryType): CommissionRateSet {
    return DEFAULT_COMMISSION_RATES[deliveryType] ?? DEFAULT_COMMISSION_RATES[DeliveryType.STANDARD];
  }

  private applyCustomRates(
    baseRates: CommissionRateSet,
    context: SplitContext,
  ): CommissionRateSet {
    if (!context.customRates) {
      return baseRates;
    }

    const customRates = context.customRates;
    let platformRate = customRates.platformRate ?? baseRates.platformRate;
    let saccoRate = customRates.saccoRate ?? baseRates.saccoRate;
    let riderRate = customRates.riderRate ?? baseRates.riderRate;

    const total = platformRate + saccoRate + riderRate;
    if (Math.abs(total - 1.0) > 0.001) {
      const scale = 1.0 / total;
      platformRate *= scale;
      saccoRate *= scale;
      riderRate *= scale;
    }

    return { platformRate, saccoRate, riderRate };
  }

  private async applyPolicyOverrides(
    splits: RevenueSplits,
    input: RevenueDistributionInput,
  ): Promise<RevenueSplits> {
    if (!this.policyEngine) {
      return splits;
    }

    try {
      const policyContext = {
        trigger: PolicyTrigger.REVENUE_DISTRIBUTION,
        resourceType: 'delivery',
        resourceId: input.deliveryId,
        subjectType: 'system',
        subjectId: 'revenue-distribution-engine',
        workspaceId: (input.metadata?.workspaceId as string) ?? 'system',
        timestamp: new Date(),
        attributes: {
          deliveryType: input.deliveryType,
          totalAmount: input.totalAmount,
          currency: input.currency,
          currentSplits: splits,
          ...input.metadata,
        },
      };

      const result = await this.policyEngine.evaluate(
        policyContext as Parameters<typeof this.policyEngine.evaluate>[0],
      );

      const finalDecision = (result as unknown as { finalDecision?: { effect?: string } }).finalDecision;
      const policyOutputs = (result as unknown as { policyOutputs?: Record<string, unknown> }).policyOutputs;

      if (finalDecision?.effect === 'ALLOW' && policyOutputs) {
        if (typeof policyOutputs.platformRate === 'number') {
          splits.appliedRates.platformRate = policyOutputs.platformRate;
        }
        if (typeof policyOutputs.saccoRate === 'number') {
          splits.appliedRates.saccoRate = policyOutputs.saccoRate;
        }
        if (typeof policyOutputs.riderRate === 'number') {
          splits.appliedRates.riderRate = policyOutputs.riderRate;
        }

        splits = this.calculateSplits(input.totalAmount, {
          deliveryType: input.deliveryType,
          saccoId: input.saccoAccountId,
          campaignSubsidyAmount: input.campaignSubsidyAmount,
          customRates: {
            platformRate: splits.appliedRates.platformRate,
            saccoRate: splits.appliedRates.saccoRate,
            riderRate: splits.appliedRates.riderRate,
          },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Policy evaluation failed, using default splits: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return splits;
  }

  private validateSplits(splits: RevenueSplits, totalAmount: number): void {
    const distributed = splits.platformAmount + splits.saccoAmount + splits.riderAmount;
    const expected = totalAmount + splits.campaignSubsidyAmount;

    if (Math.abs(distributed - expected) > 0.02) {
      throw new Error(
        `Split validation failed: distributed ${distributed} != expected ${expected}`,
      );
    }

    if (splits.riderAmount < 0 || splits.saccoAmount < 0 || splits.platformAmount < 0) {
      throw new Error('Split validation failed: negative amounts detected');
    }
  }

  private async executeLedgerTransfers(
    distributionId: string,
    input: RevenueDistributionInput,
    splits: RevenueSplits,
  ): Promise<LedgerEntryReference[]> {
    const entries: LedgerEntryReference[] = [];
    const ledgerEntries: Array<{
      accountId: string;
      entryType: LedgerEntryType;
      category: LedgerCategory;
      amount: number;
      currency: string;
      description: string;
    }> = [];

    ledgerEntries.push({
      accountId: PLATFORM_ESCROW_ACCOUNT,
      entryType: LedgerEntryType.DEBIT,
      category: LedgerCategory.DELIVERY_FEE,
      amount: input.totalAmount,
      currency: input.currency,
      description: `Revenue distribution ${distributionId} for delivery ${input.deliveryId}`,
    });

    if (splits.platformAmount > 0) {
      ledgerEntries.push({
        accountId: input.platformAccountId,
        entryType: LedgerEntryType.CREDIT,
        category: LedgerCategory.PLATFORM_FEE,
        amount: splits.platformAmount,
        currency: input.currency,
        description: `Platform fee for delivery ${input.deliveryId}`,
      });
      entries.push({
        entryId: uuidv4(),
        accountId: input.platformAccountId,
        accountType: AccountType.PLATFORM,
        amount: splits.platformAmount,
        entryType: 'CREDIT',
      });
    }

    if (splits.saccoAmount > 0 && input.saccoAccountId) {
      ledgerEntries.push({
        accountId: input.saccoAccountId,
        entryType: LedgerEntryType.CREDIT,
        category: LedgerCategory.SACCO_COMMISSION,
        amount: splits.saccoAmount,
        currency: input.currency,
        description: `Sacco commission for delivery ${input.deliveryId}`,
      });
      entries.push({
        entryId: uuidv4(),
        accountId: input.saccoAccountId,
        accountType: AccountType.SACCO,
        amount: splits.saccoAmount,
        entryType: 'CREDIT',
      });
    }

    if (splits.riderAmount > 0) {
      ledgerEntries.push({
        accountId: input.riderAccountId,
        entryType: LedgerEntryType.CREDIT,
        category: LedgerCategory.RIDER_EARNING,
        amount: splits.riderAmount,
        currency: input.currency,
        description: `Rider earning for delivery ${input.deliveryId}`,
      });
      entries.push({
        entryId: uuidv4(),
        accountId: input.riderAccountId,
        accountType: AccountType.RIDER,
        amount: splits.riderAmount,
        entryType: 'CREDIT',
      });
    }

    if (splits.campaignSubsidyAmount > 0 && input.campaignAccountId) {
      ledgerEntries.push({
        accountId: input.campaignAccountId,
        entryType: LedgerEntryType.DEBIT,
        category: LedgerCategory.CAMPAIGN_SUBSIDY,
        amount: splits.campaignSubsidyAmount,
        currency: input.currency,
        description: `Campaign subsidy for delivery ${input.deliveryId}`,
      });
      entries.push({
        entryId: uuidv4(),
        accountId: input.campaignAccountId,
        accountType: AccountType.CAMPAIGN,
        amount: splits.campaignSubsidyAmount,
        entryType: 'DEBIT',
      });
    }

    await this.commandBus.execute(
      new RecordLedgerEntryCommand({
        referenceType: LedgerReferenceType.DELIVERY,
        referenceId: input.deliveryId,
        entries: ledgerEntries,
        correlationId: input.correlationId,
      }),
    );

    return entries;
  }

  private async emitDistributionEvents(
    distributionId: string,
    input: RevenueDistributionInput,
    splits: RevenueSplits,
    ledgerEntries: LedgerEntryReference[],
    distributedAt: Date,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const revenueDistributedEvent = new RevenueDistributedEventV1({
      eventId: uuidv4(),
      distributionId,
      deliveryId: input.deliveryId,
      totalAmount: input.totalAmount,
      currency: input.currency,
      splits,
      ledgerEntryIds: ledgerEntries.map((e) => e.entryId),
      distributedAt,
      correlationId: input.correlationId,
      metadata: input.metadata,
    });

    await this.eventBusService
      .publish(NatsSubjects.Ledger.REVENUE_DISTRIBUTED_V1, revenueDistributedEvent)
      .catch((error) => {
        this.logger.error(`Failed to publish RevenueDistributedEvent: ${error.message}`);
      });

    for (const entry of ledgerEntries.filter((e) => e.entryType === 'CREDIT')) {
      const balance = await this.ledgerService.getBalance(entry.accountId);
      
      const earningsEvent = new EarningsAccruedEventV1({
        eventId: uuidv4(),
        accountId: entry.accountId,
        accountType: entry.accountType,
        amount: entry.amount,
        currency: input.currency,
        referenceType: 'DELIVERY',
        referenceId: input.deliveryId,
        balanceAfter: balance?.balance ?? entry.amount,
        accruedAt: distributedAt,
        correlationId: input.correlationId,
      });

      await this.eventBusService
        .publish(NatsSubjects.Ledger.EARNINGS_ACCRUED_V1, earningsEvent)
        .catch((error) => {
          this.logger.error(`Failed to publish EarningsAccruedEvent: ${error.message}`);
        });
    }
  }

  private createEmptySplits(): RevenueSplits {
    return {
      riderAmount: 0,
      saccoAmount: 0,
      platformAmount: 0,
      campaignSubsidyAmount: 0,
      totalDistributed: 0,
      appliedRates: {
        platformRate: 0,
        saccoRate: 0,
        riderRate: 0,
        campaignSubsidyRate: 0,
      },
    };
  }

  private inferAccountType(
    entries: Array<{ category: string }>,
  ): AccountType {
    if (entries.some((e) => e.category === LedgerCategory.RIDER_EARNING)) {
      return AccountType.RIDER;
    }
    if (entries.some((e) => e.category === LedgerCategory.SACCO_COMMISSION)) {
      return AccountType.SACCO;
    }
    if (entries.some((e) => e.category === LedgerCategory.PLATFORM_FEE)) {
      return AccountType.PLATFORM;
    }
    return AccountType.RIDER;
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
