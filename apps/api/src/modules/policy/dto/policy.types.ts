import {
  PolicyEffect,
  PolicyScope,
  PolicyTrigger,
  PolicyCondition,
  PolicyDecision,
} from '@zanafleet/contracts';

/**
 * Re-export shared types from @zanafleet/contracts
 * These are defined in contracts to ensure consistency across packages.
 */
export type { PolicyCondition, PolicyDecision } from '@zanafleet/contracts';

/**
 * EvaluationContext Interface
 * Contains all contextual data needed to evaluate policies.
 * Passed to the policy engine when a trigger event occurs.
 *
 * Note: This interface is local to the API module as it contains
 * implementation-specific details not needed by consuming packages.
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
 * EvaluatedPolicy Interface
 * Represents a policy that was considered during evaluation.
 *
 * Note: This interface is local to the API module as it contains
 * implementation-specific details not needed by consuming packages.
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
 *
 * Note: This interface is local to the API module as it contains
 * implementation-specific details not needed by consuming packages.
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
