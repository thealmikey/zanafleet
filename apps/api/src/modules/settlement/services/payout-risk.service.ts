import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';

import { AccountEntity, AccountStatus } from '@api/modules/account';
import { LedgerEntryEntity, LedgerCategory } from '@api/modules/ledger';
import { SettlementBatchEntity } from '../entities/settlement-batch.entity';

/**
 * Risk check decision
 */
export enum RiskDecision {
  APPROVE = 'APPROVE',
  HOLD = 'HOLD',
  REJECT = 'REJECT',
}

/**
 * Risk level classification
 */
export enum PayoutRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Individual risk check detail
 */
export interface RiskCheckDetail {
  checkName: string;
  passed: boolean;
  riskLevel: PayoutRiskLevel;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Overall risk check result
 */
export interface RiskCheckResult {
  decision: RiskDecision;
  riskLevel: PayoutRiskLevel;
  checks: RiskCheckDetail[];
  evaluatedAt: Date;
  holdReason?: string;
}

/**
 * Configuration for payout risk checks
 */
export interface PayoutRiskConfig {
  unusualEarningsMultiplier: number;
  lookbackDays: number;
  minimumHistoryDays: number;
  maxPayoutAmount: number;
}

/**
 * PayoutRiskService
 * Evaluates settlement batches for potential risks before payout execution
 */
@Injectable()
export class PayoutRiskService {
  private readonly logger = new Logger(PayoutRiskService.name);

  private readonly config: PayoutRiskConfig = {
    unusualEarningsMultiplier: 3.0,
    lookbackDays: 30,
    minimumHistoryDays: 7,
    maxPayoutAmount: 50000,
  };

  constructor(
    @Optional()
    @InjectRepository(AccountEntity)
    private readonly accountRepository?: Repository<AccountEntity>,
    @Optional()
    @InjectRepository(LedgerEntryEntity)
    private readonly ledgerRepository?: Repository<LedgerEntryEntity>,
  ) {
    if (!this.accountRepository) {
      this.logger.warn('AccountRepository not available - account status checks disabled');
    }
    if (!this.ledgerRepository) {
      this.logger.warn('LedgerRepository not available - earning pattern checks disabled');
    }
  }

  async checkPayoutEligibility(batch: SettlementBatchEntity): Promise<RiskCheckResult> {
    const batchDomain = batch.toDomain();
    const evaluatedAt = new Date();
    const checks: RiskCheckDetail[] = [];

    if (this.accountRepository) {
      const accountCheck = await this.checkRiderAccountStatus(batchDomain.riderAccountId);
      checks.push(accountCheck);
    }

    if (this.ledgerRepository) {
      const earningPatternCheck = await this.checkEarningPattern(
        batchDomain.riderAccountId,
        batchDomain.totalEarnings,
        batchDomain.periodStart,
        batchDomain.periodEnd,
      );
      checks.push(earningPatternCheck);
    }

    const amountCheck = this.checkPayoutAmount(batchDomain.netPayout, batchDomain.currency);
    checks.push(amountCheck);

    const itemCountCheck = this.checkItemCount(batchDomain.itemCount, batchDomain.totalEarnings);
    checks.push(itemCountCheck);

    const { decision, riskLevel, holdReason } = this.aggregateResults(checks);

    this.logger.debug(
      `Payout risk check for batch ${batch.id}: decision=${decision}, risk=${riskLevel}`,
    );

    return {
      decision,
      riskLevel,
      checks,
      evaluatedAt,
      holdReason,
    };
  }

