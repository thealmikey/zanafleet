/**
 * Revenue Distribution Types
 * Type definitions for multi-party revenue splits
 */

import { DeliveryType, AccountType } from './ledger.enums';

export interface SaccoAgreement {
  saccoId: string;
  commissionRate: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface CustomRates {
  platformRate?: number;
  saccoRate?: number;
  riderRate?: number;
}

export interface AppliedRates {
  platformRate: number;
  saccoRate: number;
  riderRate: number;
  campaignSubsidyRate: number;
}

export interface RevenueDistributionInput {
  deliveryId: string;
  totalAmount: number;
  currency: string;
  deliveryType: DeliveryType;
  platformAccountId: string;
  riderAccountId: string;
  saccoAccountId?: string;
  campaignAccountId?: string;
  campaignSubsidyAmount?: number;
  customRates?: CustomRates;
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

export interface SplitContext {
  deliveryType: DeliveryType;
  saccoId?: string;
  saccoAgreement?: SaccoAgreement;
  campaignId?: string;
  campaignSubsidyAmount?: number;
  customRates?: CustomRates;
  metadata?: Record<string, unknown>;
}

export interface RevenueSplits {
  riderAmount: number;
  saccoAmount: number;
  platformAmount: number;
  campaignSubsidyAmount: number;
  totalDistributed: number;
  appliedRates: AppliedRates;
}

export interface LedgerEntryReference {
  entryId: string;
  accountId: string;
  accountType: AccountType;
  amount: number;
  entryType: 'DEBIT' | 'CREDIT';
}

export interface DistributionResult {
  success: boolean;
  distributionId: string;
  deliveryId: string;
  splits: RevenueSplits;
  ledgerEntries: LedgerEntryReference[];
  error?: string;
  distributedAt: Date;
}

export interface EarnedBalance {
  accountId: string;
  accountType: AccountType;
  totalEarned: number;
  currency: string;
  lastUpdated: Date;
}

export interface PayableBalance {
  accountId: string;
  accountType: AccountType;
  totalPayable: number;
  totalPaid: number;
  pendingAmount: number;
  currency: string;
  lastUpdated: Date;
}

export interface DefaultCommissionRates {
  [DeliveryType.STANDARD]: CommissionRateSet;
  [DeliveryType.EXPRESS]: CommissionRateSet;
  [DeliveryType.SCHEDULED]: CommissionRateSet;
  [DeliveryType.BULK]: CommissionRateSet;
}

export interface CommissionRateSet {
  platformRate: number;
  saccoRate: number;
  riderRate: number;
}
