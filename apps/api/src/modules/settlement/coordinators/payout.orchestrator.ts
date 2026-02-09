import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { AccountEntity, AccountStatus } from '../../account';
import { RevenueDistributionEngine } from '../../ledger/services/revenue-distribution.engine';
import { PaymentProviderRegistry } from '../../payment/providers/payment-provider-registry.service';
import {
  PaymentStatus,
  ProviderCapability,
  PaymentInitiationResult,
} from '../../payment/providers/dto/payment-provider.types';
import { PaymentProvider } from '../../payment/providers/payment-provider.interface';
import { SettlementStatus, PayoutMethod } from '../dto/settlement.enums';
import { SettlementBatchEntity } from '../entities/settlement-batch.entity';
import { PayoutRiskService, RiskDecision } from '../services/payout-risk.service';
import { SettlementSchedulerService } from '../services/settlement-scheduler.service';

export interface PayoutResult {
  success: boolean;
  payoutId: string;
  batchId?: string;
  status: PayoutStatus;
  amount?: number;
  currency?: string;
  providerReference?: string;
  providerId?: string;
  error?: string;
  retriesRemaining?: number;
}

export interface BatchPayoutResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  results: PayoutResult[];
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  KYC_BLOCKED = 'KYC_BLOCKED',
  RISK_BLOCKED = 'RISK_BLOCKED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface PayoutConfig {
  minimumPayoutThreshold: number;
  defaultPayoutMethod: PayoutMethod;
  defaultProviderId: string;
  defaultCurrency: string;
}

interface RetryState {
  payoutId: string;
  batchId: string;
  attempts: number;
  lastAttemptAt: Date;
  nextRetryAt?: Date;
}

interface KycCheckResult {
  verified: boolean;
  reason?: string;
  accountStatus?: AccountStatus;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

const DEFAULT_PAYOUT_CONFIG: PayoutConfig = {
  minimumPayoutThreshold: 100,
  defaultPayoutMethod: PayoutMethod.MOBILE_MONEY,
  defaultProviderId: 'noop',
  defaultCurrency: 'KES',
};

@Injectable()
export class PayoutOrchestrator {
  private readonly logger = new Logger(PayoutOrchestrator.name);
  private readonly retryStates = new Map<string, RetryState>();
  private config: PayoutConfig = { ...DEFAULT_PAYOUT_CONFIG };

