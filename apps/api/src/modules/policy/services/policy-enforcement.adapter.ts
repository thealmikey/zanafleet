import { Injectable } from '@nestjs/common';

import {
  PolicyTrigger,
  PolicyEffect,
  EvaluationContext,
  PolicyDecision,
  EvaluationResult,
} from '../dto';

import { PolicyEvaluationEngineService, EvaluationOptions } from './policy-evaluation-engine.service';
import { RankedCandidate, GeoPoint } from '../../delivery/services/candidate-selection.service';

/**
 * Result of filtering candidates by policy.
 */
export interface FilterCandidatesResult {
  allowed: RankedCandidate[];
  blocked: Array<{ candidate: RankedCandidate; reason: string }>;
  requiresApproval: Array<{ candidate: RankedCandidate; reason: string; approvalRoles?: string[] }>;
}

/**
 * Context for filtering candidates by policy.
 */
export interface FilterCandidatesContext {
  deliveryId: string;
  workspaceId: string;
  pickupLocation: GeoPoint;
  scheduledTime?: Date;
}

/**
 * Result of evaluating delivery creation policy.
 */
export interface DeliveryCreationResult {
  allowed: boolean;
  decision: PolicyDecision;
  requiresApproval?: boolean;
  approvalRoles?: string[];
}

/**
 * Input for evaluating delivery creation policy.
 */
export interface DeliveryCreationInput {
  businessId: string;
  workspaceId: string;
  pickupLocation?: GeoPoint;
  isScheduled: boolean;
}

/**
 * Result of evaluating rider assignment policy.
 */
export interface RiderAssignmentResult {
  allowed: boolean;
  decision: PolicyDecision;
  modifications?: {
    notifyAssignment?: boolean;
  };
  requiresApproval?: boolean;
  approvalRoles?: string[];
}

/**
 * Input for evaluating rider assignment policy.
 */
export interface RiderAssignmentInput {
  deliveryId: string;
  riderId: string;
  workspaceId: string;
}

/**
 * PolicyEnforcementAdapter
 *
 * Adapter service that provides hooks for integrating policy enforcement
 * into existing services like CandidateSelectionService and DeliveryService.
 */
@Injectable()
export class PolicyEnforcementAdapter {
  constructor(private readonly engine: PolicyEvaluationEngineService) {}

  /**
   * Hook for CandidateSelectionService - filters candidates based on policy.
   * Evaluates each candidate against RIDER_ASSIGNMENT policies.
   *
   * @param candidates - The ranked candidates to filter
   * @param context - Context including deliveryId, workspaceId, and pickupLocation
   * @returns Candidates split into allowed and blocked arrays
   */
  async filterCandidatesByPolicy(
    candidates: RankedCandidate[],
    context: FilterCandidatesContext
  ): Promise<FilterCandidatesResult> {
    const allowed: RankedCandidate[] = [];
    const blocked: Array<{ candidate: RankedCandidate; reason: string }> = [];
    const requiresApproval: Array<{ candidate: RankedCandidate; reason: string; approvalRoles?: string[] }> = [];
    const timestamp = context.scheduledTime ?? new Date();

    for (const candidate of candidates) {
      const evalContext: EvaluationContext = {
        trigger: PolicyTrigger.RIDER_ASSIGNMENT,
        workspaceId: context.workspaceId,
        deliveryId: context.deliveryId,
        riderId: candidate.riderId,
        timestamp,
        location: {
          latitude: context.pickupLocation.latitude,
          longitude: context.pickupLocation.longitude,
        },
      };

      const result = await this.engine.evaluate(evalContext);
      const effect = result.finalDecision.effect;

      if (effect === PolicyEffect.BLOCK) {
        blocked.push({
          candidate,
          reason: result.finalDecision.reason,
        });
      } else if (effect === PolicyEffect.REQUIRE_APPROVAL) {
        requiresApproval.push({
          candidate,
          reason: result.finalDecision.reason,
          approvalRoles: result.finalDecision.requiresApprovalFrom,
        });
      } else {
        allowed.push(candidate);
      }
    }

    return { allowed, blocked, requiresApproval };
  }

