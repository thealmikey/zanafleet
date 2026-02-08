import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { BindingTargetType, CalendarEventType, CalendarScope } from '@zanafleet/contracts';

import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { SchedulingConstraintService } from '../../calendar/services/scheduling-constraint.service';
import { CalendarBindingService } from '../../calendar/services/calendar-binding.service';
import { CalendarEventRepository, RegionFilter } from '../../calendar/repositories/calendar-event.repository';
import {
  PolicyScope,
  PolicyEffect,
  EvaluationContext,
  PolicyDecision,
  EvaluatedPolicy,
  EvaluationResult,
  EvaluatedPolicyLogEntry,
} from '../dto';
import { PolicyEntity } from '../entities/policy.entity';
import { PolicyEvaluatedEventV1 } from '../events/policy-evaluated.event';
import { PolicyViolationDetectedEventV1 } from '../events/policy-violation-detected.event';
import { PolicyDecisionLogRepository } from '../repositories/policy-decision-log.repository';
import { PolicyRepository } from '../repositories/policy.repository';

import { JsonLogicEvaluatorService } from './json-logic-evaluator.service';

/**
 * Options for policy evaluation
 */
export interface EvaluationOptions {
  /** Whether to fail open (ALLOW) or fail closed (BLOCK) on errors. Defaults to true. */
  failOpen?: boolean;
  /** Optional request ID for correlation */
  requestId?: string;
  /** Optional correlation ID for tracing */
  correlationId?: string;
  /** Whether to enrich the context with calendar data before evaluation. Defaults to false. */
  enrichCalendarContext?: boolean;
}

/**
 * Internal structure for tracking matched policies during evaluation
 */
interface MatchedPolicy {
  policy: PolicyEntity;
  reason: string;
}

/**
 * PolicyEvaluationEngineService
 *
 * Core orchestration service that loads policies, evaluates them against
 * an evaluation context, resolves conflicts, and produces final decisions.
 *
 * Key behaviors:
 * - Fail-open by default for hot-path safety
 * - Async audit logging (does not block return)
 * - Async event publishing for observability
 * - Conflict resolution: scope specificity > priority > BLOCK precedence > createdAt
 */
@Injectable()
export class PolicyEvaluationEngineService {
  private readonly logger = new Logger(PolicyEvaluationEngineService.name);

  constructor(
    private readonly policyRepository: PolicyRepository,
    private readonly evaluator: JsonLogicEvaluatorService,
    private readonly decisionLogRepository: PolicyDecisionLogRepository,
    private readonly eventBus: EventBusService,
    @Optional() private readonly schedulingConstraintService?: SchedulingConstraintService,
    @Optional() private readonly calendarBindingService?: CalendarBindingService,
    @Optional() private readonly calendarEventRepository?: CalendarEventRepository
  ) {}