  private async checkRiderAccountStatus(riderAccountId: string): Promise<RiskCheckDetail> {
    if (!this.accountRepository) {
      return {
        checkName: 'account_status',
        passed: true,
        riskLevel: PayoutRiskLevel.MEDIUM,
        reason: 'Account repository not available',
      };
    }

    try {
      const account = await this.accountRepository.findOne({
        where: { externalId: riderAccountId },
      });

      if (!account) {
        return {
          checkName: 'account_status',
          passed: false,
          riskLevel: PayoutRiskLevel.CRITICAL,
          reason: 'Rider account not found',
        };
      }

      const accountDomain = account.toDomain();
      const passed = accountDomain.status === AccountStatus.ACTIVE;

      let riskLevel: PayoutRiskLevel;
      if (passed) {
        riskLevel = PayoutRiskLevel.LOW;
      } else if (accountDomain.status === AccountStatus.SUSPENDED) {
        riskLevel = PayoutRiskLevel.CRITICAL;
      } else {
        riskLevel = PayoutRiskLevel.HIGH;
      }

      return {
        checkName: 'account_status',
        passed,
        riskLevel,
        reason: passed ? undefined : `Account status is ${accountDomain.status}`,
        metadata: {
          accountStatus: accountDomain.status,
          accountId: accountDomain.accountId,
        },
      };
    } catch (error) {
      this.logger.error(
        `Account status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        checkName: 'account_status',
        passed: true,
        riskLevel: PayoutRiskLevel.MEDIUM,
        reason: 'Account status check failed - allowing with caution',
      };
    }
  }

  private async checkEarningPattern(
    riderAccountId: string,
    currentEarnings: number,
    periodStart: Date,
    _periodEnd: Date,
  ): Promise<RiskCheckDetail> {
    if (!this.ledgerRepository) {
      return {
        checkName: 'earning_pattern',
        passed: true,
        riskLevel: PayoutRiskLevel.MEDIUM,
        reason: 'Ledger repository not available',
      };
    }

    try {
      const lookbackStart = new Date(periodStart);
      lookbackStart.setDate(lookbackStart.getDate() - this.config.lookbackDays);

      const historicalEarnings = await this.ledgerRepository.find({
        where: {
          accountId: riderAccountId,
          category: LedgerCategory.RIDER_EARNING,
          createdAt: MoreThan(lookbackStart),
        },
      });

      if (historicalEarnings.length < this.config.minimumHistoryDays) {
        return {
          checkName: 'earning_pattern',
          passed: true,
          riskLevel: PayoutRiskLevel.MEDIUM,
          reason: 'Insufficient earning history for pattern analysis',
          metadata: {
            historyEntries: historicalEarnings.length,
            requiredMinimum: this.config.minimumHistoryDays,
          },
        };
      }

      const totalHistorical = historicalEarnings.reduce(
        (sum, e) => sum + parseFloat(e.amount),
        0,
      );
      const averageEarnings = totalHistorical / this.config.lookbackDays;
      const periodDays = Math.ceil(
        (periodStart.getTime() - lookbackStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      const expectedEarnings = averageEarnings * Math.max(periodDays, 7);

      const earningsRatio = currentEarnings / Math.max(expectedEarnings, 1);
      const isUnusual = earningsRatio > this.config.unusualEarningsMultiplier;

      let riskLevel: PayoutRiskLevel;
      if (earningsRatio <= 1.5) {
        riskLevel = PayoutRiskLevel.LOW;
      } else if (earningsRatio <= 2.0) {
        riskLevel = PayoutRiskLevel.MEDIUM;
      } else if (earningsRatio <= this.config.unusualEarningsMultiplier) {
        riskLevel = PayoutRiskLevel.HIGH;
      } else {
        riskLevel = PayoutRiskLevel.CRITICAL;
      }

      return {
        checkName: 'earning_pattern',
        passed: !isUnusual,
        riskLevel,
        reason: isUnusual
          ? `Earnings ${currentEarnings.toFixed(2)} are ${earningsRatio.toFixed(1)}x higher than average`
          : undefined,
        metadata: {
          currentEarnings,
          averageEarnings: averageEarnings.toFixed(2),
          expectedEarnings: expectedEarnings.toFixed(2),
          earningsRatio: earningsRatio.toFixed(2),
          lookbackDays: this.config.lookbackDays,
        },
      };
    } catch (error) {
      this.logger.error(
        `Earning pattern check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        checkName: 'earning_pattern',
        passed: true,
        riskLevel: PayoutRiskLevel.MEDIUM,
        reason: 'Earning pattern check failed - allowing with caution',
      };
    }
  }

