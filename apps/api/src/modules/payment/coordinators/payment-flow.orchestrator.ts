import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { PaymentIntentStatus, PaymentFlowType, PaymentMethod } from '../dto/payment.enums';
import { PaymentIntentEntity } from '../entities/payment-intent.entity';
import { PaymentTransactionEntity } from '../entities/payment-transaction.entity';
import {
  PaymentIntentData,
  PaymentInitiationResult,
  ProviderCapability,
  PaymentStatus,
  WebhookProcessingResult,
} from '../providers/dto/payment-provider.types';
import { PaymentProviderRegistry } from '../providers/payment-provider-registry.service';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { FraudCheckService, FraudDecision } from '../services/fraud-check.service';

export interface PaymentInitiationInput {
  payerAccountId: string;
  payeeAccountId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  preferredProviderId?: string;
  flowType: PaymentFlowType;
  referenceId?: string;
  referenceType?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentFlowResult {
  success: boolean;
  intentId: string;
  transactionId?: string;
  status: PaymentIntentStatus;
  providerReference?: string;
  providerId?: string;
  error?: string;
  retriesRemaining?: number;
}

export interface CaptureResult {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  capturedAt?: Date;
  error?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

interface RetryState {
  intentId: string;
  attempts: number;
  lastAttemptAt: Date;
  nextRetryAt?: Date;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

@Injectable()
export class PaymentFlowOrchestrator {
  private readonly logger = new Logger(PaymentFlowOrchestrator.name);
  private readonly retryStates = new Map<string, RetryState>();

  constructor(
    @InjectRepository(PaymentIntentEntity)
    private readonly paymentIntentRepository: Repository<PaymentIntentEntity>,
    @InjectRepository(PaymentTransactionEntity)
    private readonly paymentTransactionRepository: Repository<PaymentTransactionEntity>,
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly fraudCheckService: FraudCheckService,
    private readonly eventBus: EventBusService,
  ) {}

  async initiatePayment(
    input: PaymentInitiationInput,
    retryConfig: Partial<RetryConfig> = {},
  ): Promise<PaymentFlowResult> {
    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    const intentId = uuidv4();

    this.logger.log(`Initiating payment flow for intent: ${intentId}`);

    try {
      const provider = await this.selectProvider(
        input.currency,
        input.paymentMethod,
        input.preferredProviderId,
      );

      if (!provider) {
        return this.createFailedResult(
          intentId,
          'No suitable payment provider available',
          PaymentIntentStatus.FAILED,
        );
      }

      const intent = await this.createPaymentIntent(intentId, input, provider.providerId);

      const fraudResult = await this.fraudCheckService.checkPaymentIntent(intent);

      if (fraudResult.decision === FraudDecision.BLOCK) {
        await this.updateIntentStatus(intentId, PaymentIntentStatus.FAILED);
        await this.emitPaymentFailedEvent(intent, `Fraud check blocked: ${fraudResult.blockReason}`);

        return this.createFailedResult(
          intentId,
          `Payment blocked by fraud check: ${fraudResult.blockReason}`,
          PaymentIntentStatus.FAILED,
        );
      }

      if (fraudResult.decision === FraudDecision.REVIEW) {
        await this.updateIntentStatus(intentId, PaymentIntentStatus.PENDING);
        this.logger.warn(`Payment ${intentId} flagged for review: ${fraudResult.riskLevel}`);
      }

      await this.emitPaymentIntentCreatedEvent(intent);

      const paymentData = this.buildPaymentIntentData(intent);
      const { result, error, attempts } = await this.executeWithRetry(
        () => provider.initiatePayment(paymentData),
        config,
      );

      if (error || !result?.success) {
        const errorMessage = error?.message 
          || (typeof result?.metadata?.error === 'string' ? result.metadata.error : undefined) 
          || 'Payment initiation failed';
        await this.updateIntentStatus(intentId, PaymentIntentStatus.FAILED);
        await this.emitPaymentFailedEvent(intent, errorMessage);

        this.updateRetryState(intentId, attempts, config);

        return this.createFailedResult(
          intentId,
          errorMessage,
          PaymentIntentStatus.FAILED,
          config.maxRetries - attempts,
        );
      }

      await this.recordTransaction(intent, result, provider.providerId);
      await this.updateIntentStatus(intentId, PaymentIntentStatus.SUCCEEDED);
      await this.emitPaymentSucceededEvent(intent, result);

      this.clearRetryState(intentId);

      return {
        success: true,
        intentId,
        transactionId: result.transactionId,
        status: PaymentIntentStatus.SUCCEEDED,
        providerReference: result.providerReference,
        providerId: provider.providerId,
      };
    } catch (error) {
      this.logger.error(`Payment flow failed for intent ${intentId}:`, error);

      return this.createFailedResult(
        intentId,
        error instanceof Error ? error.message : 'Unexpected error during payment',
        PaymentIntentStatus.FAILED,
      );
    }
  }

