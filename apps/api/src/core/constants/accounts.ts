/**
 * Platform Account Constants
 *
 * The platform account is created during database seeding and represents
 * the ZanaFleet platform as a financial participant in transactions.
 *
 * This account receives platform fees, commissions, and is the source
 * for platform-funded subsidies and incentives.
 */

/**
 * Well-known UUID for the platform account.
 * This value must match the account ID created in database seeding.
 *
 * Usage:
 * - Settlement handlers for platform commission calculations
 * - Billing handlers for platform fee allocations
 * - Incentive handlers for platform-funded subsidies
 */
export const PLATFORM_ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';

/**
 * Account type identifiers for well-known system accounts
 */
export const SystemAccounts = {
  /** The main platform account for fees and commissions */
  PLATFORM: PLATFORM_ACCOUNT_ID,
} as const;
