/**
 * Incentive Enums
 * Type definitions for incentive campaigns and applications
 */

export enum IncentiveType {
  PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT',
  FIXED_DISCOUNT = 'FIXED_DISCOUNT',
  FREE_DELIVERY = 'FREE_DELIVERY',
  RIDER_BONUS = 'RIDER_BONUS',
  REFERRAL_REWARD = 'REFERRAL_REWARD',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXHAUSTED = 'EXHAUSTED',
  EXPIRED = 'EXPIRED',
}

export enum FundingSource {
  PLATFORM = 'PLATFORM',
  BUSINESS_SPONSOR = 'BUSINESS_SPONSOR',
  EXTERNAL_SPONSOR = 'EXTERNAL_SPONSOR',
}