  async capturePayment(transactionId: string): Promise<CaptureResult> {
    this.logger.log(`Capturing payment for transaction: ${transactionId}`);

    try {
      const transaction = await this.paymentTransactionRepository.findOne({
        where: { id: transactionId },
      });

      if (!transaction) {
        return {
          success: false,
          transactionId,
          status: PaymentStatus.FAILED,
          error: 'Transaction not found',
        };
      }

      const provider = this.providerRegistry.get(transaction.providerId);

      if (!provider) {
        return {
          success: false,
          transactionId,
          status: PaymentStatus.FAILED,
          error: `Provider ${transaction.providerId} not found`,
        };
      }

      const result = await provider.capturePayment(transactionId);

      if (result.success) {
        await this.paymentTransactionRepository.update(transactionId, {
          status: result.status,
        });
      }

      return {
        success: result.success,
        transactionId: result.transactionId,
        status: result.status,
        capturedAt: result.success ? new Date() : undefined,
      };
    } catch (error) {
      this.logger.error(`Capture failed for transaction ${transactionId}:`, error);

      return {
        success: false,
        transactionId,
        status: PaymentStatus.FAILED,
        error: error instanceof Error ? error.message : 'Capture failed',
      };
    }
  }

  async handleProviderCallback(
    providerId: string,
    payload: unknown,
    signature?: string,
  ): Promise<void> {
    this.logger.log(`Handling callback from provider: ${providerId}`);

    const provider = this.providerRegistry.get(providerId);

    if (!provider) {
      this.logger.warn(`Unknown provider callback: ${providerId}`);
      return;
    }

    if (signature && !provider.verifyWebhook(payload, signature)) {
      this.logger.warn(`Invalid webhook signature from provider: ${providerId}`);
      return;
    }

    const result: WebhookProcessingResult = await provider.handleWebhook(payload);

    if (result.transactionId) {
      await this.syncTransactionStatus(result.transactionId, providerId, result);
    }

    this.logger.debug(`Webhook processed: ${result.eventType}`);
  }

  async retryFailedPayment(
    intentId: string,
    retryConfig: Partial<RetryConfig> = {},
  ): Promise<PaymentFlowResult> {
    this.logger.log(`Retrying failed payment: ${intentId}`);

    const intent = await this.paymentIntentRepository.findOne({
      where: { id: intentId },
    });

    if (!intent) {
      return this.createFailedResult(
        intentId,
        'Payment intent not found',
        PaymentIntentStatus.FAILED,
      );
    }

    if (intent.status !== PaymentIntentStatus.FAILED) {
      return this.createFailedResult(
        intentId,
        `Cannot retry payment with status: ${intent.status}`,
        intent.status,
      );
    }

    const retryState = this.retryStates.get(intentId);
    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

    if (retryState && retryState.attempts >= config.maxRetries) {
      return this.createFailedResult(
        intentId,
        'Maximum retry attempts exceeded',
        PaymentIntentStatus.FAILED,
        0,
      );
    }

    const provider = await this.selectProvider(
      intent.currency,
      intent.paymentMethod ,
      intent.providerId,
    );

    if (!provider) {
      return this.createFailedResult(
        intentId,
        'No suitable payment provider available for retry',
        PaymentIntentStatus.FAILED,
      );
    }

    await this.updateIntentStatus(intentId, PaymentIntentStatus.PROCESSING);

    const paymentData = this.buildPaymentIntentData(intent);
    const currentAttempts = retryState?.attempts ?? 0;
    const remainingRetries = config.maxRetries - currentAttempts;

    const { result, error, attempts } = await this.executeWithRetry(
      () => provider.initiatePayment(paymentData),
      { ...config, maxRetries: remainingRetries },
    );

    const totalAttempts = currentAttempts + attempts;
    this.updateRetryState(intentId, totalAttempts, config);

    if (error || !result?.success) {
      const errorMessage = error?.message || 'Retry payment initiation failed';
      await this.updateIntentStatus(intentId, PaymentIntentStatus.FAILED);
      await this.emitPaymentFailedEvent(intent, errorMessage);

      return this.createFailedResult(
        intentId,
        errorMessage,
        PaymentIntentStatus.FAILED,
        config.maxRetries - totalAttempts,
      );
    }

    await this.recordTransaction(intent, result, provider.providerId);
    await this.updateIntentStatus(intentId, PaymentIntentStatus.SUCCEEDED);
    await this.emitPaymentSucceededEvent(intent, result);

    this.clearRetryState(intentId);

    return {
      success: true,
      intentId,
      transactionId: result.transactionId,
      status: PaymentIntentStatus.SUCCEEDED,
      providerReference: result.providerReference,
      providerId: provider.providerId,
    };
  }

