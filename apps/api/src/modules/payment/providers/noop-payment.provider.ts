import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import {
  PaymentIntentData,
  PaymentInitiationResult,
  PaymentCaptureResult,
  RefundResult,
  WebhookProcessingResult,
  PaymentStatus,
  ProviderCapability,
} from './dto/payment-provider.types';
import { PaymentProvider } from './payment-provider.interface';

/**
 * No-operation payment provider for testing and development.
 * Always returns success for all operations.
 */
@Injectable()
export class NoOpPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(NoOpPaymentProvider.name);

  readonly providerId = 'noop';
  readonly displayName = 'No-Op Payment Provider';
  readonly supportedCurrencies = ['USD', 'EUR', 'GBP', 'KES'];
  readonly capabilities: ProviderCapability[] = [
    'CARD',
    'MOBILE_MONEY',
    'BANK_TRANSFER',
    'WALLET',
  ];

  async initiatePayment(intent: PaymentIntentData): Promise<PaymentInitiationResult> {
    this.logger.debug(
      `NoOp initiatePayment called for amount: ${intent.amount} ${intent.currency}`,
    );

    return {
      success: true,
      transactionId: uuidv4(),
      status: PaymentStatus.SUCCEEDED,
      providerReference: `noop_${Date.now()}`,
      metadata: intent.metadata,
    };
  }

  async capturePayment(transactionId: string): Promise<PaymentCaptureResult> {
    this.logger.debug(`NoOp capturePayment called for transaction: ${transactionId}`);

    return {
      success: true,
      transactionId,
      status: PaymentStatus.SUCCEEDED,
    };
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    this.logger.debug(
      `NoOp refund called for transaction: ${transactionId}, amount: ${amount}`,
    );

    return {
      success: true,
      refundId: uuidv4(),
      transactionId,
      amount,
      status: PaymentStatus.SUCCEEDED,
    };
  }

  verifyWebhook(_payload: unknown, _signature: string): boolean {
    this.logger.debug('NoOp verifyWebhook called');
    return true;
  }

  async handleWebhook(payload: unknown): Promise<WebhookProcessingResult> {
    this.logger.debug(`NoOp handleWebhook called with payload: ${JSON.stringify(payload)}`);

    return {
      acknowledged: true,
      eventType: 'noop.event',
    };
  }
}
