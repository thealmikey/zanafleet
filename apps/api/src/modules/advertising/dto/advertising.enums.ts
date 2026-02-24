/**
 * Advertising Module Enums
 */

export enum AdCampaignStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
  COMPLETED = 'COMPLETED',
}

export enum AdType {
  BANNER = 'BANNER',
  SPONSORED_LISTING = 'SPONSORED_LISTING',
  FEATURED_SLOT = 'FEATURED_SLOT',
  POPUP = 'POPUP',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
}

export enum AdPlacement {
  HOME = 'HOME',
  SEARCH_RESULTS = 'SEARCH_RESULTS',
  JOB_DETAIL = 'JOB_DETAIL',
  WORKER_PROFILE = 'WORKER_PROFILE',
  BUSINESS_PROFILE = 'BUSINESS_PROFILE',
  DASHBOARD = 'DASHBOARD',
}

export enum PricingModel {
  CPC = 'CPC', // Cost per click
  CPM = 'CPM', // Cost per 1000 impressions
  CPD = 'CPD', // Cost per day
  CPI = 'CPI', // Cost per install/action
}

export enum VisibilityTokenType {
  BOOST = 'BOOST',       // Short-term visibility boost
  PREMIUM = 'PREMIUM',   // Premium badge/listing
  FEATURED = 'FEATURED', // Featured placement
  TOP_RESULT = 'TOP_RESULT', // Always show at top
}

export enum VisibilityTokenStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CONSUMED = 'CONSUMED',
}
