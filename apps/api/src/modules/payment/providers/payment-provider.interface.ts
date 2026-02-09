import {
  ProviderCapability,
  PaymentIntentData,
  PaymentInitiationResult,
  PaymentCaptureResult,
  RefundResult,
  WebhookProcessingResult,
} from './dto/payment-provider.types';

/**
 * Injection token for payment providers
 */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

/**
 * PaymentProvider Interface
 * Defines the contract for payment provider implementations
 * Enables swapping providers (Stripe, M-Pesa, PayPal) without schema or logic changes
 */
export interface PaymentProvider {
  readonly providerId: string;
  readonly displayName: string;
  readonly supportedCurrencies: string[];
  readonly capabilities: ProviderCapability[];

  initiatePayment(intent: PaymentIntentData): Promise<PaymentInitiationResult>;
  capturePayment(transactionId: string): Promise<PaymentCaptureResult>;
  refund(transactionId: string, amount: number): Promise<RefundResult>;
  verifyWebhook(payload: unknown, signature: string): boolean;
  handleWebhook(payload: unknown): Promise<WebhookProcessingResult>;
}
