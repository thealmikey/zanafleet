import { BindingTargetType } from '@zanafleet/contracts';

/**
 * Operation types that can be evaluated for scheduling constraints.
 */
export type OperationType = 'DELIVERY_CREATION' | 'RIDER_ASSIGNMENT' | 'STATUS_TRANSITION';

/**
 * Types of constraints that can block an operation.
 */
export type BlockedByType = 'HOLIDAY' | 'OUTSIDE_HOURS' | 'BLACKOUT' | 'CLOSURE';

/**
 * Context for evaluating scheduling constraints.
 * Contains all information needed to determine if an operation is allowed.
 */
export interface ConstraintContext {
  /** The timestamp to evaluate */
  timestamp: Date;
  /** IANA timezone identifier (e.g., 'Africa/Nairobi') */
  timezone: string;
  /** The type of entity being constrained */
  targetType: BindingTargetType;
  /** The ID of the target entity */
  targetId: string;
  /** The type of operation being attempted */
  operationType: OperationType;
  /** Additional context (e.g., region info, inheritance context) */
  metadata?: Record<string, unknown>;
  /** Optional workspace ID for full inheritance context resolution */
  workspaceId?: string;
  /** Optional business ID for full inheritance context resolution */
  businessId?: string;
  /** Optional sacco ID for full inheritance context resolution */
  saccoId?: string;
  /** Optional rider ID for full inheritance context resolution */
  riderId?: string;
}

/**
 * Result of a constraint evaluation.
 * Pure decision output with explanation.
 */
export interface ConstraintResult {
  /** Whether the operation is allowed */
  allowed: boolean;
  /** Human-readable explanation of the decision */
  reason: string;
  /** Details about what blocked the operation (when allowed=false) */
  blockedBy?: {
    type: BlockedByType;
    name: string;
    id: string;
  };
  /** Suggested next available time (when allowed=false) */
  suggestedReschedule?: Date;
}

/**
 * Result of a working hours check.
 */
export interface WorkingHoursResult {
  withinHours: boolean;
  reason: string;
  calendarId?: string;
}

/**
 * Result of a holiday check.
 */
export interface HolidayCheckResult {
  isHoliday: boolean;
  holidayName?: string;
  holidayId?: string;
}

/**
 * Result of a blackout period check.
 */
export interface BlackoutCheckResult {
  isBlackout: boolean;
  reason?: string;
  ruleId?: string;
}
