import { Injectable, Logger, Optional } from '@nestjs/common';

import { PolicyEvaluationEngineService } from '@api/modules/policy/services/policy-evaluation-engine.service';
import { SchedulingConstraintService } from '@api/modules/calendar/services/scheduling-constraint.service';
import { BindingTargetType } from '@api/modules/calendar/dto';

/**
 * Context for retrieving pricing signals
 */
export interface PricingContext {
  workspaceId: string;
  businessId?: string;
  deliveryId?: string;
  riderId?: string;
  timestamp: Date;
  timezone: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Dynamic price adjustment from policy evaluation
 */
export interface DynamicAdjustment {
  type: 'SURGE' | 'DISCOUNT' | 'PREMIUM' | 'SUBSIDY';
  multiplier?: number;
  fixedAmount?: number;
  reason: string;
  policyId?: string;
}

/**
 * Pricing signals returned by the service
 */
export interface PricingSignals {
  surgeMultiplier: number;
  isOffPeak: boolean;
  isHoliday: boolean;
  dynamicAdjustments: DynamicAdjustment[];
  evaluatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * PricingSignalService
 * Consumes Policy and Calendar services to provide dynamic pricing signals
 * Gracefully degrades when services are unavailable
 */
@Injectable()
export class PricingSignalService {
  private readonly logger = new Logger(PricingSignalService.name);

  private readonly DEFAULT_SURGE_MULTIPLIER = 1.0;
  private readonly OFF_PEAK_DISCOUNT_MULTIPLIER = 0.9;
  private readonly HOLIDAY_SURGE_MULTIPLIER = 1.25;

  constructor(
    @Optional() private readonly policyEngine?: PolicyEvaluationEngineService,
    @Optional() private readonly schedulingConstraint?: SchedulingConstraintService,
  ) {
    if (!this.policyEngine) {
      this.logger.warn('PolicyEvaluationEngineService not available - policy-based pricing disabled');
    }
    if (!this.schedulingConstraint) {
      this.logger.warn('SchedulingConstraintService not available - calendar-based pricing disabled');
    }
  }

  async getPricingSignals(context: PricingContext): Promise<PricingSignals> {
    const evaluatedAt = new Date();
    const dynamicAdjustments: DynamicAdjustment[] = [];

    let surgeMultiplier = this.DEFAULT_SURGE_MULTIPLIER;
    let isOffPeak = false;
    let isHoliday = false;

    const [calendarSignals, policySignals] = await Promise.all([
      this.getCalendarSignals(context),
      this.getPolicySignals(context),
    ]);

    isOffPeak = calendarSignals.isOffPeak;
    isHoliday = calendarSignals.isHoliday;

    if (policySignals.surgeMultiplier !== 1.0) {
      surgeMultiplier = policySignals.surgeMultiplier;
      dynamicAdjustments.push({
        type: 'SURGE',
        multiplier: policySignals.surgeMultiplier,
        reason: 'Policy-driven demand/supply surge',
        policyId: policySignals.policyId,
      });
    }

    if (isHoliday && surgeMultiplier === this.DEFAULT_SURGE_MULTIPLIER) {
      surgeMultiplier = this.HOLIDAY_SURGE_MULTIPLIER;
      dynamicAdjustments.push({
        type: 'PREMIUM',
        multiplier: this.HOLIDAY_SURGE_MULTIPLIER,
        reason: 'Holiday premium pricing',
      });
    }

    if (isOffPeak && !isHoliday && surgeMultiplier <= this.DEFAULT_SURGE_MULTIPLIER) {
      surgeMultiplier = this.OFF_PEAK_DISCOUNT_MULTIPLIER;
      dynamicAdjustments.push({
        type: 'DISCOUNT',
        multiplier: this.OFF_PEAK_DISCOUNT_MULTIPLIER,
        reason: 'Off-peak discount',
      });
    }

    dynamicAdjustments.push(...policySignals.additionalAdjustments);

    this.logger.debug(
      `Pricing signals for workspace ${context.workspaceId}: surge=${surgeMultiplier}, offPeak=${isOffPeak}, holiday=${isHoliday}`,
    );

    return {
      surgeMultiplier,
      isOffPeak,
      isHoliday,
      dynamicAdjustments,
      evaluatedAt,
      metadata: {
        calendarAvailable: !!this.schedulingConstraint,
        policyAvailable: !!this.policyEngine,
      },
    };
  }

