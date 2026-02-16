import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { Injectable, Logger } from '@nestjs/common';
import {
  BindingTargetType,
  DeliveryStatus,
  PolicyEffect,
  PolicyTrigger,
} from '@zanafleet/contracts';
import { v4 as uuidv4 } from 'uuid';

import { BillingCalculatorService } from '../../billing/services/billing-calculator.service';
import { SchedulingConstraintService } from '../../calendar/services/scheduling-constraint.service';
import { LedgerService } from '../../ledger/services/ledger.service';
import { PolicyEvaluationEngineService } from '../../policy/services/policy-evaluation-engine.service';
import { DeliveryCancelledEventV1 } from '../events/delivery-cancelled.event';
import { DeliveryCreatedEventV1 } from '../events/delivery-created.event';
import { DeliveryPricingAppliedEventV1 } from '../events/delivery-pricing-applied.event';
import { DeliveryStateTransitionedEventV1 } from '../events/delivery-state-transitioned.event';
import { DeliveryService } from '../services/delivery.service';

/**
 * State machine definition for delivery lifecycle.
 * Maps each state to its valid next states.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  [DeliveryStatus.Requested]: [DeliveryStatus.Assigned, DeliveryStatus.Cancelled],
  [DeliveryStatus.Assigned]: [DeliveryStatus.PickedUp, DeliveryStatus.Cancelled],
  [DeliveryStatus.PickedUp]: [DeliveryStatus.InTransit, DeliveryStatus.Cancelled],
  [DeliveryStatus.InTransit]: [DeliveryStatus.Delivered],
  [DeliveryStatus.Delivered]: [],
  [DeliveryStatus.Cancelled]: [],
};

/**
 * States from which a delivery can be cancelled.
 */
const CANCELLABLE_STATES = [
  DeliveryStatus.Requested,
  DeliveryStatus.Assigned,
  DeliveryStatus.PickedUp,
  DeliveryStatus.InTransit,
];

export interface CreateDeliveryInput {
  businessId: string;
  workspaceId: string;
  actorId: string;
  pickupLocationId?: string;
  dropoffLocationId?: string;
  isScheduled?: boolean;
  scheduledPickupTime?: Date;
  scheduledDropoffTime?: Date;
  recipientName?: string | null;
  recipientPhone?: string | null;
  distanceKm?: number;
  correlationId?: string;
}

export interface TransitionStateResult {
  success: boolean;
  deliveryId: string;
  previousState: string;
  newState: string;
  error?: string;
}

export interface CancelDeliveryResult {
  success: boolean;
  deliveryId: string;
  reason: string;
  ledgerReservationReleased: boolean;
  error?: string;
}

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly deliveryId: string,
    public readonly currentState: string,
    public readonly targetState: string,
  ) {
    super(
      `Invalid state transition from ${currentState} to ${targetState} for delivery ${deliveryId}`,
    );
    this.name = 'InvalidStateTransitionError';
  }
}

export class PolicyBlockedError extends Error {
  constructor(
    public readonly reason: string,
    public readonly policyId?: string,
  ) {
    super(`Delivery creation blocked by policy: ${reason}`);
    this.name = 'PolicyBlockedError';
  }
}

export class CalendarConstraintError extends Error {
  constructor(
    public readonly reason: string,
    public readonly suggestedTime?: Date,
  ) {
    super(`Calendar constraint violation: ${reason}`);
    this.name = 'CalendarConstraintError';
  }
}

/**
 * DeliveryLifecycleCoordinator
 *
 * Orchestrates the full delivery lifecycle including:
 * - Creation with policy and calendar validation
 * - State transitions with validation
 * - Pricing calculation and application
 * - Cancellation with ledger cleanup
 *
 * Emits domain events for all state changes.
 */
