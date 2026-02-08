import { PolicyEffect, PolicyScope, PolicyTrigger } from './policy.enums';

/**
 * PolicyCondition Interface
 * Represents a JSON Logic-style condition for policy evaluation.
 * Supports nested conditions with AND/OR logic.
 */
export interface PolicyCondition {
  /** The field path to evaluate (e.g., 'delivery.status', 'rider.vehicleType') */
  field: string;
  /** The comparison operator (e.g., 'eq', 'ne', 'gt', 'lt', 'in', 'contains') */
  operator: string;
  /** The value to compare against */
  value: unknown;
  /** Logical operator for combining with sibling conditions */
  logic?: 'AND' | 'OR';
  /** Nested conditions for complex expressions */
  children?: PolicyCondition[];
}

/**
 * EvaluationContext Interface
 * Contains all contextual data needed to evaluate policies.
 * Passed to the policy engine when a trigger event occurs.
 */
export interface EvaluationContext {
  /** The event that triggered policy evaluation */
  trigger: PolicyTrigger;
  /** The actor performing the action (if applicable) */
  actorId?: string;
  /** The workspace where the action is occurring */
  workspaceId: string;
  /** The delivery being acted upon (if applicable) */
  deliveryId?: string;
  /** The rider involved (if applicable) */
  riderId?: string;
  /** The business involved (if applicable) */
  businessId?: string;
  /** The SACCO involved (if applicable) */
  saccoId?: string;
  /** When the evaluation is being performed */
  timestamp: Date;
  /** Geographic location context (if applicable) */
  location?: {
    latitude: number;
    longitude: number;
  };
  /** Additional context-specific data */
  metadata?: Record<string, unknown>;
}

/**
 * PolicyDecision Interface
 * Represents the outcome of a single policy evaluation.
 */
export interface PolicyDecision {
  /** The effect to apply */
  effect: PolicyEffect;
  /** ID of the policy that produced this decision */
  policyId: string;
  /** Human-readable name of the policy */
  policyName: string;
  /** Explanation of why this decision was made */
  reason: string;
  /** Field modifications to apply (when effect is MODIFY) */
  modifications?: Record<string, unknown>;
  /** Actor IDs required to approve (when effect is REQUIRE_APPROVAL) */
  requiresApprovalFrom?: string[];
}

/**
 * EvaluatedPolicy Interface
 * Represents a policy that was considered during evaluation.
 */
export interface EvaluatedPolicy {
  /** ID of the evaluated policy */
  policyId: string;
  /** Whether the policy's conditions matched the context */
  matched: boolean;
  /** Priority of the policy (higher = more important) */
  priority: number;
  /** Scope level of the policy */
  scope: PolicyScope;
}

/**
 * EvaluationResult Interface
 * Contains the complete result of a policy evaluation run.
 */
export interface EvaluationResult {
  /** The final decision after considering all matching policies */
  finalDecision: PolicyDecision;
  /** All policies that were evaluated */
  evaluatedPolicies: EvaluatedPolicy[];
  /** Time taken to evaluate all policies in milliseconds */
  processingTimeMs: number;
  /** Whether the decision was made via fail-open due to an error */
  failedOpen: boolean;
}