  private checkPayoutAmount(amount: number, currency: string): RiskCheckDetail {
    const passed = amount <= this.config.maxPayoutAmount;

    let riskLevel: PayoutRiskLevel;
    if (amount <= this.config.maxPayoutAmount * 0.5) {
      riskLevel = PayoutRiskLevel.LOW;
    } else if (amount <= this.config.maxPayoutAmount * 0.8) {
      riskLevel = PayoutRiskLevel.MEDIUM;
    } else if (passed) {
      riskLevel = PayoutRiskLevel.HIGH;
    } else {
      riskLevel = PayoutRiskLevel.CRITICAL;
    }

    return {
      checkName: 'payout_amount',
      passed,
      riskLevel,
      reason: passed
        ? undefined
        : `Payout amount ${amount} ${currency} exceeds maximum threshold`,
      metadata: {
        amount,
        currency,
        maxThreshold: this.config.maxPayoutAmount,
      },
    };
  }

  private checkItemCount(itemCount: number, totalEarnings: number): RiskCheckDetail {
    if (itemCount === 0) {
      return {
        checkName: 'item_count',
        passed: false,
        riskLevel: PayoutRiskLevel.CRITICAL,
        reason: 'Settlement batch has no items',
      };
    }

    const averagePerItem = totalEarnings / itemCount;
    const unusuallyHigh = averagePerItem > 500;
    const unusuallyLow = averagePerItem < 1;

    const passed = !unusuallyHigh && !unusuallyLow;

    let riskLevel: PayoutRiskLevel;
    if (passed && averagePerItem >= 5 && averagePerItem <= 200) {
      riskLevel = PayoutRiskLevel.LOW;
    } else if (passed) {
      riskLevel = PayoutRiskLevel.MEDIUM;
    } else {
      riskLevel = PayoutRiskLevel.HIGH;
    }

    return {
      checkName: 'item_count',
      passed,
      riskLevel,
      reason: passed
        ? undefined
        : unusuallyHigh
          ? `Average earning per item (${averagePerItem.toFixed(2)}) is unusually high`
          : `Average earning per item (${averagePerItem.toFixed(2)}) is unusually low`,
      metadata: {
        itemCount,
        totalEarnings,
        averagePerItem: averagePerItem.toFixed(2),
      },
    };
  }

  private aggregateResults(checks: RiskCheckDetail[]): {
    decision: RiskDecision;
    riskLevel: PayoutRiskLevel;
    holdReason?: string;
  } {
    const failedChecks = checks.filter((c) => !c.passed);
    const criticalChecks = checks.filter((c) => c.riskLevel === PayoutRiskLevel.CRITICAL);
    const highRiskChecks = checks.filter((c) => c.riskLevel === PayoutRiskLevel.HIGH);

    if (criticalChecks.length > 0) {
      const holdReasons = failedChecks.map((c) => c.reason).filter(Boolean);
      return {
        decision: RiskDecision.REJECT,
        riskLevel: PayoutRiskLevel.CRITICAL,
        holdReason: holdReasons.join('; ') || 'Critical risk indicators detected',
      };
    }

    if (failedChecks.length > 0 || highRiskChecks.length >= 2) {
      const holdReasons = failedChecks.map((c) => c.reason).filter(Boolean);
      return {
        decision: RiskDecision.HOLD,
        riskLevel: PayoutRiskLevel.HIGH,
        holdReason: holdReasons.join('; ') || 'Multiple risk indicators detected',
      };
    }

    if (highRiskChecks.length === 1) {
      return {
        decision: RiskDecision.APPROVE,
        riskLevel: PayoutRiskLevel.MEDIUM,
      };
    }

    return {
      decision: RiskDecision.APPROVE,
      riskLevel: PayoutRiskLevel.LOW,
    };
  }

  updateConfig(config: Partial<PayoutRiskConfig>): void {
    Object.assign(this.config, config);
    this.logger.log(`Payout risk config updated: ${JSON.stringify(this.config)}`);
  }

  getConfig(): PayoutRiskConfig {
    return { ...this.config };
  }
}
