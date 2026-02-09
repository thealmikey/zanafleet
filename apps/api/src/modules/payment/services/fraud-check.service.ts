import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';

import { PolicyEvaluationEngineService } from '@api/modules/policy/services/policy-evaluation-engine.service';
import { PaymentIntentEntity } from '../entities/payment-intent.entity';
import { AccountEntity, AccountStatus } from '@api/modules/account';

/**
 * Fraud check decision
 */
export enum FraudDecision {
  ALLOW = 'ALLOW',
  BLOCK = 'BLOCK',
  REVIEW = 'REVIEW',
}

/**
 * Risk level classification
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Individual fraud check result
 */
export interface FraudCheckDetail {
  checkName: string;
  passed: boolean;
  riskLevel: RiskLevel;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Overall fraud check result
 */
export interface FraudCheckResult {
  decision: FraudDecision;
  riskLevel: RiskLevel;
  checks: FraudCheckDetail[];
  policyEvaluated: boolean;
  evaluatedAt: Date;
  blockReason?: string;
}

/**
 * Configuration for fraud checks
 */
export interface FraudCheckConfig {
  velocityWindowMinutes: number;
  maxPaymentsInWindow: number;
  highAmountThreshold: number;
  criticalAmountThreshold: number;
}

/**
 * FraudCheckService
 * Evaluates payment intents for potential fraud before processing
 * Gracefully degrades when PolicyEvaluationEngineService is unavailable
 */
@Injectable()
export class FraudCheckService {
  private readonly logger = new Logger(FraudCheckService.name);

  private readonly config: FraudCheckConfig = {
    velocityWindowMinutes: 60,
    maxPaymentsInWindow: 10,
    highAmountThreshold: 1000,
    criticalAmountThreshold: 5000,
  };

  constructor(
    @InjectRepository(PaymentIntentEntity)
    private readonly paymentIntentRepository: Repository<PaymentIntentEntity>,
    @Optional()
    @InjectRepository(AccountEntity)
    private readonly accountRepository?: Repository<AccountEntity>,
    @Optional() private readonly policyEngine?: PolicyEvaluationEngineService,
  ) {
    if (!this.policyEngine) {
      this.logger.warn('PolicyEvaluationEngineService not available - policy-based fraud checks disabled');
    }
  }

  async checkPaymentIntent(intent: PaymentIntentEntity): Promise<FraudCheckResult> {
    const intentDomain = intent.toDomain();
    const evaluatedAt = new Date();
    const checks: FraudCheckDetail[] = [];

    const velocityCheck = await this.checkVelocity(intentDomain.payerAccountId);
    checks.push(velocityCheck);

    const amountCheck = this.checkAmount(intentDomain.amount, intentDomain.currency);
    checks.push(amountCheck);

    if (this.accountRepository) {
      const accountCheck = await this.checkAccountStatus(intentDomain.payerAccountId);
      checks.push(accountCheck);
    }

    let policyCheck: FraudCheckDetail | null = null;
    if (this.policyEngine) {
      policyCheck = await this.evaluateFraudPolicy(intent);
      checks.push(policyCheck);
    }

    const { decision, riskLevel, blockReason } = this.aggregateResults(checks);

    this.logger.debug(
      `Fraud check for payment intent ${intent.id}: decision=${decision}, risk=${riskLevel}`,
    );

    return {
      decision,
      riskLevel,
      checks,
      policyEvaluated: !!policyCheck,
      evaluatedAt,
      blockReason,
    };
  }

  private async checkVelocity(payerAccountId: string): Promise<FraudCheckDetail> {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - this.config.velocityWindowMinutes);

