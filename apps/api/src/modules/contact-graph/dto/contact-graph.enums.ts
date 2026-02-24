/**
 * Contact Graph Module Enums
 */

export enum ContactSource {
  DEVICE = 'DEVICE', // Mobile contacts sync
  CSV = 'CSV', // Bulk upload
  CRM = 'CRM', // CRM exports (HubSpot, Salesforce)
  EMAIL = 'EMAIL', // Email address book
  BULK = 'BULK', // Bulk upload
  MANUAL = 'MANUAL', // Manually added
  REFERRAL = 'REFERRAL', // From referral program
}

export enum ContactType {
  RIDER = 'RIDER', // Platform worker
  CUSTOMER = 'CUSTOMER', // End consumer
  BUSINESS = 'BUSINESS', // Partner business
  SUPPLIER = 'SUPPLIER', // Supply chain partner
  REFERRAL = 'REFERRAL', // Referred contact
  UNCLASSIFIED = 'UNCLASSIFIED', // Needs review
}

export enum ContactStatus {
  PENDING = 'PENDING', // Newly imported, not reviewed
  VERIFIED = 'VERIFIED', // Matched and verified
  INVITED = 'INVITED', // Invitation sent
  ACTIVE = 'ACTIVE', // Onboarded to platform
  INACTIVE = 'INACTIVE', // Previously active, now inactive
  ARCHIVED = 'ARCHIVED', // Archived by user
}

export enum RelationshipType {
  // User-to-User
  RIDER_OF = 'RIDER_OF',
  EMPLOYEE_OF = 'EMPLOYEE_OF',
  CUSTOMER_OF = 'CUSTOMER_OF',

  // Business relationships
  PARTNER_OF = 'PARTNER_OF',
  SUPPLIER_OF = 'SUPPLIER_OF',

  // Referral
  REFERRED_BY = 'REFERRED_BY',
  REFERRAL_SOURCE = 'REFERRAL_SOURCE',

  // Workspace relationships
  MEMBER_OF = 'MEMBER_OF',
  ADMIN_OF = 'ADMIN_OF',
  WORKER_IN = 'WORKER_IN',

  // Interaction-based (auto-generated)
  FREQUENTLY_INTERACTS_WITH = 'FREQUENTLY_INTERACTS_WITH',
  SHARES_RIDERS_WITH = 'SHARES_RIDERS_WITH',

  // Contact to platform
  MATCHED_TO = 'MATCHED_TO',
}

export enum MatchConfidence {
  EXACT = 100,
  HIGH = 95,
  VERY_HIGH = 90,
  HIGH_PROBABILITY = 80,
  PROBABLE = 70,
  POSSIBLE = 50,
  UNLIKELY = 30,
}

export enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum MergeStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  AUTO_MERGED = 'AUTO_MERGED',
}
