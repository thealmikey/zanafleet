/**
 * Billing Enums
 * Type definitions for billing entities (charges and invoices)
 */

export enum ChargeType {
  BASE_DELIVERY_FEE = 'BASE_DELIVERY_FEE',
  DISTANCE_FEE = 'DISTANCE_FEE',
  SURGE_FEE = 'SURGE_FEE',
  SERVICE_FEE = 'SERVICE_FEE',
  TAX = 'TAX',
  TIP = 'TIP',
  DISCOUNT = 'DISCOUNT',
  SUBSIDY = 'SUBSIDY',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}
