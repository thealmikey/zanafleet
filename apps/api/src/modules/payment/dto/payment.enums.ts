/**
 * Payment Enums
 * Type definitions for payment intent and transaction entities
 */

export enum PaymentIntentStatus {
  CREATED = 'CREATED',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentFlowType {
  C2B = 'C2B',
  B2C = 'B2C',
  B2B = 'B2B',
  C2C = 'C2C',
  PLATFORM_PAYOUT = 'PLATFORM_PAYOUT',
}

export enum PaymentMethod {
  CARD = 'CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET_BALANCE = 'WALLET_BALANCE',
}
