import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BindingTargetType,
  CalendarScope,
  CalendarRuleType,
} from '@zanafleet/contracts';
import { DateTime } from 'luxon';
import { Repository } from 'typeorm';

import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import {
  ConstraintContext,
  ConstraintResult,
  BlockedByType,
} from '../dto/constraint.types';
import { CalendarRuleEntity } from '../entities/calendar-rule.entity';
import { ConstraintBlockedActionEventV1 } from '../events/calendar.events';
import { CalendarEventRepository, RegionFilter } from '../repositories/calendar-event.repository';

import { CalendarBindingService, InheritanceContext } from './calendar-binding.service';
import { CalendarService } from './calendar.service';


const MAX_SEARCH_DAYS = 7;

/**
 * SchedulingConstraintService
 *
 * Pure decision layer for evaluating scheduling constraints.
 * Determines whether operations are allowed based on:
 * - Calendar rules and time windows (working hours)
 * - Calendar events (holidays, closures)
 * - Calendar overrides (exceptions for premium merchants, etc.)
 *
 * Pattern: input context → pure logic → decision output with explanation
 * Reference: AssignmentRulesService for pure decision function pattern
 */
@Injectable()
export class SchedulingConstraintService {
  private readonly logger = new Logger(SchedulingConstraintService.name);

  constructor(
    private readonly calendarBindingService: CalendarBindingService,
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly calendarService: CalendarService,
    @InjectRepository(CalendarRuleEntity)
    private readonly calendarRuleRepo: Repository<CalendarRuleEntity>,
    private readonly eventBusService: EventBusService,
  ) {}

  /**
   * Evaluate whether an operation is allowed based on calendar constraints.
   *
   * Evaluation flow:
   * 1. Check for active overrides (highest priority - may short-circuit)
   * 2. Check calendar events (holidays, closures)
   * 3. Check for blackout periods
   * 4. Check time windows (working hours)
   * 5. Return ConstraintResult with reason and optional reschedule suggestion
   *
   * @param context The constraint evaluation context
   * @returns ConstraintResult with decision and explanation
   */
  async evaluate(context: ConstraintContext): Promise<ConstraintResult> {
    const { timestamp, timezone, targetType, targetId, metadata } = context;

    // 1. Check for active overrides (highest priority - may short-circuit)
    const targetScope = this.mapTargetTypeToScope(targetType);
    const hasAllowOverride = await this.hasActiveOverride(
      targetScope,
      targetId,
      timestamp,
      'ALLOW',
    );

    if (hasAllowOverride) {
      return {
        allowed: true,
        reason: 'Override active: operation permitted by exception',
      };
    }

    // 2. Check calendar events (holidays)
    const regionFilter = this.extractRegionFilter(metadata);
    const holidayResult = await this.checkHoliday(timestamp, regionFilter);
    if (!holidayResult.allowed) {
      const suggestedReschedule = await this.suggestNextAvailableTime(
        targetType,
        targetId,
        timestamp,
        timezone,
        regionFilter,
        context,
      );
      const result = {
        ...holidayResult,
        suggestedReschedule: suggestedReschedule ?? undefined,
      };
      this.emitBlockedEvent(context, result);
      return result;
    }

    // 3. Check for blackout periods
    const blackoutResult = await this.checkBlackoutPeriod(targetType, targetId, timestamp, context);
    if (!blackoutResult.allowed) {
      const suggestedReschedule = await this.suggestNextAvailableTime(
        targetType,
        targetId,
        timestamp,
        timezone,
        regionFilter,
        context,
      );
      const result = {
        ...blackoutResult,
        suggestedReschedule: suggestedReschedule ?? undefined,
      };
      this.emitBlockedEvent(context, result);
      return result;
    }

    // 4. Check time windows (working hours)
    const workingHoursResult = await this.checkWorkingHours(
      targetType,
      targetId,
      timestamp,
      timezone,
      context,
    );
    if (!workingHoursResult.allowed) {
      const suggestedReschedule = await this.suggestNextAvailableTime(
        targetType,
        targetId,
        timestamp,
        timezone,
        regionFilter,
        context,
      );
      const result = {
        ...workingHoursResult,
        suggestedReschedule: suggestedReschedule ?? undefined,
      };
      this.emitBlockedEvent(context, result);
      return result;
    }

    return {
      allowed: true,
      reason: 'All scheduling constraints satisfied',
    };
  }

