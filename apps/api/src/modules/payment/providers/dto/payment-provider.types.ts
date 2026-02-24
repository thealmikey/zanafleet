/**
 * Payment Provider Types
 * Shared types for payment provider abstraction
 */

export type ProviderCapability =
  | 'CARD'
  | 'MOBILE_MONEY'
  | 'BANK_TRANSFER'
  | 'WALLET'
  | 'TOKENIZATION';

export interface PaymentIntentData {
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
  returnUrl?: string;
  idempotencyKey?: string;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  REQUIRES_ACTION = 'REQUIRES_ACTION',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface PaymentInitiationResult {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  providerReference?: string;
  redirectUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentCaptureResult {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  capturedAmount?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  transactionId: string;
  amount: number;
  status: PaymentStatus;
  errorCode?: string;
  errorMessage?: string;
}

export interface WebhookProcessingResult {
  acknowledged: boolean;
  eventType: string;
  transactionId?: string;
  status?: PaymentStatus;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}
