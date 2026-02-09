import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  BindingTargetType,
  CalendarRuleType,
  CalendarScope,
  PolicyEffect,
  PolicyScope,
} from '@zanafleet/contracts';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';

import { CalendarBindingService } from './calendar-binding.service';
import { SchedulingConstraintService } from './scheduling-constraint.service';

/**
 * Calendar policy context containing evaluated calendar state flags.
 * Used to enrich policy evaluation with time-based constraints.
 */
export interface CalendarPolicyContext {
  /** Whether the timestamp falls on a holiday */
  isHoliday: boolean;
  /** Whether the timestamp is during peak hours (typically higher demand periods) */
  isPeakHour: boolean;
  /** Whether the timestamp is within configured working hours */
  isWithinWorkingHours: boolean;
  /** Whether the timestamp falls within a blackout period */
  isBlackoutPeriod: boolean;
  /** Whether an active override allows delivery during normally blocked periods */
  hasActiveOverride: boolean;
  /** IDs of calendars that contributed to this context */
  effectiveCalendarIds: string[];
  /** Active calendar events affecting this timestamp */
  activeEvents: Array<{ eventId: string; eventType: string; title: string }>;
  /** Computed surge multiplier based on calendar conditions */
  surgeMultiplier: number;
  /** Timestamp when this context was evaluated */
  evaluatedAt: Date;
  /** Timezone used for evaluation */
  timezone: string;
}

/**
 * Template for generating policies from calendar rules.
 */
export interface PolicyTemplate {
  /** Name for the generated policy */
  name: string;
  /** Description of the policy */
  description?: string;
  /** Policy effect when conditions match */
  effect: PolicyEffect;
  /** Policy scope level */
  scope: PolicyScope;
  /** Priority for conflict resolution (higher wins) */
  priority: number;
  /** Additional conditions to apply */
  conditions?: Record<string, unknown>;
  /** Metadata to attach to the policy */
  metadata?: Record<string, unknown>;
}

/**
 * Result of delivery allowed check.
 */
export interface AllowedResult {
  /** Whether delivery is allowed */
  allowed: boolean;
  /** Reason for blocking if not allowed */
  reason?: string;
  /** Type of block if not allowed */
  blockType?: 'HOLIDAY' | 'BLACKOUT' | 'OUTSIDE_WORKING_HOURS' | 'POLICY_BLOCK';
  /** Suggested next available time if blocked */
  suggestedNextSlot?: Date | null;
  /** Applied surge multiplier */
  surgeMultiplier: number;
  /** Calendar context used for evaluation */
  context: CalendarPolicyContext;
}

/**
 * Result of policy creation from calendar rule.
 */
export interface PolicyCreationResult {
  /** Whether policy was created successfully */
  success: boolean;
  /** ID of the created policy */
  policyId?: string;
  /** Error message if creation failed */
  error?: string;
}

/**
 * Cache entry for calendar-policy bindings.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Configuration for the CalendarPolicyBridge.
 */
export interface CalendarPolicyBridgeConfig {
  /** Cache TTL in milliseconds */
  cacheTtlMs: number;
  /** Default timezone for evaluations */
  defaultTimezone: string;
  /** Peak hour definitions (24h format) */
  peakHours: { start: number; end: number }[];
  /** Base surge multiplier for holidays */
  holidaySurgeMultiplier: number;
  /** Base surge multiplier for peak hours */
  peakHourSurgeMultiplier: number;
  /** Off-peak discount multiplier */
  offPeakMultiplier: number;
}

const DEFAULT_CONFIG: CalendarPolicyBridgeConfig = {
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes
  defaultTimezone: 'Africa/Nairobi',
  peakHours: [
    { start: 7, end: 9 },   // Morning rush
    { start: 12, end: 14 }, // Lunch rush
    { start: 17, end: 20 }, // Evening rush
  ],
  holidaySurgeMultiplier: 1.25,
  peakHourSurgeMultiplier: 1.15,
  offPeakMultiplier: 0.9,
};