  getRetryState(intentId: string): RetryState | undefined {
    return this.retryStates.get(intentId);
  }

  private async selectProvider(
    currency: string,
    paymentMethod: PaymentMethod,
    preferredProviderId?: string,
  ): Promise<PaymentProvider | undefined> {
    if (preferredProviderId) {
      const preferred = this.providerRegistry.get(preferredProviderId);
      if (preferred && this.providerSupportsCurrency(preferred, currency)) {
        return preferred;
      }
      this.logger.warn(
        `Preferred provider ${preferredProviderId} not suitable, falling back`,
      );
    }

    const capability = this.mapPaymentMethodToCapability(paymentMethod);
    const capableProviders = this.providerRegistry.getByCapability(capability);

    const suitableProvider = capableProviders.find((p) =>
      this.providerSupportsCurrency(p, currency),
    );

    if (suitableProvider) {
      return suitableProvider;
    }

    const defaultProvider = this.providerRegistry.getDefault();
    if (defaultProvider && this.providerSupportsCurrency(defaultProvider, currency)) {
      return defaultProvider;
    }

    return undefined;
  }

  private providerSupportsCurrency(provider: PaymentProvider, currency: string): boolean {
    return provider.supportedCurrencies.includes(currency.toUpperCase());
  }

  private mapPaymentMethodToCapability(method: PaymentMethod): ProviderCapability {
    const mapping: Record<PaymentMethod, ProviderCapability> = {
      [PaymentMethod.CARD]: 'CARD',
      [PaymentMethod.MOBILE_MONEY]: 'MOBILE_MONEY',
      [PaymentMethod.BANK_TRANSFER]: 'BANK_TRANSFER',
      [PaymentMethod.WALLET_BALANCE]: 'WALLET',
    };
    return mapping[method] || 'CARD';
  }