  constructor(
    @InjectRepository(SettlementBatchEntity)
    private readonly batchRepository: Repository<SettlementBatchEntity>,
    @Optional()
    @InjectRepository(AccountEntity)
    private readonly accountRepository?: Repository<AccountEntity>,
    @Optional() private readonly payoutRiskService?: PayoutRiskService,
    @Optional() private readonly revenueEngine?: RevenueDistributionEngine,
    @Optional() private readonly providerRegistry?: PaymentProviderRegistry,
    @Optional() private readonly schedulerService?: SettlementSchedulerService,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async initiatePayout(
    riderAccountId: string,
    options: {
      payoutMethod?: PayoutMethod;
      providerId?: string;
      correlationId?: string;
    } = {},
  ): Promise<PayoutResult> {
    const payoutId = uuidv4();
    const correlationId = options.correlationId ?? uuidv4();

    this.logger.log(`Initiating payout ${payoutId} for account ${riderAccountId}`);

    try {
      const kycResult = await this.checkKycVerification(riderAccountId);
      if (!kycResult.verified) {
        this.logger.warn(`KYC verification failed for ${riderAccountId}: ${kycResult.reason}`);
        return this.createFailedResult(
          payoutId,
          `KYC verification failed: ${kycResult.reason}`,
          PayoutStatus.KYC_BLOCKED,
        );
      }

      const payableBalance = await this.getPayableBalance(riderAccountId);
      if (payableBalance.pendingAmount < this.config.minimumPayoutThreshold) {
        this.logger.debug(
          `Insufficient balance for ${riderAccountId}: ${payableBalance.pendingAmount} < ${this.config.minimumPayoutThreshold}`,
        );
        return this.createFailedResult(
          payoutId,
          `Insufficient balance: ${payableBalance.pendingAmount} < ${this.config.minimumPayoutThreshold}`,
          PayoutStatus.INSUFFICIENT_BALANCE,
        );
      }

      const now = new Date();
      const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const periodEnd = now;

      const batch = await this.createSettlementBatch(
        riderAccountId,
        payableBalance.pendingAmount,
        payableBalance.currency,
        options.payoutMethod ?? this.config.defaultPayoutMethod,
        periodStart,
        periodEnd,
      );

      if (this.payoutRiskService) {
        const riskResult = await this.payoutRiskService.checkPayoutEligibility(batch);
        if (riskResult.decision === RiskDecision.REJECT) {
          await this.updateBatchStatus(batch.id, SettlementStatus.FAILED, riskResult.holdReason);
          await this.emitPayoutFailedEvent(batch, riskResult.holdReason ?? 'Risk check blocked', correlationId);
          return this.createFailedResult(
            payoutId,
            `Risk check blocked: ${riskResult.holdReason}`,
            PayoutStatus.RISK_BLOCKED,
            batch.id,
          );
        }

        if (riskResult.decision === RiskDecision.HOLD) {
          this.logger.warn(`Payout ${payoutId} flagged for review: ${riskResult.riskLevel}`);
        }
      }

      await this.emitPayoutInitiatedEvent(batch, correlationId);

      const provider = this.selectProvider(
        options.payoutMethod ?? this.config.defaultPayoutMethod,
        payableBalance.currency,
        options.providerId ?? this.config.defaultProviderId,
      );

      if (!provider) {
        await this.updateBatchStatus(batch.id, SettlementStatus.FAILED, 'No suitable provider available');
        await this.emitPayoutFailedEvent(batch, 'No suitable payout provider available', correlationId);
        return this.createFailedResult(
          payoutId,
          'No suitable payout provider available',
          PayoutStatus.FAILED,
          batch.id,
        );
      }

      const paymentResult = await this.executePayoutWithRetry(batch, provider, DEFAULT_RETRY_CONFIG);

      if (paymentResult.success && paymentResult.status === PaymentStatus.SUCCEEDED) {
        await this.updateBatchStatus(
          batch.id,
          SettlementStatus.COMPLETED,
          undefined,
          paymentResult.providerReference,
        );
        await this.emitPayoutCompletedEvent(batch, paymentResult, correlationId);

        this.clearRetryState(payoutId);

        return {
          success: true,
          payoutId,
          batchId: batch.id,
          status: PayoutStatus.COMPLETED,
          amount: payableBalance.pendingAmount,
          currency: payableBalance.currency,
          providerReference: paymentResult.providerReference,
          providerId: provider.providerId,
        };
      }

      await this.updateBatchStatus(batch.id, SettlementStatus.FAILED, paymentResult.errorMessage);
      await this.emitPayoutFailedEvent(batch, paymentResult.errorMessage ?? 'Payment failed', correlationId);

      this.updateRetryState(payoutId, batch.id, 1, DEFAULT_RETRY_CONFIG);

      return this.createFailedResult(
        payoutId,
        paymentResult.errorMessage ?? 'Payout execution failed',
        PayoutStatus.FAILED,
        batch.id,
        DEFAULT_RETRY_CONFIG.maxRetries - 1,
      );
    } catch (error) {
      this.logger.error(`Payout ${payoutId} failed with unexpected error:`, error);
      return this.createFailedResult(
        payoutId,
        error instanceof Error ? error.message : 'Unexpected error during payout',
        PayoutStatus.FAILED,
      );
    }
  }

  async batchPayouts(
    accountIds: string[],
    options: {
      payoutMethod?: PayoutMethod;
      providerId?: string;
      correlationId?: string;
    } = {},
  ): Promise<BatchPayoutResult> {
    const correlationId = options.correlationId ?? uuidv4();
    this.logger.log(`Processing batch payouts for ${accountIds.length} accounts`);

    const results: PayoutResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const accountId of accountIds) {
      try {
        const result = await this.initiatePayout(accountId, {
          ...options,
          correlationId,
        });

        results.push(result);

        if (result.success) {
          successCount++;
        } else if (
          result.status === PayoutStatus.INSUFFICIENT_BALANCE ||
          result.status === PayoutStatus.KYC_BLOCKED
        ) {
          skippedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to process payout for account ${accountId}:`, error);
        failedCount++;
        results.push(
          this.createFailedResult(
            uuidv4(),
            error instanceof Error ? error.message : 'Batch processing error',
            PayoutStatus.FAILED,
          ),
        );
      }
    }

    this.logger.log(
      `Batch payout completed: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped`,
    );

    return {
      success: failedCount === 0,
      totalProcessed: accountIds.length,
      successCount,
      failedCount,
      skippedCount,
      results,
    };
  }

  async retryFailedPayout(
    payoutId: string,
    retryConfig: Partial<RetryConfig> = {},
  ): Promise<PayoutResult> {
    this.logger.log(`Retrying failed payout: ${payoutId}`);

    const retryState = this.retryStates.get(payoutId);
    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

    if (!retryState) {
      return this.createFailedResult(
        payoutId,
        'No retry state found for payout',
        PayoutStatus.FAILED,
      );
    }

    if (retryState.attempts >= config.maxRetries) {
      return this.createFailedResult(
        payoutId,
        'Maximum retry attempts exceeded',
        PayoutStatus.FAILED,
        retryState.batchId,
        0,
      );
    }

    const batch = await this.batchRepository.findOne({
      where: { id: retryState.batchId },
    });

    if (!batch) {
      return this.createFailedResult(
        payoutId,
        'Settlement batch not found',
        PayoutStatus.FAILED,
      );
    }

    if (batch.status !== SettlementStatus.FAILED) {
      return this.createFailedResult(
        payoutId,
        `Cannot retry payout with batch status: ${batch.status}`,
        batch.status === SettlementStatus.COMPLETED ? PayoutStatus.COMPLETED : PayoutStatus.FAILED,
        batch.id,
      );
    }

    const provider = this.selectProvider(
      batch.payoutMethod,
      batch.currency,
      this.config.defaultProviderId,
    );

    if (!provider) {
      return this.createFailedResult(
        payoutId,
        'No suitable payout provider available for retry',
        PayoutStatus.FAILED,
        batch.id,
      );
    }

    await this.updateBatchStatus(batch.id, SettlementStatus.PROCESSING);

    const remainingRetries = config.maxRetries - retryState.attempts;
    const paymentResult = await this.executePayoutWithRetry(
      batch,
      provider,
      { ...config, maxRetries: remainingRetries },
    );

    const totalAttempts = retryState.attempts + 1;
    this.updateRetryState(payoutId, batch.id, totalAttempts, config);

    if (paymentResult.success && paymentResult.status === PaymentStatus.SUCCEEDED) {
      await this.updateBatchStatus(
        batch.id,
        SettlementStatus.COMPLETED,
        undefined,
        paymentResult.providerReference,
      );
      await this.emitPayoutCompletedEvent(batch, paymentResult);

      this.clearRetryState(payoutId);

      return {
        success: true,
        payoutId,
        batchId: batch.id,
        status: PayoutStatus.COMPLETED,
        amount: parseFloat(batch.netPayout),
        currency: batch.currency,
        providerReference: paymentResult.providerReference,
        providerId: provider.providerId,
      };
    }

    await this.updateBatchStatus(batch.id, SettlementStatus.FAILED, paymentResult.errorMessage);
    await this.emitPayoutFailedEvent(batch, paymentResult.errorMessage ?? 'Retry failed');

    return this.createFailedResult(
      payoutId,
      paymentResult.errorMessage ?? 'Retry payout execution failed',
      PayoutStatus.FAILED,
      batch.id,
      config.maxRetries - totalAttempts,
    );
  }

  async getPayoutStatus(payoutId: string): Promise<PayoutStatus> {
    const retryState = this.retryStates.get(payoutId);

    if (!retryState) {
      return PayoutStatus.PENDING;
    }

    const batch = await this.batchRepository.findOne({
      where: { id: retryState.batchId },
    });

    if (!batch) {
      return PayoutStatus.PENDING;
    }

    return this.mapBatchStatusToPayoutStatus(batch.status);
  }

  async cancelPayout(payoutId: string, reason: string): Promise<void> {
    this.logger.log(`Cancelling payout ${payoutId}: ${reason}`);

    const retryState = this.retryStates.get(payoutId);

    if (!retryState) {
      throw new NotFoundException(`Payout ${payoutId} not found or already completed`);
    }

    const batch = await this.batchRepository.findOne({
      where: { id: retryState.batchId },
    });

    if (!batch) {
      throw new NotFoundException(`Settlement batch not found for payout ${payoutId}`);
    }

    if (batch.status === SettlementStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed payout');
    }

    await this.updateBatchStatus(batch.id, SettlementStatus.FAILED, reason);
    await this.emitPayoutFailedEvent(batch, `Cancelled: ${reason}`);

    this.clearRetryState(payoutId);

    this.logger.log(`Payout ${payoutId} cancelled successfully`);
  }

  getRetryState(payoutId: string): RetryState | undefined {
    return this.retryStates.get(payoutId);
  }

  updateConfig(config: Partial<PayoutConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): PayoutConfig {
    return { ...this.config };
  }

  private async checkKycVerification(accountId: string): Promise<KycCheckResult> {
    if (!this.accountRepository) {
      return { verified: true };
    }

    const account = await this.accountRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      return {
        verified: false,
        reason: 'Account not found',
      };
    }

    if (account.status !== AccountStatus.ACTIVE) {
      return {
        verified: false,
        reason: `Account status is ${account.status}`,
        accountStatus: account.status,
      };
    }

    return {
      verified: true,
      accountStatus: account.status,
    };
  }

  private async getPayableBalance(accountId: string): Promise<{
    pendingAmount: number;
    currency: string;
  }> {
    if (!this.revenueEngine) {
      return {
        pendingAmount: 0,
        currency: this.config.defaultCurrency,
      };
    }

    const balance = await this.revenueEngine.getPayableBalance(accountId);

    return {
      pendingAmount: balance.pendingAmount,
      currency: balance.currency,
    };
  }

  private async createSettlementBatch(
    riderAccountId: string,
    netPayout: number,
    currency: string,
    payoutMethod: PayoutMethod,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<SettlementBatchEntity> {
    const schedulerConfig = this.schedulerService?.getConfig();
    const commissionRate = schedulerConfig?.defaultCommissionRate ?? 0.15;

    const totalEarnings = netPayout / (1 - commissionRate);
    const platformCommission = totalEarnings - netPayout;

    const batch = SettlementBatchEntity.fromDomain({
      batchId: uuidv4(),
      riderAccountId,
      status: SettlementStatus.PENDING,
      totalEarnings,
      platformCommission,
      netPayout,
      currency,
      payoutMethod,
      periodStart,
      periodEnd,
      itemCount: 1,
      createdAt: new Date(),
    });

    return this.batchRepository.save(batch);
  }

  private selectProvider(
    payoutMethod: PayoutMethod,
    currency: string,
    preferredProviderId?: string,
  ): PaymentProvider | undefined {
    if (!this.providerRegistry) {
      return undefined;
    }

    if (preferredProviderId) {
      const preferred = this.providerRegistry.get(preferredProviderId);
      if (preferred && preferred.supportedCurrencies.includes(currency.toUpperCase())) {
        return preferred;
      }
    }

    const capability = this.mapPayoutMethodToCapability(payoutMethod);
    const capableProviders = this.providerRegistry.getByCapability(capability) ?? [];

    const suitableProvider = capableProviders.find((p) =>
      p.supportedCurrencies.includes(currency.toUpperCase()),
    );

    if (suitableProvider) {
      return suitableProvider;
    }

    const defaultProvider = this.providerRegistry.getDefault();
    if (defaultProvider && defaultProvider.supportedCurrencies.includes(currency.toUpperCase())) {
      return defaultProvider;
    }

    return undefined;
  }

  private mapPayoutMethodToCapability(method: PayoutMethod): ProviderCapability {
    const mapping: { [key in PayoutMethod]?: ProviderCapability } = {
      [PayoutMethod.MOBILE_MONEY]: 'MOBILE_MONEY',
      [PayoutMethod.BANK_TRANSFER]: 'BANK_TRANSFER',
    };
    return mapping[method] ?? 'MOBILE_MONEY';
  }

  private async executePayoutWithRetry(
    batch: SettlementBatchEntity,
    provider: PaymentProvider,
    config: RetryConfig,
  ): Promise<PaymentInitiationResult> {
    let lastError: Error | undefined;
    let lastResult: PaymentInitiationResult | undefined;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await provider.initiatePayment({
          amount: parseFloat(batch.netPayout),
          currency: batch.currency,
          customerId: batch.riderAccountId,
          metadata: {
            batchId: batch.id,
            payoutMethod: batch.payoutMethod,
            periodStart: batch.periodStart.toISOString(),
            periodEnd: batch.periodEnd.toISOString(),
          },
          idempotencyKey: `payout-${batch.id}-${attempt}`,
        });

        if (result.success) {
          return result;
        }

        lastResult = result;
        this.logger.warn(
          `Payout attempt ${attempt}/${config.maxRetries} failed: ${result.errorMessage}`,
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Payout attempt ${attempt}/${config.maxRetries} threw error: ${lastError.message}`,
        );
      }

      if (attempt < config.maxRetries) {
        const delay = this.calculateBackoffDelay(attempt, config);
        await this.sleep(delay);
      }
    }

    return (
      lastResult ?? {
        success: false,
        transactionId: '',
        status: PaymentStatus.FAILED,
        errorMessage: lastError?.message ?? 'All retry attempts failed',
      }
    );
  }

