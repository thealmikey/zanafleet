/**
 * Workspace Enums
 * Type definitions for workspace-related categorization
 */

/**
 * WorkspaceType - Categorizes the type of workspace
 */
export enum WorkspaceType {
  SACCO = 'SACCO',
  BUSINESS = 'BUSINESS',
  MARKET = 'MARKET',
  OPS = 'OPS',
}

/**
 * WorkspaceStatus - Current operational status of a workspace
 */
export enum WorkspaceStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

/**
 * MembershipRole - Role of an actor within a workspace
 */
export enum MembershipRole {
  RIDER = 'RIDER',
  ADMIN = 'ADMIN',
  OPS = 'OPS',
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  CUSTOMER = 'CUSTOMER',
}