    try {
      const recentPayments = await this.paymentIntentRepository.count({
        where: {
          payerAccountId,
          createdAt: MoreThan(windowStart),
        },
      });

      const passed = recentPayments < this.config.maxPaymentsInWindow;
      let riskLevel: RiskLevel;

      if (recentPayments < this.config.maxPaymentsInWindow * 0.5) {
        riskLevel = RiskLevel.LOW;
      } else if (recentPayments < this.config.maxPaymentsInWindow * 0.8) {
        riskLevel = RiskLevel.MEDIUM;
      } else if (passed) {
        riskLevel = RiskLevel.HIGH;
      } else {
        riskLevel = RiskLevel.CRITICAL;
      }

      return {
        checkName: 'velocity',
        passed,
        riskLevel,
        reason: passed
          ? undefined
          : `Too many payments (${recentPayments}) in ${this.config.velocityWindowMinutes} minutes`,
        metadata: {
          recentPayments,
          windowMinutes: this.config.velocityWindowMinutes,
          threshold: this.config.maxPaymentsInWindow,
        },
      };
    } catch (error) {
      this.logger.error(
        `Velocity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        checkName: 'velocity',
        passed: true,
        riskLevel: RiskLevel.MEDIUM,
        reason: 'Velocity check failed - allowing with caution',
      };
    }
  }

  private checkAmount(amount: number, currency: string): FraudCheckDetail {
    let riskLevel: RiskLevel;
    let passed = true;

    if (amount >= this.config.criticalAmountThreshold) {
      riskLevel = RiskLevel.CRITICAL;
      passed = false;
    } else if (amount >= this.config.highAmountThreshold) {
      riskLevel = RiskLevel.HIGH;
    } else if (amount >= this.config.highAmountThreshold * 0.5) {
      riskLevel = RiskLevel.MEDIUM;
    } else {
      riskLevel = RiskLevel.LOW;
    }

    return {
      checkName: 'amount_threshold',
      passed,
      riskLevel,
      reason: passed
        ? undefined
        : `Amount ${amount} ${currency} exceeds critical threshold`,
      metadata: {
        amount,
        currency,
        highThreshold: this.config.highAmountThreshold,
        criticalThreshold: this.config.criticalAmountThreshold,
      },
    };
  }

  private async checkAccountStatus(accountId: string): Promise<FraudCheckDetail> {
    if (!this.accountRepository) {
      return {
        checkName: 'account_status',
        passed: true,
        riskLevel: RiskLevel.MEDIUM,
        reason: 'Account repository not available',
      };
    }

    try {
      const account = await this.accountRepository.findOne({
        where: { id: accountId },
      });

      if (!account) {
        return {
          checkName: 'account_status',
          passed: false,
          riskLevel: RiskLevel.CRITICAL,
          reason: 'Payer account not found',
        };
      }

      const accountDomain = account.toDomain();
      const passed = accountDomain.status === AccountStatus.ACTIVE;

      return {
        checkName: 'account_status',
        passed,
        riskLevel: passed ? RiskLevel.LOW : RiskLevel.CRITICAL,
        reason: passed ? undefined : `Account status is ${accountDomain.status}`,
        metadata: {
          accountStatus: accountDomain.status,
        },
      };
    } catch (error) {
      this.logger.error(
        `Account status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        checkName: 'account_status',
        passed: true,
        riskLevel: RiskLevel.MEDIUM,
        reason: 'Account status check failed - allowing with caution',
      };
    }
  }

  private async evaluateFraudPolicy(intent: PaymentIntentEntity): Promise<FraudCheckDetail> {
    if (!this.policyEngine) {
      return {
        checkName: 'policy_evaluation',
        passed: true,
        riskLevel: RiskLevel.LOW,
        reason: 'Policy engine not available',
      };
    }

    try {
      const intentDomain = intent.toDomain();

      const result = await this.policyEngine.evaluate({
        trigger: 'PAYMENT_AUTHORIZATION' as never,
        workspaceId: intentDomain.payerAccountId,
        timestamp: new Date(),
        metadata: {
          paymentIntentId: intentDomain.paymentIntentId,
          amount: intentDomain.amount,
          currency: intentDomain.currency,
          flowType: intentDomain.flowType,
          paymentMethod: intentDomain.paymentMethod,
          fraudCheck: true,
        },
      });

      const evalResult = result as {
        decision?: { effect?: string };
        outputs?: Record<string, unknown>;
      };

      const decision = (typeof evalResult.decision === 'string'
        ? evalResult.decision
        : evalResult.decision?.effect
      )?.toUpperCase();
      const blocked = decision === 'DENY' || decision === 'BLOCK';

      let riskLevel: RiskLevel;
      if (blocked) {
        riskLevel = RiskLevel.CRITICAL;
      } else if (decision === 'REVIEW') {
        riskLevel = RiskLevel.HIGH;
      } else {
        riskLevel = RiskLevel.LOW;
      }

      return {
        checkName: 'policy_evaluation',
        passed: !blocked,
        riskLevel,
        reason: blocked ? 'Policy evaluation blocked the payment' : undefined,
        metadata: {
          policyDecision: decision,
          outputs: evalResult.outputs,
        },
      };
    } catch (error) {
      this.logger.error(
        `Policy fraud check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        checkName: 'policy_evaluation',
        passed: true,
        riskLevel: RiskLevel.MEDIUM,
        reason: 'Policy evaluation failed - allowing with caution',
      };
    }
  }

  private aggregateResults(checks: FraudCheckDetail[]): {
    decision: FraudDecision;
    riskLevel: RiskLevel;
    blockReason?: string;
  } {
    const failedChecks = checks.filter((c) => !c.passed);
    const criticalChecks = checks.filter((c) => c.riskLevel === RiskLevel.CRITICAL);
    const highRiskChecks = checks.filter((c) => c.riskLevel === RiskLevel.HIGH);

    if (failedChecks.length > 0 || criticalChecks.length > 0) {
      const blockReasons = failedChecks.map((c) => c.reason).filter(Boolean);
      return {
        decision: FraudDecision.BLOCK,
        riskLevel: RiskLevel.CRITICAL,
        blockReason: blockReasons.join('; ') || 'Multiple fraud indicators detected',
      };
    }

    if (highRiskChecks.length >= 2) {
      return {
        decision: FraudDecision.REVIEW,
        riskLevel: RiskLevel.HIGH,
      };
    }

    if (highRiskChecks.length === 1) {
      return {
        decision: FraudDecision.ALLOW,
        riskLevel: RiskLevel.MEDIUM,
      };
    }

    return {
      decision: FraudDecision.ALLOW,
      riskLevel: RiskLevel.LOW,
    };
  }

  updateConfig(config: Partial<FraudCheckConfig>): void {
    Object.assign(this.config, config);
    this.logger.log(`Fraud check config updated: ${JSON.stringify(this.config)}`);
  }

  getConfig(): FraudCheckConfig {
    return { ...this.config };
  }
}