/**
 * CalendarPolicyBridge Service
 *
 * Bridges calendar constraints to delivery policy rules.
 * Connects SchedulingConstraintService results to PolicyEvaluationEngineService
 * for unified time-based delivery rule evaluation.
 *
 * Supports:
 * - Holiday blocks with surge pricing
 * - Peak-hour surge multipliers
 * - Business-closed windows
 * - Blackout period enforcement
 * - Dynamic policy creation from calendar rules
 */
@Injectable()
export class CalendarPolicyBridgeService {
  private readonly logger = new Logger(CalendarPolicyBridgeService.name);
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private config: CalendarPolicyBridgeConfig = { ...DEFAULT_CONFIG };

  constructor(
    private readonly schedulingConstraintService: SchedulingConstraintService,
    private readonly calendarBindingService: CalendarBindingService,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  /**
   * Get calendar policy context for a specific timestamp and target.
   * Evaluates all calendar constraints and returns a unified context.
   */
  async getCalendarPolicyContext(
    timestamp: Date,
    targetType: BindingTargetType,
    targetId: string,
    timezone?: string,
  ): Promise<CalendarPolicyContext> {
    const tz = timezone ?? this.config.defaultTimezone;
    const cacheKey = this.buildCacheKey('context', { timestamp, targetType, targetId, tz });
    const cached = this.getFromCache<CalendarPolicyContext>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for calendar context: ${cacheKey}`);
      return cached;
    }

    const [isHoliday, isWithinWorkingHours, isBlackoutPeriod, bindings, hasOverride] =
      await Promise.all([
        this.schedulingConstraintService.isHoliday(timestamp),
        this.schedulingConstraintService.isWithinWorkingHours(targetType, targetId, timestamp, tz),
        this.schedulingConstraintService.isBlackoutPeriod(targetType, targetId, timestamp),
        this.calendarBindingService.getBindingsForTarget(targetType, targetId),
        this.checkActiveOverride(targetType, targetId, timestamp),
      ]);

    const isPeakHour = this.isPeakHour(timestamp, tz);
    const surgeMultiplier = this.calculateSurgeMultiplier(isHoliday, isPeakHour, isWithinWorkingHours);

    const context: CalendarPolicyContext = {
      isHoliday,
      isPeakHour,
      isWithinWorkingHours,
      isBlackoutPeriod,
      hasActiveOverride: hasOverride,
      effectiveCalendarIds: bindings.map((b) => b.calendarId),
      activeEvents: [],
      surgeMultiplier,
      evaluatedAt: new Date(),
      timezone: tz,
    };

    this.setCache(cacheKey, context);

    return context;
  }

  /**
   * Create a policy from a calendar rule using a policy template.
   * Emits Calendar.PolicyBinding.CreatedV1 event on success.
   */
  async createPolicyFromCalendarRule(
    ruleId: string,
    template: PolicyTemplate,
  ): Promise<PolicyCreationResult> {
    const policyId = uuidv4();

    this.logger.log(`Creating policy ${policyId} from calendar rule ${ruleId}`);

    try {
      const policyDefinition = {
        policyId,
        name: template.name,
        description: template.description,
        effect: template.effect,
        scope: template.scope,
        priority: template.priority,
        conditions: template.conditions ?? {},
        metadata: {
          ...template.metadata,
          sourceRuleId: ruleId,
          createdFromCalendarRule: true,
          createdAt: new Date().toISOString(),
        },
      };

      await this.emitPolicyBindingCreatedEvent(policyId, ruleId, policyDefinition);

      this.logger.log(`Policy ${policyId} created successfully from rule ${ruleId}`);

      return {
        success: true,
        policyId,
      };
    } catch (error) {
      this.logger.error(`Failed to create policy from rule ${ruleId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Policy creation failed',
      };
    }
  }

