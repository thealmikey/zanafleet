/**
 * Policy Scope Enum
 * Defines the hierarchical scope levels for policies.
 * More specific scopes (RIDER) override more general scopes (GLOBAL).
 * Hierarchy: GLOBAL < NATIONAL < SACCO < BUSINESS < RIDER
 */
export enum PolicyScope {
  GLOBAL = 'GLOBAL',
  NATIONAL = 'NATIONAL',
  SACCO = 'SACCO',
  BUSINESS = 'BUSINESS',
  RIDER = 'RIDER',
}

/**
 * Policy Effect Enum
 * Defines the possible outcomes when a policy matches.
 */
export enum PolicyEffect {
  ALLOW = 'ALLOW',
  BLOCK = 'BLOCK',
  MODIFY = 'MODIFY',
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL',
}

/**
 * Policy Status Enum
 * Defines the lifecycle states of a policy.
 */
export enum PolicyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Policy Trigger Enum
 * Defines the events that can trigger policy evaluation.
 */
export enum PolicyTrigger {
  DELIVERY_CREATION = 'DELIVERY_CREATION',
  RIDER_ASSIGNMENT = 'RIDER_ASSIGNMENT',
  STATUS_TRANSITION = 'STATUS_TRANSITION',
  SLA_CHECK = 'SLA_CHECK',
}