  private async getCalendarSignals(
    context: PricingContext,
  ): Promise<{ isOffPeak: boolean; isHoliday: boolean }> {
    if (!this.schedulingConstraint) {
      return { isOffPeak: false, isHoliday: false };
    }

    try {
      const [isWithinWorkingHours, isHoliday] = await Promise.all([
        this.schedulingConstraint.isWithinWorkingHours(
          BindingTargetType.BUSINESS,
          context.businessId ?? context.workspaceId,
          context.timestamp,
          context.timezone,
        ),
        this.schedulingConstraint.isHoliday(context.timestamp),
      ]);

      const isOffPeak = !isWithinWorkingHours;

      return { isOffPeak, isHoliday };
    } catch (error) {
      this.logger.error(
        `Failed to get calendar signals: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { isOffPeak: false, isHoliday: false };
    }
  }

  private async getPolicySignals(
    context: PricingContext,
  ): Promise<{
    surgeMultiplier: number;
    policyId?: string;
    additionalAdjustments: DynamicAdjustment[];
  }> {
    if (!this.policyEngine) {
      return {
        surgeMultiplier: this.DEFAULT_SURGE_MULTIPLIER,
        additionalAdjustments: [],
      };
    }

    try {
      const result = await this.policyEngine.evaluate({
        trigger: 'DELIVERY_PRICING' as never,
        workspaceId: context.workspaceId,
        businessId: context.businessId,
        deliveryId: context.deliveryId,
        riderId: context.riderId,
        timestamp: context.timestamp,
        timezone: context.timezone,
        location: context.location,
        metadata: {
          ...context.metadata,
          pricingContext: true,
        },
      });

      const surgeMultiplier = this.extractSurgeMultiplier(result);
      const additionalAdjustments = this.extractAdjustments(result);
      const policyId = this.extractPolicyId(result);

      return {
        surgeMultiplier,
        policyId,
        additionalAdjustments,
      };
    } catch (error) {
      this.logger.error(
        `Failed to evaluate pricing policy: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        surgeMultiplier: this.DEFAULT_SURGE_MULTIPLIER,
        additionalAdjustments: [],
      };
    }
  }

  private extractSurgeMultiplier(result: unknown): number {
    const evalResult = result as {
      decision?: string;
      outputs?: Record<string, unknown>;
      matchedPolicies?: Array<{ outputs?: Record<string, unknown> }>;
    };

    if (evalResult.outputs?.surgeMultiplier !== undefined) {
      const multiplier = Number(evalResult.outputs.surgeMultiplier);
      if (!isNaN(multiplier) && multiplier > 0) {
        return multiplier;
      }
    }

    if (evalResult.matchedPolicies?.[0]?.outputs?.surgeMultiplier !== undefined) {
      const multiplier = Number(evalResult.matchedPolicies[0].outputs.surgeMultiplier);
      if (!isNaN(multiplier) && multiplier > 0) {
        return multiplier;
      }
    }

    return this.DEFAULT_SURGE_MULTIPLIER;
  }

  private extractPolicyId(result: unknown): string | undefined {
    const evalResult = result as {
      matchedPolicies?: Array<{ policyId?: string }>;
      evaluatedPolicies?: Array<{ policyId?: string }>;
    };

    return evalResult.matchedPolicies?.[0]?.policyId ?? evalResult.evaluatedPolicies?.[0]?.policyId;
  }

  private extractAdjustments(result: unknown): DynamicAdjustment[] {
    const adjustments: DynamicAdjustment[] = [];
    const evalResult = result as {
      outputs?: Record<string, unknown>;
      matchedPolicies?: Array<{ policyId?: string; outputs?: Record<string, unknown> }>;
      evaluatedPolicies?: Array<{ policyId?: string; outputs?: Record<string, unknown> }>;
    };

    const policies = evalResult.matchedPolicies ?? evalResult.evaluatedPolicies ?? [];
    for (const policy of policies) {
      if (policy.outputs?.adjustment) {
        const adj = policy.outputs.adjustment as Partial<DynamicAdjustment>;
        if (adj.type && (adj.multiplier || adj.fixedAmount)) {
          adjustments.push({
            type: adj.type as DynamicAdjustment['type'],
            multiplier: adj.multiplier,
            fixedAmount: adj.fixedAmount,
            reason: adj.reason ?? 'Policy adjustment',
            policyId: policy.policyId,
          });
        }
      }
    }

    return adjustments;
  }
}
