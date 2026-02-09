/**
 * Settlement Enums
 * Type definitions for settlement batch and payout entities
 */

export enum SettlementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIALLY_FAILED = 'PARTIALLY_FAILED',
}

export enum PayoutMethod {
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET = 'WALLET',
}
