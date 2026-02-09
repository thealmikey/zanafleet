/**
 * Payment Enums
 * Type definitions for payment intent and transaction entities
 */

export enum PaymentIntentStatus {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
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

export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
}

export enum DisputeReason {
  DELIVERY_NOT_RECEIVED = 'DELIVERY_NOT_RECEIVED',
  DAMAGED_GOODS = 'DAMAGED_GOODS',
  WRONG_ITEMS = 'WRONG_ITEMS',
  LATE_DELIVERY = 'LATE_DELIVERY',
  OVERCHARGED = 'OVERCHARGED',
  POOR_SERVICE = 'POOR_SERVICE',
  OTHER = 'OTHER',
}

export enum DisputeResolutionType {
  FULL_REFUND = 'FULL_REFUND',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  NO_REFUND = 'NO_REFUND',
  CREDIT_ISSUED = 'CREDIT_ISSUED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

export enum RefundType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
}