  private async createPaymentIntent(
    intentId: string,
    input: PaymentInitiationInput,
    providerId: string,
  ): Promise<PaymentIntentEntity> {
    const intent = this.paymentIntentRepository.create({
      id: intentId,
      payerAccountId: input.payerAccountId,
      payeeAccountId: input.payeeAccountId,
      amount: input.amount.toFixed(2),
      currency: input.currency.toUpperCase(),
      status: PaymentIntentStatus.PENDING,
      flowType: input.flowType,
      paymentMethod: input.paymentMethod,
      providerId,
      idempotencyKey: input.idempotencyKey ?? uuidv4(),
      metadata: input.metadata ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.paymentIntentRepository.save(intent);
  }

  private buildPaymentIntentData(intent: PaymentIntentEntity): PaymentIntentData {
    return {
      amount: parseFloat(intent.amount),
      currency: intent.currency,
      customerId: intent.payerAccountId,
      metadata: intent.metadata as Record<string, unknown> | undefined,
      idempotencyKey: intent.idempotencyKey,
    };
  }

  private async recordTransaction(
    intent: PaymentIntentEntity,
    result: PaymentInitiationResult,
    providerId: string,
  ): Promise<void> {
    const transaction = this.paymentTransactionRepository.create({
      id: result.transactionId,
      paymentIntentId: intent.id,
      providerId,
      providerTransactionId: result.providerReference ?? null,
      amount: intent.amount,
      status: result.status,
      rawResponse: result.metadata as Record<string, unknown> | null,
      createdAt: new Date(),
    });

    await this.paymentTransactionRepository.save(transaction);
  }

  private async updateIntentStatus(
    intentId: string,
    status: PaymentIntentStatus,
  ): Promise<void> {
    await this.paymentIntentRepository.update(intentId, {
      status,
      updatedAt: new Date(),
    });
  }

  private async syncTransactionStatus(
    transactionId: string,
    _providerId: string,
    result: WebhookProcessingResult,
  ): Promise<void> {
    const transaction = await this.paymentTransactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      this.logger.warn(`Transaction ${transactionId} not found for webhook sync`);
      return;
    }

    if (result.status) {
      await this.paymentTransactionRepository.update(transactionId, {
        status: result.status,
      });

      const intentId = (transaction as unknown as { intentId?: string }).intentId;
      if (intentId) {
        const intentStatus = this.mapPaymentStatusToIntentStatus(result.status);
        await this.updateIntentStatus(intentId, intentStatus);
      }
    }
  }

  private mapPaymentStatusToIntentStatus(status: PaymentStatus): PaymentIntentStatus {
    switch (status) {
      case PaymentStatus.SUCCEEDED:
        return PaymentIntentStatus.SUCCEEDED;
      case PaymentStatus.FAILED:
        return PaymentIntentStatus.FAILED;
      case PaymentStatus.PENDING:
        return PaymentIntentStatus.PENDING;
      case PaymentStatus.PROCESSING:
        return PaymentIntentStatus.PROCESSING;
      default:
        return PaymentIntentStatus.PENDING;
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
  ): Promise<{ result?: T; error?: Error; attempts: number }> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        return { result, attempts: attempt };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Attempt ${attempt}/${config.maxRetries} failed: ${lastError.message}`);

        if (attempt < config.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt, config);
          await this.sleep(delay);
        }
      }
    }

    return { error: lastError, attempts: config.maxRetries };
  }

  private calculateBackoffDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * config.baseDelayMs * 0.1;
    return Math.min(exponentialDelay + jitter, config.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private updateRetryState(
    intentId: string,
    attempts: number,
    config: RetryConfig,
  ): void {
    const state: RetryState = {
      intentId,
      attempts,
      lastAttemptAt: new Date(),
      nextRetryAt:
        attempts < config.maxRetries
          ? new Date(Date.now() + this.calculateBackoffDelay(attempts + 1, config))
          : undefined,
    };
    this.retryStates.set(intentId, state);
  }

  private clearRetryState(intentId: string): void {
    this.retryStates.delete(intentId);
  }

  private createFailedResult(
    intentId: string,
    error: string,
    status: PaymentIntentStatus,
    retriesRemaining?: number,
  ): PaymentFlowResult {
    return {
      success: false,
      intentId,
      status,
      error,
      retriesRemaining,
    };
  }

  private async emitPaymentIntentCreatedEvent(intent: PaymentIntentEntity): Promise<void> {
    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Payment.Intent.CreatedV1',
      aggregateId: intent.id,
      aggregateType: 'PaymentIntent',
      payload: {
        intentId: intent.id,
        payerAccountId: intent.payerAccountId,
        payeeAccountId: intent.payeeAccountId,
        amount: intent.amount,
        currency: intent.currency,
        flowType: intent.flowType,
        paymentMethod: intent.paymentMethod,
        providerId: intent.providerId,
      },
      occurredAt: new Date(),
    };

    await this.eventBus.publish(NatsSubjects.Payment.INTENT_CREATED_V1, event);
  }

  private async emitPaymentSucceededEvent(
    intent: PaymentIntentEntity,
    result: PaymentInitiationResult,
  ): Promise<void> {
    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Payment.Intent.SucceededV1',
      aggregateId: intent.id,
      aggregateType: 'PaymentIntent',
      payload: {
        intentId: intent.id,
        transactionId: result.transactionId,
        providerReference: result.providerReference,
        amount: intent.amount,
        currency: intent.currency,
        succeededAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
    };

    await this.eventBus.publish(NatsSubjects.Payment.COMPLETED_V1, event);
  }

  private async emitPaymentFailedEvent(
    intent: PaymentIntentEntity,
    reason: string,
  ): Promise<void> {
    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Payment.Intent.FailedV1',
      aggregateId: intent.id,
      aggregateType: 'PaymentIntent',
      payload: {
        intentId: intent.id,
        payerAccountId: intent.payerAccountId,
        amount: intent.amount,
        currency: intent.currency,
        reason,
        failedAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
    };

    await this.eventBus.publish(NatsSubjects.Payment.FAILED_V1, event);
  }
}