  private calculateBackoffDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * config.baseDelayMs * 0.1;
    return Math.min(exponentialDelay + jitter, config.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async updateBatchStatus(
    batchId: string,
    status: SettlementStatus,
    failureReason?: string,
    payoutReference?: string,
  ): Promise<void> {
    const updates: {
      status: SettlementStatus;
      updatedAt: Date;
      failureReason?: string | null;
      payoutReference?: string | null;
      processedAt?: Date | null;
    } = {
      status,
      updatedAt: new Date(),
    };

    if (failureReason !== undefined) {
      updates.failureReason = failureReason;
    }

    if (payoutReference !== undefined) {
      updates.payoutReference = payoutReference;
    }

    if (status === SettlementStatus.COMPLETED) {
      updates.processedAt = new Date();
    }

    await this.batchRepository.update(batchId, updates as any);
  }

  private updateRetryState(
    payoutId: string,
    batchId: string,
    attempts: number,
    config: RetryConfig,
  ): void {
    const state: RetryState = {
      payoutId,
      batchId,
      attempts,
      lastAttemptAt: new Date(),
      nextRetryAt:
        attempts < config.maxRetries
          ? new Date(Date.now() + this.calculateBackoffDelay(attempts + 1, config))
          : undefined,
    };
    this.retryStates.set(payoutId, state);
  }

  private clearRetryState(payoutId: string): void {
    this.retryStates.delete(payoutId);
  }

  private mapBatchStatusToPayoutStatus(status: SettlementStatus): PayoutStatus {
    switch (status) {
      case SettlementStatus.COMPLETED:
        return PayoutStatus.COMPLETED;
      case SettlementStatus.FAILED:
        return PayoutStatus.FAILED;
      case SettlementStatus.PROCESSING:
        return PayoutStatus.PROCESSING;
      default:
        return PayoutStatus.PENDING;
    }
  }

  private createFailedResult(
    payoutId: string,
    error: string,
    status: PayoutStatus,
    batchId?: string,
    retriesRemaining?: number,
  ): PayoutResult {
    return {
      success: false,
      payoutId,
      batchId,
      status,
      error,
      retriesRemaining,
    };
  }

  private async emitPayoutInitiatedEvent(
    batch: SettlementBatchEntity,
    correlationId?: string,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Settlement.Payout.InitiatedV1',
      aggregateId: batch.id,
      aggregateType: 'SettlementBatch',
      payload: {
        batchId: batch.id,
        riderAccountId: batch.riderAccountId,
        amount: parseFloat(batch.netPayout),
        currency: batch.currency,
        payoutMethod: batch.payoutMethod,
        periodStart: batch.periodStart.toISOString(),
        periodEnd: batch.periodEnd.toISOString(),
        initiatedAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
      correlationId,
    };

    await this.eventBusService
      .publish(NatsSubjects.Settlement.PAYOUT_INITIATED_V1, event)
      .catch((error) => {
        this.logger.error(`Failed to publish PayoutInitiatedEvent: ${error.message}`);
      });
  }

  private async emitPayoutCompletedEvent(
    batch: SettlementBatchEntity,
    paymentResult: PaymentInitiationResult,
    correlationId?: string,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Settlement.Payout.CompletedV1',
      aggregateId: batch.id,
      aggregateType: 'SettlementBatch',
      payload: {
        batchId: batch.id,
        riderAccountId: batch.riderAccountId,
        amount: parseFloat(batch.netPayout),
        currency: batch.currency,
        payoutMethod: batch.payoutMethod,
        providerReference: paymentResult.providerReference,
        transactionId: paymentResult.transactionId,
        completedAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
      correlationId,
    };

    await this.eventBusService
      .publish(NatsSubjects.Settlement.PAYOUT_COMPLETED_V1, event)
      .catch((error) => {
        this.logger.error(`Failed to publish PayoutCompletedEvent: ${error.message}`);
      });
  }

  private async emitPayoutFailedEvent(
    batch: SettlementBatchEntity,
    reason: string,
    correlationId?: string,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Settlement.Payout.FailedV1',
      aggregateId: batch.id,
      aggregateType: 'SettlementBatch',
      payload: {
        batchId: batch.id,
        riderAccountId: batch.riderAccountId,
        amount: parseFloat(batch.netPayout),
        currency: batch.currency,
        payoutMethod: batch.payoutMethod,
        reason,
        failedAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
      correlationId,
    };

    await this.eventBusService
      .publish(NatsSubjects.Settlement.PAYOUT_FAILED_V1, event)
      .catch((error) => {
        this.logger.error(`Failed to publish PayoutFailedEvent: ${error.message}`);
      });
  }
}
