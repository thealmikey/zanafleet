import {
  PolicyScope,
  PolicyTrigger,
  PolicyDecision,
  CalendarEventType,
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
  /** IANA timezone identifier for time-based policy evaluation (e.g., 'Africa/Nairobi', 'UTC') */
  timezone?: string;
  /** Geographic location context (if applicable) */
  location?: {
    latitude: number;
    longitude: number;
  };
  /** Additional context-specific data */
  metadata?: Record<string, unknown>;
  /** Calendar context for time-based policy conditions */
  calendarContext?: {
    /** IDs of calendars that apply to this context */
    effectiveCalendarIds: string[];
    /** Whether the current time falls on a holiday */
    isHoliday: boolean;
    /** Whether the current time is within working hours */
    isWorkingHours: boolean;
    /** Whether the current day is a weekend (Saturday or Sunday) */
    isWeekend: boolean;
    /** Current day of week (0=Sunday, 6=Saturday) */
    currentDayOfWeek: number;
    /** Active calendar events (holidays, closures, etc.) */
    activeEvents: Array<{ eventId: string; eventType: CalendarEventType; title: string }>;
    /** Active calendar overrides (exceptions) */
    activeOverrides: Array<{ overrideId: string; exceptionType: string }>;
  };
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
  /** Whether an error occurred during policy evaluation */
  evaluationFailed: boolean;
  /** The failure mode when evaluationFailed is true: 'open' (ALLOW) or 'closed' (BLOCK). Only present when evaluationFailed is true. */
  failMode?: 'open' | 'closed';
}