  /**
   * Check if delivery is allowed at a specific timestamp for a target.
   * Evaluates calendar constraints and returns detailed result.
   */
  async isDeliveryAllowed(
    timestamp: Date,
    targetType: BindingTargetType,
    targetId: string,
    timezone?: string,
  ): Promise<AllowedResult> {
    const tz = timezone ?? this.config.defaultTimezone;
    const context = await this.getCalendarPolicyContext(timestamp, targetType, targetId, tz);

    if (context.isBlackoutPeriod && !context.hasActiveOverride) {
      const suggestedNextSlot = await this.getNextAvailableSlot(timestamp, targetType, targetId, tz);
      return {
        allowed: false,
        reason: 'Delivery blocked during blackout period',
        blockType: 'BLACKOUT',
        suggestedNextSlot,
        surgeMultiplier: context.surgeMultiplier,
        context,
      };
    }

    if (context.isHoliday && !context.hasActiveOverride) {
      const suggestedNextSlot = await this.getNextAvailableSlot(timestamp, targetType, targetId, tz);
      return {
        allowed: false,
        reason: 'Delivery blocked on holiday',
        blockType: 'HOLIDAY',
        suggestedNextSlot,
        surgeMultiplier: context.surgeMultiplier,
        context,
      };
    }

    if (!context.isWithinWorkingHours && !context.hasActiveOverride) {
      const suggestedNextSlot = await this.getNextAvailableSlot(timestamp, targetType, targetId, tz);
      return {
        allowed: false,
        reason: 'Delivery blocked outside working hours',
        blockType: 'OUTSIDE_WORKING_HOURS',
        suggestedNextSlot,
        surgeMultiplier: context.surgeMultiplier,
        context,
      };
    }

    return {
      allowed: true,
      surgeMultiplier: context.surgeMultiplier,
      context,
    };
  }

  /**
   * Get surge multiplier for a specific timestamp.
   * Considers holidays, peak hours, and regional factors.
   */
  async getSurgeMultiplier(
    timestamp: Date,
    regionId?: string,
    timezone?: string,
  ): Promise<number> {
    const tz = timezone ?? this.config.defaultTimezone;
    const cacheKey = this.buildCacheKey('surge', { timestamp, regionId, tz });
    const cached = this.getFromCache<number>(cacheKey);

    if (cached !== null) {
      return cached;
    }

    const isHoliday = await this.schedulingConstraintService.isHoliday(
      timestamp,
      regionId ? { country: regionId } : undefined,
    );

    const isPeakHour = this.isPeakHour(timestamp, tz);
    const multiplier = this.calculateSurgeMultiplier(isHoliday, isPeakHour, true);

    this.setCache(cacheKey, multiplier);

    return multiplier;
  }

  /**
   * Get the next available delivery slot from a given time.
   * Uses SchedulingConstraintService to find the next valid time.
   */
  async getNextAvailableSlot(
    fromTime: Date,
    targetType: BindingTargetType,
    targetId: string,
    timezone?: string,
  ): Promise<Date | null> {
    const tz = timezone ?? this.config.defaultTimezone;

    return this.schedulingConstraintService.suggestNextAvailableTime(
      targetType,
      targetId,
      fromTime,
      tz,
    );
  }

  /**
   * Invalidate cache entries for a specific target.
   * Called when calendar bindings or rules change.
   */
  invalidateCacheForTarget(targetType: BindingTargetType, targetId: string): void {
    const targetTypePattern = `"targetType":"${targetType}"`;
    const targetIdPattern = `"targetId":"${targetId}"`;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.includes(targetTypePattern) && key.includes(targetIdPattern)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    this.logger.debug(`Invalidated ${keysToDelete.length} cache entries for ${targetType}:${targetId}`);
  }

  /**
   * Clear all cached entries.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update configuration.
   */
  updateConfig(config: Partial<CalendarPolicyBridgeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): CalendarPolicyBridgeConfig {
    return { ...this.config };
  }

  /**
   * Activate a policy binding and emit activation event.
   */
  async activatePolicyBinding(policyId: string, ruleId: string): Promise<void> {
    this.logger.log(`Activating policy binding: policy=${policyId}, rule=${ruleId}`);

    await this.emitPolicyBindingActivatedEvent(policyId, ruleId);
  }

  /**
   * Map calendar rule type to policy effect.
   */
  mapRuleTypeToEffect(ruleType: CalendarRuleType): PolicyEffect {
    switch (ruleType) {
      case CalendarRuleType.BLACKOUT:
      case CalendarRuleType.CLOSURE:
      case CalendarRuleType.HOLIDAY:
        return PolicyEffect.BLOCK;
      case CalendarRuleType.WORKING_HOURS:
      case CalendarRuleType.WEEKEND:
        return PolicyEffect.ALLOW;
      default:
        return PolicyEffect.ALLOW;
    }
  }

