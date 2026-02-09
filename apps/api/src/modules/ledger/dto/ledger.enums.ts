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
  SACCO_COMMISSION = 'SACCO_COMMISSION',
  TIP = 'TIP',
  SUBSIDY = 'SUBSIDY',
  CAMPAIGN_SUBSIDY = 'CAMPAIGN_SUBSIDY',
  REFUND = 'REFUND',
  PAYOUT = 'PAYOUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum LedgerReferenceType {
  PAYMENT = 'PAYMENT',
  INVOICE = 'INVOICE',
  SETTLEMENT = 'SETTLEMENT',
  DELIVERY = 'DELIVERY',
}

export enum DeliveryType {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
  SCHEDULED = 'SCHEDULED',
  BULK = 'BULK',
}

export enum AccountType {
  RIDER = 'RIDER',
  SACCO = 'SACCO',
  PLATFORM = 'PLATFORM',
  CAMPAIGN = 'CAMPAIGN',
}