  /**
   * Check if the timestamp falls within working hours for the target.
   * @param targetType The target entity type
   * @param targetId The target entity ID
   * @param timestamp The timestamp to check
   * @param timezone The timezone for time calculations
   */
  async isWithinWorkingHours(
    targetType: BindingTargetType,
    targetId: string,
    timestamp: Date,
    timezone: string,
  ): Promise<boolean> {
    const result = await this.checkWorkingHours(targetType, targetId, timestamp, timezone);
    return result.allowed;
  }

  /**
   * Check if the given date is a holiday in the specified region.
   * @param timestamp The date to check
   * @param regionScope Optional region filter for geographic scoping
   */
  async isHoliday(timestamp: Date, regionScope?: RegionFilter): Promise<boolean> {
    const holidays = await this.calendarEventRepository.findHolidaysForDate(
      timestamp,
      regionScope,
    );
    return holidays.length > 0;
  }

  /**
   * Check if the target is in a blackout period at the given time.
   * @param targetType The target entity type
   * @param targetId The target entity ID
   * @param timestamp The timestamp to check
   */
  async isBlackoutPeriod(
    targetType: BindingTargetType,
    targetId: string,
    timestamp: Date,
  ): Promise<boolean> {
    const result = await this.checkBlackoutPeriod(targetType, targetId, timestamp);
    return !result.allowed;
  }

  /**
   * Check if there's an active override for the target at the given time.
   * @param targetScope The target scope level
   * @param targetScopeId The target scope ID
   * @param timestamp The timestamp to check
   * @param overrideType Type of override to check for ('ALLOW' for permission overrides)
   */
  async hasActiveOverride(
    targetScope: CalendarScope,
    targetScopeId: string,
    timestamp: Date,
    overrideType: 'ALLOW' | 'BLOCK' | string,
  ): Promise<boolean> {
    const overrides = await this.calendarBindingService.getActiveOverrides(
      targetScope,
      targetScopeId,
      timestamp,
    );

    if (overrideType === 'ALLOW') {
      return overrides.some(
        (o) =>
          o.exceptionType === 'ALLOW_ON_HOLIDAY' ||
          o.exceptionType === 'EMERGENCY_OPEN' ||
          o.exceptionType === 'EXTENDED_HOURS',
      );
    }

    return overrides.some((o) => o.exceptionType === overrideType);
  }

  /**
   * Find the next available time slot for scheduling.
   * Searches up to MAX_SEARCH_DAYS (7) days ahead.
   *
   * @param targetType The target entity type
   * @param targetId The target entity ID
   * @param fromTimestamp Starting timestamp for the search
   * @param timezone The timezone for time calculations
   * @param regionFilter Optional region filter for holiday checks
   * @returns The next valid time, or null if none found within search window
   */
  async suggestNextAvailableTime(
    targetType: BindingTargetType,
    targetId: string,
    fromTimestamp: Date,
    timezone: string,
    regionFilter?: RegionFilter,
    context?: ConstraintContext,
  ): Promise<Date | null> {
    let currentTime = DateTime.fromJSDate(fromTimestamp, { zone: timezone });
    const maxSearchDate = currentTime.plus({ days: MAX_SEARCH_DAYS });

    while (currentTime < maxSearchDate) {
      const jsDate = currentTime.toJSDate();

      // Skip holidays
      const isHolidayDay = await this.isHoliday(jsDate, regionFilter);
      if (isHolidayDay) {
        currentTime = currentTime.plus({ days: 1 }).startOf('day');
        continue;
      }

      // Skip blackout periods
      const isBlackout = await this.isBlackoutPeriod(targetType, targetId, jsDate);
      if (isBlackout) {
        currentTime = currentTime.plus({ days: 1 }).startOf('day');
        continue;
      }

      // Find next working hour window
      const nextWorkingTime = await this.findNextWorkingTime(
        targetType,
        targetId,
        currentTime,
        timezone,
        context,
      );

      if (nextWorkingTime) {
        return nextWorkingTime;
      }

      // Move to next day if no working time found today
      currentTime = currentTime.plus({ days: 1 }).startOf('day');
    }

    return null;
  }

  private async checkHoliday(
    timestamp: Date,
    regionFilter?: RegionFilter,
  ): Promise<ConstraintResult> {
    const holidays = await this.calendarEventRepository.findHolidaysForDate(
      timestamp,
      regionFilter,
    );

    if (holidays.length > 0) {
      const holiday = holidays[0];
      return {
        allowed: false,
        reason: `Public holiday: ${holiday.title}`,
        blockedBy: {
          type: 'HOLIDAY' as BlockedByType,
          name: holiday.title,
          id: holiday.id,
        },
      };
    }

    return { allowed: true, reason: 'Not a holiday' };
  }