  /**
   * Map calendar scope to policy scope.
   */
  mapCalendarScopeToPolicy(calendarScope: CalendarScope): PolicyScope {
    const mapping: Record<CalendarScope, PolicyScope> = {
      [CalendarScope.GLOBAL]: PolicyScope.GLOBAL,
      [CalendarScope.NATIONAL]: PolicyScope.NATIONAL,
      [CalendarScope.SACCO]: PolicyScope.SACCO,
      [CalendarScope.BUSINESS]: PolicyScope.BUSINESS,
      [CalendarScope.RIDER]: PolicyScope.RIDER,
    };
    return mapping[calendarScope] ?? PolicyScope.GLOBAL;
  }

  private isPeakHour(timestamp: Date, _timezone: string): boolean {
    const hour = timestamp.getUTCHours();

    return this.config.peakHours.some(
      (peak) => hour >= peak.start && hour < peak.end,
    );
  }

  private calculateSurgeMultiplier(
    isHoliday: boolean,
    isPeakHour: boolean,
    isWithinWorkingHours: boolean,
  ): number {
    let multiplier = 1.0;

    if (isHoliday) {
      multiplier = Math.max(multiplier, this.config.holidaySurgeMultiplier);
    }

    if (isPeakHour) {
      multiplier = Math.max(multiplier, this.config.peakHourSurgeMultiplier);
    }

    if (!isPeakHour && isWithinWorkingHours && !isHoliday) {
      multiplier = this.config.offPeakMultiplier;
    }

    return Math.round(multiplier * 100) / 100;
  }

  private async checkActiveOverride(
    targetType: BindingTargetType,
    targetId: string,
    timestamp: Date,
  ): Promise<boolean> {
    const scope = this.mapTargetTypeToScope(targetType);

    const hasAllowOverride = await this.schedulingConstraintService.hasActiveOverride(
      scope,
      targetId,
      timestamp,
      'ALLOW',
    );

    return hasAllowOverride;
  }

  private mapTargetTypeToScope(targetType: BindingTargetType): CalendarScope {
    const mapping: Record<BindingTargetType, CalendarScope> = {
      [BindingTargetType.BUSINESS]: CalendarScope.BUSINESS,
      [BindingTargetType.SACCO]: CalendarScope.SACCO,
      [BindingTargetType.RIDER]: CalendarScope.RIDER,
      [BindingTargetType.WORKSPACE]: CalendarScope.GLOBAL,
    };
    return mapping[targetType] ?? CalendarScope.GLOBAL;
  }

  private buildCacheKey(prefix: string, params: unknown): string {
    return `${prefix}-${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  private setCache<T>(key: string, value: T): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + this.config.cacheTtlMs,
    };
    this.cache.set(key, entry);
  }

  private async emitPolicyBindingCreatedEvent(
    policyId: string,
    ruleId: string,
    policyDefinition: Record<string, unknown>,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Calendar.PolicyBinding.CreatedV1',
      aggregateId: policyId,
      aggregateType: 'CalendarPolicyBinding',
      payload: {
        policyId,
        sourceRuleId: ruleId,
        policyDefinition,
        createdAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
    };

    await this.eventBusService
      .publish(NatsSubjects.Calendar.POLICY_BINDING_CREATED_V1, event)
      .catch((error) => {
        this.logger.error(`Failed to publish PolicyBindingCreatedEvent: ${error.message}`);
      });
  }

  private async emitPolicyBindingActivatedEvent(
    policyId: string,
    ruleId: string,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Calendar.PolicyBinding.ActivatedV1',
      aggregateId: policyId,
      aggregateType: 'CalendarPolicyBinding',
      payload: {
        policyId,
        sourceRuleId: ruleId,
        activatedAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
    };

    await this.eventBusService
      .publish(NatsSubjects.Calendar.POLICY_BINDING_ACTIVATED_V1, event)
      .catch((error) => {
        this.logger.error(`Failed to publish PolicyBindingActivatedEvent: ${error.message}`);
      });
  }
}
