/**
 * Organization Type Enum
 * Defines the types of organizations supported in ZanaFleet
 */
export enum OrganizationType {
  SACCO = 'SACCO',
  BUSINESS = 'Business',
  PLATFORM = 'Platform',
  INTERNAL = 'Internal',
}

/**
 * Organization Status Enum
 * Defines the lifecycle status of an organization
 */
export enum OrganizationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  PILOT = 'pilot',
  LEGACY = 'legacy',
}