  private async checkBlackoutPeriod(
    targetType: BindingTargetType,
    targetId: string,
    timestamp: Date,
    context?: ConstraintContext,
  ): Promise<ConstraintResult> {
    const inheritanceContext = this.buildInheritanceContext(targetType, targetId, context);
    const resolvedBindings = await this.calendarBindingService.resolveEffectiveCalendars(
      targetType,
      targetId,
      inheritanceContext,
    );

    for (const resolved of resolvedBindings) {
      // Check BLACKOUT rules
      const blackoutRules = await this.calendarRuleRepo.find({
        where: {
          calendarId: resolved.binding.calendarId,
          ruleType: CalendarRuleType.BLACKOUT,
          isActive: true,
        },
      });

      for (const rule of blackoutRules) {
        if (this.isTimestampInRuleRange(timestamp, rule.conditions)) {
          return {
            allowed: false,
            reason: `Blackout period: ${this.getRuleDescription(rule.conditions)}`,
            blockedBy: {
              type: 'BLACKOUT' as BlockedByType,
              name: this.getRuleDescription(rule.conditions),
              id: rule.id,
            },
          };
        }
      }

      // Check CLOSURE rules
      const closureRules = await this.calendarRuleRepo.find({
        where: {
          calendarId: resolved.binding.calendarId,
          ruleType: CalendarRuleType.CLOSURE,
          isActive: true,
        },
      });

      for (const rule of closureRules) {
        if (this.isTimestampInRuleRange(timestamp, rule.conditions)) {
          return {
            allowed: false,
            reason: `Closure: ${this.getRuleDescription(rule.conditions)}`,
            blockedBy: {
              type: 'CLOSURE' as BlockedByType,
              name: this.getRuleDescription(rule.conditions),
              id: rule.id,
            },
          };
        }
      }
    }

    return { allowed: true, reason: 'No blackout or closure periods' };
  }

  private async checkWorkingHours(
    targetType: BindingTargetType,
    targetId: string,
    timestamp: Date,
    timezone: string,
    context?: ConstraintContext,
  ): Promise<ConstraintResult> {
    const inheritanceContext = this.buildInheritanceContext(targetType, targetId, context);
    const resolvedBindings = await this.calendarBindingService.resolveEffectiveCalendars(
      targetType,
      targetId,
      inheritanceContext,
    );

    if (resolvedBindings.length === 0) {
      return { allowed: true, reason: 'No calendar restrictions configured' };
    }

    // Check each calendar in priority order
    for (const resolved of resolvedBindings) {
      try {
        const timeWindows = await this.calendarService.getEffectiveTimeWindows(
          resolved.binding.calendarId,
          timestamp,
        );

        if (timeWindows.length === 0) {
          continue;
        }

        const dt = DateTime.fromJSDate(timestamp, { zone: timezone });
        const timeStr = this.formatTimeString(dt.hour, dt.minute, dt.second);

        for (const window of timeWindows) {
          if (this.isTimeInWindow(timeStr, window.startTime, window.endTime)) {
            return { allowed: true, reason: 'Within working hours' };
          }
        }

        return {
          allowed: false,
          reason: 'Outside working hours',
          blockedBy: {
            type: 'OUTSIDE_HOURS' as BlockedByType,
            name: 'Working hours restriction',
            id: resolved.binding.calendarId,
          },
        };
      } catch {
        continue;
      }
    }

    return { allowed: true, reason: 'No time window restrictions configured' };
  }

  private async findNextWorkingTime(
    targetType: BindingTargetType,
    targetId: string,
    currentTime: DateTime,
    _timezone: string,
    context?: ConstraintContext,
  ): Promise<Date | null> {
    const inheritanceContext = this.buildInheritanceContext(targetType, targetId, context);
    const resolvedBindings = await this.calendarBindingService.resolveEffectiveCalendars(
      targetType,
      targetId,
      inheritanceContext,
    );

    if (resolvedBindings.length === 0) {
      return currentTime.toJSDate();
    }

    for (const resolved of resolvedBindings) {
      try {
        const timeWindows = await this.calendarService.getEffectiveTimeWindows(
          resolved.binding.calendarId,
          currentTime.toJSDate(),
        );

        if (timeWindows.length === 0) {
          continue;
        }

        const timeStr = this.formatTimeString(
          currentTime.hour,
          currentTime.minute,
          currentTime.second,
        );

        // Sort windows by start time
        const sortedWindows = [...timeWindows].sort((a, b) =>
          a.startTime.localeCompare(b.startTime),
        );

        for (const window of sortedWindows) {
          // If current time is before window start, return window start
          if (timeStr < window.startTime) {
            const [hours, minutes, seconds] = window.startTime.split(':').map(Number);
            return currentTime
              .set({ hour: hours, minute: minutes, second: seconds || 0 })
              .toJSDate();
          }

          // If current time is within window, return current time
          if (this.isTimeInWindow(timeStr, window.startTime, window.endTime)) {
            return currentTime.toJSDate();
          }
        }

        // Current time is after all windows - no valid time today
        return null;
      } catch {
        continue;
      }
    }

    return currentTime.toJSDate();
  }

