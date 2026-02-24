import { Injectable } from '@nestjs/common';

export interface AssignmentRulesConfig {
  preMatchWindowMinutes: number;
}

export type AssignmentDecisionType = 'MATCH_NOW' | 'SCHEDULE_FOR_LATER';

export interface AssignmentDecision {
  decision: AssignmentDecisionType;
  reason:
    | 'NOT_SCHEDULED'
    | 'PAST_SCHEDULE'
    | 'WITHIN_WINDOW'
    | 'FUTURE_OUTSIDE_WINDOW'
    | 'IMMEDIATE';
  scheduleAt?: Date;
}

export interface EvaluateInput {
  isScheduled: boolean;
  scheduledPickupTime?: Date | null;
  scheduledDropoffTime?: Date | null;
  now?: Date;
}

@Injectable()
export class AssignmentRulesService {
  private readonly defaultConfig: AssignmentRulesConfig;

  constructor() {
    // Default to 15 minutes if not provided via method overrides
    this.defaultConfig = { preMatchWindowMinutes: 15 };
  }

  /**
   * Decide whether to match a delivery now or delay until N minutes before scheduled time.
   * Pure decision function: no I/O, no side effects.
   */
  evaluateForMatching(
    input: EvaluateInput,
    config?: Partial<AssignmentRulesConfig>
  ): AssignmentDecision {
    const now = input.now ?? new Date();
    const preMatchWindowMinutes =
      config?.preMatchWindowMinutes ?? this.defaultConfig.preMatchWindowMinutes;
    const scheduledAt = this.resolveScheduledTime({
      scheduledPickupTime: input.scheduledPickupTime,
      scheduledDropoffTime: input.scheduledDropoffTime,
    });

    if (!input.isScheduled) {
      return { decision: 'MATCH_NOW', reason: 'NOT_SCHEDULED' };
    }

    if (!scheduledAt) {
      // Inconsistent state: flagged scheduled but no timestamps; opt to match now
      return { decision: 'MATCH_NOW', reason: 'IMMEDIATE' };
    }

    if (scheduledAt.getTime() <= now.getTime()) {
      return { decision: 'MATCH_NOW', reason: 'PAST_SCHEDULE' };
    }

    const windowMs = preMatchWindowMinutes * 60 * 1000;
    const threshold = new Date(scheduledAt.getTime() - windowMs);

    if (now.getTime() < threshold.getTime()) {
      return {
        decision: 'SCHEDULE_FOR_LATER',
        reason: 'FUTURE_OUTSIDE_WINDOW',
        scheduleAt: threshold,
      };
    }

    return { decision: 'MATCH_NOW', reason: 'WITHIN_WINDOW' };
  }

  /**
   * Whether a rider should be notified because they were assigned well ahead of the scheduled window.
   * This is a pure predicate and does not perform the notification itself.
   */
  shouldNotifyEarlyAssignment(params: {
    isScheduled: boolean;
    scheduledPickupTime?: Date | null;
    scheduledDropoffTime?: Date | null;
    assignedAt?: Date;
    config?: Partial<AssignmentRulesConfig>;
  }): boolean {
    if (!params.isScheduled) return false;

    const scheduledAt = this.resolveScheduledTime({
      scheduledPickupTime: params.scheduledPickupTime,
      scheduledDropoffTime: params.scheduledDropoffTime,
    });
    if (!scheduledAt) return false;

    const assignedAt = params.assignedAt ?? new Date();
    const preMatchWindowMinutes =
      params.config?.preMatchWindowMinutes ?? this.defaultConfig.preMatchWindowMinutes;
    const windowMs = preMatchWindowMinutes * 60 * 1000;
    const earlyThreshold = new Date(scheduledAt.getTime() - windowMs);

    return assignedAt.getTime() < earlyThreshold.getTime();
  }

  private resolveScheduledTime(input: {
    scheduledPickupTime?: Date | null;
    scheduledDropoffTime?: Date | null;
  }): Date | null {
    const { scheduledPickupTime, scheduledDropoffTime } = input;
    if (scheduledPickupTime instanceof Date && !Number.isNaN(scheduledPickupTime.valueOf())) {
      return scheduledPickupTime;
    }
    if (scheduledDropoffTime instanceof Date && !Number.isNaN(scheduledDropoffTime.valueOf())) {
      return scheduledDropoffTime;
    }
    return null;
  }
}