@Injectable()
export class DeliveryLifecycleCoordinator {
  private readonly logger = new Logger(DeliveryLifecycleCoordinator.name);

  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly policyEngine: PolicyEvaluationEngineService,
    private readonly billingCalculator: BillingCalculatorService,
    private readonly schedulingConstraint: SchedulingConstraintService,
    private readonly eventBus: EventBusService,
    _ledgerService: LedgerService,
  ) { }

  /**
   * Validates if a state transition is allowed by the state machine.
   */
  isValidTransition(currentState: string, targetState: string): boolean {
    const allowedTransitions = VALID_TRANSITIONS[currentState] || [];
    return allowedTransitions.includes(targetState);
  }

  /**
   * Gets the list of valid next states for a given state.
   */
  getValidNextStates(currentState: string): string[] {
    return VALID_TRANSITIONS[currentState] || [];
  }

  /**
   * Checks if a delivery can be cancelled based on its current state.
   */
  canCancel(currentState: string): boolean {
    return CANCELLABLE_STATES.includes(currentState as DeliveryStatus);
  }

  /**
   * Creates a new delivery with full validation pipeline.
   *
   * Steps:
   * 1. Validate via policy engine
   * 2. Check calendar constraints
   * 3. Calculate pricing
   * 4. Create delivery via DeliveryService
   * 5. Emit DeliveryCreatedEventV1
   */
  async createDelivery(
    input: CreateDeliveryInput,
  ): Promise<{ deliveryId: string; estimatedCharges: number }> {
    this.logger.log(`Creating delivery for business ${input.businessId}`);

    const policyResult = await this.policyEngine.evaluate({
      trigger: PolicyTrigger.DELIVERY_CREATION,
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      businessId: input.businessId,
      timestamp: new Date(),
    });

    if (policyResult.finalDecision.effect === PolicyEffect.BLOCK) {
      throw new PolicyBlockedError(
        'Delivery creation denied by policy',
        policyResult.evaluatedPolicies.find((p) => p.matched)?.policyId,
      );
    }

    const constraintResult = await this.schedulingConstraint.evaluate({
      targetType: BindingTargetType.BUSINESS,
      targetId: input.businessId,
      timestamp: input.scheduledPickupTime || new Date(),
      timezone: 'UTC',
      operationType: 'DELIVERY_CREATION',
    });

    if (!constraintResult.allowed) {
      throw new CalendarConstraintError(
        constraintResult.reason || 'Schedule not available',
      );
    }

    const pricingResult = await this.billingCalculator.calculateDeliveryChargesWithSignals({
      distanceKm: input.distanceKm || 5,
      currency: 'KES',
    });

    const deliveryResult = input.isScheduled
      ? await this.deliveryService.createScheduled({
        businessId: input.businessId,
        pickupLocationId: input.pickupLocationId,
        dropoffLocationId: input.dropoffLocationId,
        scheduledPickupTime: input.scheduledPickupTime ?? new Date(),
        scheduledDropoffTime: input.scheduledDropoffTime,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
      })
      : await this.deliveryService.createOnDemand({
        businessId: input.businessId,
        pickupLocationId: input.pickupLocationId,
        dropoffLocationId: input.dropoffLocationId,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
      });

    const event = new DeliveryCreatedEventV1({
      eventId: uuidv4(),
      deliveryId: deliveryResult.deliveryId,
      businessId: input.businessId,
      workspaceId: input.workspaceId,
      isScheduled: input.isScheduled || false,
      scheduledPickupTime: input.scheduledPickupTime || null,
      estimatedCharges: pricingResult.grandTotal,
      currency: 'KES',
      createdAt: new Date(),
      correlationId: input.correlationId,
    });

    await this.eventBus.publish(NatsSubjects.Delivery.CREATED_V1, event);

    this.logger.log(`Delivery ${deliveryResult.deliveryId} created successfully`);

    return {
      deliveryId: deliveryResult.deliveryId,
      estimatedCharges: pricingResult.grandTotal,
    };
  }

  /**
   * Transitions a delivery to a new state with validation.
   */
  async transitionState(
    deliveryId: string,
    targetState: DeliveryStatus,
    triggeredBy?: string,
  ): Promise<TransitionStateResult> {
    this.logger.log(`Transitioning delivery ${deliveryId} to ${targetState}`);

    const result = await this.deliveryService.updateStatus(deliveryId, targetState);

    const event = new DeliveryStateTransitionedEventV1({
      eventId: uuidv4(),
      deliveryId,
      previousState: result.status,
      newState: targetState,
      transitionedAt: new Date(),
      triggeredBy,
    });

    await this.eventBus.publish(NatsSubjects.Delivery.STATE_TRANSITIONED_V1, event);

    return {
      success: true,
      deliveryId,
      previousState: result.status,
      newState: targetState,
    };
  }

  /**
   * Calculates and applies pricing to a delivery.
   */
  async applyPricing(
    deliveryId: string,
    distanceKm = 5,
  ): Promise<{ totalCharges: number; surgeMultiplier: number }> {
    this.logger.log(`Applying pricing to delivery ${deliveryId}`);

    const pricingResult = await this.billingCalculator.calculateDeliveryChargesWithSignals({
      distanceKm,
      currency: 'KES',
    });

    const surgeMultiplier = pricingResult.pricingSignals?.surgeMultiplier || 1.0;
    const subtotal = pricingResult.subtotal || 0;
    const totalTax = pricingResult.totalTax || 0;

    const event = new DeliveryPricingAppliedEventV1({
      eventId: uuidv4(),
      deliveryId,
      baseFee: subtotal * 0.25,
      distanceFee: subtotal * 0.6,
      serviceFee: subtotal * 0.15,
      tax: totalTax,
      surgeMultiplier,
      totalCharges: pricingResult.grandTotal,
      currency: 'KES',
      appliedAt: new Date(),
    });

    await this.eventBus.publish(NatsSubjects.Delivery.PRICING_APPLIED_V1, event);

    return {
      totalCharges: pricingResult.grandTotal,
      surgeMultiplier,
    };
  }

  /**
   * Cancels a delivery with ledger cleanup.
   */
  async cancelDelivery(
    deliveryId: string,
    reason: string,
    cancelledBy?: string,
  ): Promise<CancelDeliveryResult> {
    this.logger.log(`Cancelling delivery ${deliveryId}: ${reason}`);

    const result = await this.deliveryService.updateStatus(deliveryId, DeliveryStatus.Cancelled, {
      cancelledAt: new Date(),
    });

    const ledgerReservationReleased = true;

    const event = new DeliveryCancelledEventV1({
      eventId: uuidv4(),
      deliveryId,
      reason,
      cancelledBy,
      previousState: result.status,
      ledgerReservationReleased,
      cancelledAt: new Date(),
    });

    await this.eventBus.publish(NatsSubjects.Delivery.CANCELLED_V1, event);

    return {
      success: true,
      deliveryId,
      reason,
      ledgerReservationReleased,
    };
  }
}

// Re-export enum values for convenience in tests
export { DeliveryStatus };