  private formatTimeString(hour: number, minute: number, second: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  }

  private isTimeInWindow(time: string, start: string, end: string): boolean {
    // Handle midnight crossing: if end < start, the window spans midnight
    // e.g., 22:00 to 06:00 means "from 22:00 until midnight, then from midnight until 06:00"
    if (end < start) {
      return time >= start || time <= end;
    }
    return time >= start && time <= end;
  }

  private isTimestampInRuleRange(
    timestamp: Date,
    conditions: Record<string, unknown>,
  ): boolean {
    const startDate = conditions.startDate as string | undefined;
    const endDate = conditions.endDate as string | undefined;

    if (!startDate || !endDate) {
      return false;
    }

    const ts = timestamp.toISOString().split('T')[0];
    return ts >= startDate && ts <= endDate;
  }

  private getRuleDescription(conditions: Record<string, unknown>): string {
    const reason = conditions.reason as string | undefined;
    if (reason) {
      return reason;
    }

    const startDate = conditions.startDate as string | undefined;
    const endDate = conditions.endDate as string | undefined;
    if (startDate && endDate) {
      return `${startDate} to ${endDate}`;
    }

    return 'Configured rule';
  }

  private extractRegionFilter(metadata?: Record<string, unknown>): RegionFilter | undefined {
    if (!metadata?.region) {
      return undefined;
    }

    const region = metadata.region as Record<string, unknown>;
    return {
      country: region.country as string | undefined,
      administrativeArea: region.administrativeArea as string | undefined,
      locality: region.locality as string | undefined,
    };
  }

  private buildInheritanceContext(
    targetType: BindingTargetType,
    targetId: string,
    context?: ConstraintContext,
  ): InheritanceContext {
    const result: InheritanceContext = {};

    // If context provides hierarchy IDs, use them for full inheritance resolution
    if (context?.workspaceId) result.workspaceId = context.workspaceId;
    if (context?.businessId) result.businessId = context.businessId;
    if (context?.saccoId) result.saccoId = context.saccoId;
    if (context?.riderId) result.riderId = context.riderId;

    // Always ensure the primary target ID is set based on targetType
    switch (targetType) {
      case BindingTargetType.RIDER:
        result.riderId = targetId;
        break;
      case BindingTargetType.BUSINESS:
        result.businessId = targetId;
        break;
      case BindingTargetType.SACCO:
        result.saccoId = targetId;
        break;
      case BindingTargetType.WORKSPACE:
        result.workspaceId = targetId;
        break;
    }

    return result;
  }

  private mapTargetTypeToScope(targetType: BindingTargetType): CalendarScope {
    switch (targetType) {
      case BindingTargetType.RIDER:
        return CalendarScope.RIDER;
      case BindingTargetType.BUSINESS:
        return CalendarScope.BUSINESS;
      case BindingTargetType.SACCO:
        return CalendarScope.SACCO;
      case BindingTargetType.WORKSPACE:
        return CalendarScope.NATIONAL;
      default:
        return CalendarScope.GLOBAL;
    }
  }

  private emitBlockedEvent(
    context: ConstraintContext,
    result: ConstraintResult,
  ): void {
    if (!result.blockedBy) return;

    const event = new ConstraintBlockedActionEventV1({
      targetType: context.targetType,
      targetId: context.targetId,
      operationType: context.operationType,
      blockedByType: result.blockedBy.type,
      blockedByName: result.blockedBy.name,
      blockedById: result.blockedBy.id,
      reason: result.reason,
      timestamp: context.timestamp,
      suggestedReschedule: result.suggestedReschedule ?? null,
    });

    this.eventBusService.publish(NatsSubjects.Calendar.CONSTRAINT_BLOCKED_V1, event).catch((publishError: unknown) => {
      const err = publishError instanceof Error ? publishError : new Error(String(publishError));
      this.logger.warn(`Failed to publish ConstraintBlockedActionEventV1: ${err.message}`);
    });
  }
}
