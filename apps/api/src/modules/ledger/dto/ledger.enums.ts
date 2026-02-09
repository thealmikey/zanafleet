/**
 * Ledger Enums
 * Type definitions for the immutable ledger tracking all money movements
 */

export enum LedgerEntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum LedgerCategory {
  DELIVERY_FEE = 'DELIVERY_FEE',
  PLATFORM_FEE = 'PLATFORM_FEE',
  RIDER_EARNING = 'RIDER_EARNING',
  TIP = 'TIP',
  SUBSIDY = 'SUBSIDY',
  REFUND = 'REFUND',
  PAYOUT = 'PAYOUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum LedgerReferenceType {
  PAYMENT = 'PAYMENT',
  INVOICE = 'INVOICE',
  SETTLEMENT = 'SETTLEMENT',
}