  /**
   * Hook for DeliveryService.createOnDemand/createScheduled.
   * Evaluates whether a delivery can be created based on policies.
   *
   * @param input - The delivery creation input
   * @returns Result indicating if creation is allowed and any approval requirements
   */
  async evaluateDeliveryCreation(
    input: DeliveryCreationInput
  ): Promise<DeliveryCreationResult> {
    const evalContext: EvaluationContext = {
      trigger: PolicyTrigger.DELIVERY_CREATION,
      workspaceId: input.workspaceId,
      businessId: input.businessId,
      timestamp: new Date(),
      location: input.pickupLocation
        ? {
            latitude: input.pickupLocation.latitude,
            longitude: input.pickupLocation.longitude,
          }
        : undefined,
      metadata: {
        isScheduled: input.isScheduled,
      },
    };

    const result = await this.engine.evaluate(evalContext);
    const effect = result.finalDecision.effect;

    const allowed =
      effect === PolicyEffect.ALLOW || effect === PolicyEffect.MODIFY;

    const response: DeliveryCreationResult = {
      allowed,
      decision: result.finalDecision,
    };

    if (effect === PolicyEffect.REQUIRE_APPROVAL) {
      response.requiresApproval = true;
      response.approvalRoles = result.finalDecision.requiresApprovalFrom;
    }

    return response;
  }

  /**
   * Hook for DeliveryService.assignRider.
   * Evaluates whether a rider can be assigned to a delivery.
   * Returns modifications that may affect assignment behavior (e.g., notifyAssignment).
   *
   * @param input - The rider assignment input
   * @returns Result indicating if assignment is allowed and any modifications
   */
  async evaluateRiderAssignment(
    input: RiderAssignmentInput
  ): Promise<RiderAssignmentResult> {
    const evalContext: EvaluationContext = {
      trigger: PolicyTrigger.RIDER_ASSIGNMENT,
      workspaceId: input.workspaceId,
      deliveryId: input.deliveryId,
      riderId: input.riderId,
      timestamp: new Date(),
    };

    const result = await this.engine.evaluate(evalContext);
    const effect = result.finalDecision.effect;

    const allowed =
      effect === PolicyEffect.ALLOW || effect === PolicyEffect.MODIFY;

    const response: RiderAssignmentResult = {
      allowed,
      decision: result.finalDecision,
    };

    if (effect === PolicyEffect.MODIFY && result.finalDecision.modifications) {
      const mods = result.finalDecision.modifications;
      if (typeof mods.notifyAssignment === 'boolean') {
        response.modifications = {
          notifyAssignment: mods.notifyAssignment,
        };
      }
    }

    if (effect === PolicyEffect.REQUIRE_APPROVAL) {
      response.requiresApproval = true;
      response.approvalRoles = result.finalDecision.requiresApprovalFrom;
    }

    return response;
  }

  /**
   * Generic evaluation for custom triggers.
   *
   * @param trigger - The policy trigger type
   * @param context - Partial evaluation context (workspaceId required)
   * @param options - Optional evaluation options
   * @returns The full evaluation result
   */
  async evaluate(
    trigger: PolicyTrigger,
    context: Partial<EvaluationContext> & { workspaceId: string },
    options?: EvaluationOptions
  ): Promise<EvaluationResult> {
    const evalContext: EvaluationContext = {
      trigger,
      workspaceId: context.workspaceId,
      actorId: context.actorId,
      deliveryId: context.deliveryId,
      riderId: context.riderId,
      businessId: context.businessId,
      saccoId: context.saccoId,
      timestamp: context.timestamp ?? new Date(),
      location: context.location,
      metadata: context.metadata,
    };

    return this.engine.evaluate(evalContext, options);
  }
}
