/**
 * Account Enums
 * Type definitions for account entities in the financial identity layer
 */

export enum AccountType {
  BUSINESS = 'BUSINESS',
  RIDER = 'RIDER',
  CUSTOMER = 'CUSTOMER',
  PLATFORM = 'PLATFORM',
  SPONSOR = 'SPONSOR',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}