  /**
   * Evaluate policies for a given context and return the final decision.
   *
   * @param context - The evaluation context containing all relevant data
   * @param options - Optional evaluation configuration
   * @returns The evaluation result with final decision
   */
  async evaluate(
    context: EvaluationContext,
    options: EvaluationOptions = {}
  ): Promise<EvaluationResult> {
    const startTime = Date.now();
    const failOpen = options.failOpen ?? true;
    const requestId = options.requestId ?? randomUUID();

    try {
      // Optionally enrich with calendar context
      let enrichedContext = context;
      if (options.enrichCalendarContext) {
        enrichedContext = await this.enrichWithCalendarContext(context);
      }

      const policies = await this.loadApplicablePolicies(enrichedContext);

      const evaluatedPolicies: EvaluatedPolicy[] = [];
      const matchedPolicies: MatchedPolicy[] = [];
      const evaluatedPolicyLogs: EvaluatedPolicyLogEntry[] = [];

      for (const policy of policies) {
        const outcome = this.evaluator.evaluate(policy.conditions, enrichedContext);

        evaluatedPolicies.push({
          policyId: policy.id,
          matched: outcome.matched,
          priority: policy.priority,
          scope: policy.scope,
        });

        evaluatedPolicyLogs.push({
          policyId: policy.id,
          policyName: policy.name,
          scope: policy.scope,
          priority: policy.priority,
          matched: outcome.matched,
          matchReason: outcome.reason,
        });

        if (outcome.matched) {
          matchedPolicies.push({ policy, reason: outcome.reason });
        }
      }

      const finalDecision = this.resolveConflicts(matchedPolicies);
      const processingTimeMs = Date.now() - startTime;

      const result: EvaluationResult = {
        finalDecision,
        evaluatedPolicies,
        processingTimeMs,
        evaluationFailed: false,
      };

      this.logDecisionAsync(
        enrichedContext,
        result,
        evaluatedPolicyLogs,
        requestId,
        options.correlationId
      );

      this.publishEventAsync(enrichedContext, result, options.correlationId);

      return result;
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Policy evaluation failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);

      const result = failOpen
        ? this.createFailOpenResult(processingTimeMs, errorMessage)
        : this.createFailClosedResult(processingTimeMs, errorMessage);

      this.logDecisionAsync(context, result, [], requestId, options.correlationId);
      this.publishEventAsync(context, result, options.correlationId);

      return result;
    }
  }

  /**
   * Enrich the evaluation context with calendar data.
   * Resolves effective calendars, working hours, holidays, and overrides.
   *
   * @param context - The base evaluation context
   * @returns The enriched context with calendarContext populated
   */
  async enrichWithCalendarContext(context: EvaluationContext): Promise<EvaluationContext> {
    if (!this.schedulingConstraintService || !this.calendarBindingService || !this.calendarEventRepository) {
      this.logger.warn('Calendar services not available, skipping calendar enrichment');
      return context;
    }

    try {
      const { targetType, targetId } = this.determineCalendarTarget(context);
      const timestamp = context.timestamp;
      const timezone = context.timezone ?? 'UTC';

      // Get effective calendar bindings
      const resolvedBindings = await this.calendarBindingService.resolveEffectiveCalendars(
        targetType,
        targetId,
        {
          workspaceId: context.workspaceId,
          businessId: context.businessId,
          saccoId: context.saccoId,
          riderId: context.riderId,
        }
      );

      const effectiveCalendarIds = resolvedBindings.map((b) => b.binding.calendarId);

      // Check if within working hours
      const isWorkingHours = await this.schedulingConstraintService.isWithinWorkingHours(
        targetType,
        targetId,
        timestamp,
        timezone
      );

      // Check if holiday
      const regionFilter: RegionFilter | undefined = context.metadata?.region
        ? {
            country: (context.metadata.region as Record<string, string>).country,
            administrativeArea: (context.metadata.region as Record<string, string>).administrativeArea,
            locality: (context.metadata.region as Record<string, string>).locality,
          }
        : undefined;

      const isHoliday = await this.schedulingConstraintService.isHoliday(timestamp, regionFilter);

      // Get current day of week (0=Sunday, 6=Saturday)
      const dayOfWeek = timestamp.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Get active calendar events
      const startOfDay = new Date(timestamp);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(timestamp);
      endOfDay.setHours(23, 59, 59, 999);

      const activeEventsEntities = await this.calendarEventRepository.findActiveEventsForDateRange(
        startOfDay,
        endOfDay,
        regionFilter
      );

      const activeEvents = activeEventsEntities.map((e) => ({
        eventId: e.id,
        eventType: e.eventType as CalendarEventType,
        title: e.title,
      }));

      // Get active overrides
      const overrides = await this.calendarBindingService.getActiveOverridesWithInheritance(
        {
          workspaceId: context.workspaceId,
          businessId: context.businessId,
          saccoId: context.saccoId,
          riderId: context.riderId,
        },
        timestamp
      );

      const activeOverrides = overrides.map((o) => ({
        overrideId: o.overrideId,
        exceptionType: o.exceptionType,
      }));

      return {
        ...context,
        calendarContext: {
          effectiveCalendarIds,
          isHoliday,
          isWorkingHours,
          isWeekend,
          currentDayOfWeek: dayOfWeek,
          activeEvents,
          activeOverrides,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to enrich calendar context: ${error instanceof Error ? error.message : String(error)}`
      );
      return context;
    }
  }

  /**
   * Determine the calendar target type and ID from the evaluation context.
   */
  private determineCalendarTarget(context: EvaluationContext): { targetType: BindingTargetType; targetId: string } {
    if (context.riderId) {
      return { targetType: BindingTargetType.RIDER, targetId: context.riderId };
    }
    if (context.businessId) {
      return { targetType: BindingTargetType.BUSINESS, targetId: context.businessId };
    }
    if (context.saccoId) {
      return { targetType: BindingTargetType.SACCO, targetId: context.saccoId };
    }
    return { targetType: BindingTargetType.WORKSPACE, targetId: context.workspaceId };
  }

  /**
   * Map subject type to CalendarScope for override lookups.
   */
  private mapSubjectTypeToCalendarScope(subjectType: string): CalendarScope {
    switch (subjectType) {
      case 'Rider':
        return CalendarScope.RIDER;
      case 'Business':
        return CalendarScope.BUSINESS;
      case 'Sacco':
        return CalendarScope.SACCO;
      default:
        return CalendarScope.GLOBAL;
    }
  }

  /**
   * Load all applicable policies for the given context.
   * Filters by trigger and scope target IDs.
   */
  private async loadApplicablePolicies(context: EvaluationContext): Promise<PolicyEntity[]> {
    const scopeTargetIds: string[] = [];

    if (context.riderId) scopeTargetIds.push(context.riderId);
    if (context.businessId) scopeTargetIds.push(context.businessId);
    if (context.saccoId) scopeTargetIds.push(context.saccoId);

    return this.policyRepository.findActivePoliciesForTrigger(context.trigger, {
      scopeTargetIds: scopeTargetIds.length > 0 ? scopeTargetIds : undefined,
      now: context.timestamp,
    });
  }

  /**
   * Resolve conflicts among matched policies.
   *
   * Sort order (highest wins):
   * 1. Scope specificity: RIDER(5) > BUSINESS(4) > SACCO(3) > NATIONAL(2) > GLOBAL(1)
   * 2. Priority (higher number = more important)
   * 3. BLOCK effect takes precedence over ALLOW at same level
   * 4. createdAt ascending (oldest wins ties)
   */
  private resolveConflicts(matchedPolicies: MatchedPolicy[]): PolicyDecision {
    if (matchedPolicies.length === 0) {
      return {
        effect: PolicyEffect.ALLOW,
        policyId: '',
        policyName: 'Default Allow',
        reason: 'No applicable policies matched - defaulting to ALLOW',
      };
    }

    const sorted = [...matchedPolicies].sort((a, b) => {
      const scopeDiff = this.scopePriority(b.policy.scope) - this.scopePriority(a.policy.scope);
      if (scopeDiff !== 0) return scopeDiff;

      const priorityDiff = b.policy.priority - a.policy.priority;
      if (priorityDiff !== 0) return priorityDiff;

      if (a.policy.effect === PolicyEffect.BLOCK && b.policy.effect !== PolicyEffect.BLOCK) {
        return -1;
      }
      if (b.policy.effect === PolicyEffect.BLOCK && a.policy.effect !== PolicyEffect.BLOCK) {
        return 1;
      }

      return a.policy.createdAt.getTime() - b.policy.createdAt.getTime();
    });

    const winner = sorted[0];

    return {
      effect: winner.policy.effect,
      policyId: winner.policy.id,
      policyName: winner.policy.name,
      reason: winner.reason,
      modifications: winner.policy.modifications ?? undefined,
      requiresApprovalFrom: winner.policy.approvalRoles ?? undefined,
    };
  }

  /**
   * Get the priority value for a scope.
   * Higher values indicate more specific scopes.
   */
  private scopePriority(scope: PolicyScope): number {
    const priorities: Record<PolicyScope, number> = {
      [PolicyScope.RIDER]: 5,
      [PolicyScope.BUSINESS]: 4,
      [PolicyScope.SACCO]: 3,
      [PolicyScope.NATIONAL]: 2,
      [PolicyScope.GLOBAL]: 1,
    };
    return priorities[scope] ?? 0;
  }

  /**
   * Create a fail-open result (ALLOW when evaluation fails).
   */
  private createFailOpenResult(processingTimeMs: number, errorMessage: string): EvaluationResult {
    return {
      finalDecision: {
        effect: PolicyEffect.ALLOW,
        policyId: '',
        policyName: 'Fail-Open Default',
        reason: `Policy evaluation failed - defaulting to ALLOW: ${errorMessage}`,
      },
      evaluatedPolicies: [],
      processingTimeMs,
      evaluationFailed: true,
      failMode: 'open',
    };
  }

  /**
   * Create a fail-closed result (BLOCK when evaluation fails).
   */
  private createFailClosedResult(processingTimeMs: number, errorMessage: string): EvaluationResult {
    return {
      finalDecision: {
        effect: PolicyEffect.BLOCK,
        policyId: '',
        policyName: 'Fail-Closed Default',
        reason: `Policy evaluation failed - blocking request: ${errorMessage}`,
      },
      evaluatedPolicies: [],
      processingTimeMs,
      evaluationFailed: true,
      failMode: 'closed',
    };
  }

  /**
   * Determine the subject type and ID from context.
   */
  private determineSubject(context: EvaluationContext): { subjectType: string; subjectId: string } {
    if (context.deliveryId) {
      return { subjectType: 'Delivery', subjectId: context.deliveryId };
    }
    if (context.riderId) {
      return { subjectType: 'Rider', subjectId: context.riderId };
    }
    if (context.businessId) {
      return { subjectType: 'Business', subjectId: context.businessId };
    }
    return { subjectType: 'Workspace', subjectId: context.workspaceId };
  }

  /**
   * Log the decision asynchronously (does not block return).
   */
  private logDecisionAsync(
    context: EvaluationContext,
    result: EvaluationResult,
    evaluatedPolicyLogs: EvaluatedPolicyLogEntry[],
    requestId: string,
    correlationId?: string
  ): void {
    const { subjectType, subjectId } = this.determineSubject(context);

    const logData = {
      logId: randomUUID(),
      requestId,
      correlationId: correlationId ?? null,
      trigger: context.trigger,
      workspaceId: context.workspaceId,
      actorId: context.actorId ?? null,
      subjectType,
      subjectId,
      contextSnapshot: context,
      evaluatedPolicies: evaluatedPolicyLogs,
      finalEffect: result.finalDecision.effect,
      finalPolicyId: result.finalDecision.policyId || null,
      finalReason: result.finalDecision.reason,
      modifications: result.finalDecision.modifications ?? null,
      processingTimeMs: result.processingTimeMs,
      evaluationFailed: result.evaluationFailed,
      failMode: result.failMode ?? null,
      createdAt: new Date(),
    };

    this.decisionLogRepository.create(logData).catch((err) => {
      this.logger.error(
        `Failed to log policy decision: ${err instanceof Error ? err.message : String(err)}`
      );
    });
  }

  /**
   * Publish the evaluation event asynchronously (does not block return).
   */
  private publishEventAsync(
    context: EvaluationContext,
    result: EvaluationResult,
    correlationId?: string
  ): void {
    const { subjectType, subjectId } = this.determineSubject(context);

    const event = new PolicyEvaluatedEventV1({
      eventId: randomUUID(),
      trigger: context.trigger,
      workspaceId: context.workspaceId,
      subjectType,
      subjectId,
      finalEffect: result.finalDecision.effect,
      finalPolicyId: result.finalDecision.policyId || null,
      finalReason: result.finalDecision.reason,
      evaluatedPolicyCount: result.evaluatedPolicies.length,
      matchedPolicyCount: result.evaluatedPolicies.filter((p) => p.matched).length,
      processingTimeMs: result.processingTimeMs,
      evaluationFailed: result.evaluationFailed,
      failMode: result.failMode,
      correlationId,
    });

    this.eventBus.publishEvent(event).catch((err) => {
      this.logger.error(
        `Failed to publish policy event: ${err instanceof Error ? err.message : String(err)}`
      );
    });

    if (
      result.finalDecision.effect === PolicyEffect.BLOCK ||
      result.finalDecision.effect === PolicyEffect.REQUIRE_APPROVAL
    ) {
      this.publishViolationEventAsync(context, result, subjectType, subjectId, correlationId);
    }
  }

  /**
   * Publish a violation event asynchronously when policy results in BLOCK or REQUIRE_APPROVAL.
   */
  private publishViolationEventAsync(
    context: EvaluationContext,
    result: EvaluationResult,
    subjectType: string,
    subjectId: string,
    correlationId?: string
  ): void {
    const violationType =
      result.finalDecision.effect === PolicyEffect.BLOCK ? 'BLOCKED' : 'REQUIRES_APPROVAL';

    const violationEvent = new PolicyViolationDetectedEventV1({
      eventId: randomUUID(),
      policyId: result.finalDecision.policyId,
      policyName: result.finalDecision.policyName,
      violationType,
      trigger: context.trigger,
      workspaceId: context.workspaceId,
      subjectType,
      subjectId,
      reason: result.finalDecision.reason,
      effect: result.finalDecision.effect,
      correlationId,
    });

    this.eventBus.publishEvent(violationEvent).catch((err) => {
      this.logger.error(
        `Failed to publish policy violation event: ${err instanceof Error ? err.message : String(err)}`
      );
    });
  }
}
