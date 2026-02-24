import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PolicyEffect, PolicyTrigger, VehicleType } from '@zanafleet/contracts';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { PolicyEvaluationEngineService } from '../../policy/services/policy-evaluation-engine.service';
import { DeliveryEntity } from '../entities/delivery.entity';
import { MatchingTimeoutEventV1 } from '../events/matching-timeout.event';
import { RiderAssignedEventV1 } from '../events/rider-assigned.event';
import { RiderRejectedEventV1 } from '../events/rider-rejected.event';
import { AssignmentRulesService } from '../services/assignment-rules.service';
import { CandidateSelectionService, GeoPoint } from '../services/candidate-selection.service';
import { DeliveryService } from '../services/delivery.service';

/**
 * Represents a ranked rider candidate for matching.
 */
export interface MatchingCandidate {
  riderId: string;
  saccoId: string | null;
  distanceMeters: number;
  score: number;
  vehicleType?: VehicleType;
}

/**
 * Result of a matching operation.
 */
export interface MatchingResult {
  success: boolean;
  deliveryId: string;
  assignedRiderId?: string;
  score?: number;
  distanceMeters?: number;
  reason?: string;
}

/**
 * Configuration for matching operations.
 */
export interface MatchingConfig {
  initialRadiusMeters: number;
  maxRadiusMeters: number;
  radiusExpansionFactor: number;
  maxConsecutiveSaccoAssignments: number;
  distanceTierThresholdMeters: number;
}

/**
 * Matching state for tracking attempts and excluded riders.
 */
interface MatchingState {
  deliveryId: string;
  attemptCount: number;
  currentRadiusMeters: number;
  excludedRiderIds: Set<string>;
  saccoAssignmentCounts: Map<string, number>;
}

const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  initialRadiusMeters: 2000,
  maxRadiusMeters: 10000,
  radiusExpansionFactor: 1.5,
  maxConsecutiveSaccoAssignments: 3,
  distanceTierThresholdMeters: 500,
};

export class NoEligibleRidersError extends Error {
  constructor(public readonly deliveryId: string, public readonly attemptCount: number) {
    super(`No eligible riders found for delivery ${deliveryId} after ${attemptCount} attempts`);
    this.name = 'NoEligibleRidersError';
  }
}

export class DeliveryNotFoundError extends Error {
  constructor(public readonly deliveryId: string) {
    super(`Delivery ${deliveryId} not found`);
    this.name = 'DeliveryNotFoundError';
  }
}

/**
 * DeliveryMatchingCoordinator
 *
 * Orchestrates the full rider assignment flow including:
 * - Candidate selection based on proximity
 * - Assignment rules evaluation
 * - Policy-based fairness rules (sacco fairness, vehicle eligibility)
 * - Timeout handling with radius expansion
 * - Rejection handling with re-matching
 *
 * Emits domain events for all matching outcomes.
 */
@Injectable()
export class DeliveryMatchingCoordinator {
  private readonly logger = new Logger(DeliveryMatchingCoordinator.name);
  private readonly matchingStates = new Map<string, MatchingState>();
  private readonly recentSaccoAssignments = new Map<string, number>();

  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>,
    private readonly candidateSelectionService: CandidateSelectionService,
    private readonly assignmentRulesService: AssignmentRulesService,
    private readonly policyEngine: PolicyEvaluationEngineService,
    private readonly deliveryService: DeliveryService,
    private readonly eventBus: EventBusService
  ) {}

  /**
   * Orchestrates the full matching flow for a delivery.
   *
   * Steps:
   * 1. Load delivery details
   * 2. Find and rank nearby candidates
   * 3. Evaluate assignment rules for each candidate
   * 4. Apply policy rules (sacco fairness, vehicle eligibility)
   * 5. Select top candidate and assign
   * 6. Emit appropriate event
   */
  async findAndAssignRider(
    deliveryId: string,
    config: Partial<MatchingConfig> = {}
  ): Promise<MatchingResult> {
    const matchingConfig = { ...DEFAULT_MATCHING_CONFIG, ...config };
    this.logger.log(`Starting rider matching for delivery ${deliveryId}`);

    const state = this.getOrCreateMatchingState(deliveryId, matchingConfig);
    state.attemptCount++;

    const delivery = await this.loadDeliveryDetails(deliveryId);

    const candidates = await this.findCandidates(delivery, state.currentRadiusMeters);

    const eligibleCandidates = this.filterExcludedRiders(candidates, state.excludedRiderIds);

    if (eligibleCandidates.length === 0) {
      this.logger.warn(`No candidates found for delivery ${deliveryId}`);
      return {
        success: false,
        deliveryId,
        reason: 'No nearby riders available',
      };
    }

    const evaluatedCandidates = await this.evaluateCandidates(
      eligibleCandidates,
      delivery,
      matchingConfig
    );

    if (evaluatedCandidates.length === 0) {
      this.logger.warn(`No eligible candidates after evaluation for delivery ${deliveryId}`);
      return {
        success: false,
        deliveryId,
        reason: 'No riders passed eligibility checks',
      };
    }

    const rankedCandidates = this.applyFairnessRules(evaluatedCandidates, matchingConfig);

    const selectedCandidate = rankedCandidates[0];

    const policyResult = await this.evaluatePolicyRules(delivery, selectedCandidate);

    if (policyResult.finalDecision.effect === PolicyEffect.BLOCK) {
      this.logger.warn(
        `Policy blocked rider ${selectedCandidate.riderId} for delivery ${deliveryId}`
      );
      state.excludedRiderIds.add(selectedCandidate.riderId);
      return this.findAndAssignRider(deliveryId, config);
    }

    await this.deliveryService.assignRider(deliveryId, selectedCandidate.riderId);

    this.updateSaccoAssignmentTracking(selectedCandidate.saccoId);

    const event = new RiderAssignedEventV1({
      eventId: uuidv4(),
      deliveryId,
      riderId: selectedCandidate.riderId,
      saccoId: selectedCandidate.saccoId,
      score: selectedCandidate.score,
      distanceMeters: selectedCandidate.distanceMeters,
      assignedAt: new Date(),
    });

    await this.eventBus.publish(NatsSubjects.Delivery.RIDER_ASSIGNED_V1, event);

    this.clearMatchingState(deliveryId);

    this.logger.log(
      `Assigned rider ${selectedCandidate.riderId} to delivery ${deliveryId} ` +
        `(score: ${selectedCandidate.score}, distance: ${selectedCandidate.distanceMeters}m)`
    );

    return {
      success: true,
      deliveryId,
      assignedRiderId: selectedCandidate.riderId,
      score: selectedCandidate.score,
      distanceMeters: selectedCandidate.distanceMeters,
    };
  }

  /**
   * Handles assignment timeout by expanding the search radius and re-running matching.
   */
  async handleAssignmentTimeout(
    deliveryId: string,
    config: Partial<MatchingConfig> = {}
  ): Promise<MatchingResult> {
    const matchingConfig = { ...DEFAULT_MATCHING_CONFIG, ...config };
    this.logger.log(`Handling assignment timeout for delivery ${deliveryId}`);

    const state = this.getOrCreateMatchingState(deliveryId, matchingConfig);
    const previousRadius = state.currentRadiusMeters;

    state.currentRadiusMeters = Math.min(
      state.currentRadiusMeters * matchingConfig.radiusExpansionFactor,
      matchingConfig.maxRadiusMeters
    );

    const event = new MatchingTimeoutEventV1({
      eventId: uuidv4(),
      deliveryId,
      attemptCount: state.attemptCount,
      previousRadiusMeters: previousRadius,
      expandedRadiusMeters: state.currentRadiusMeters,
      timedOutAt: new Date(),
    });

    await this.eventBus.publish(NatsSubjects.Delivery.MATCHING_TIMEOUT_V1, event);

    if (state.currentRadiusMeters >= matchingConfig.maxRadiusMeters) {
      this.logger.warn(`Max radius reached for delivery ${deliveryId}, no more expansion possible`);
    }

    return this.findAndAssignRider(deliveryId, config);
  }

  /**
   * Handles rider rejection by removing the rider from the candidate pool and re-running matching.
   */
  async handleRiderRejection(
    deliveryId: string,
    riderId: string,
    reason: string,
    config: Partial<MatchingConfig> = {}
  ): Promise<MatchingResult> {
    const matchingConfig = { ...DEFAULT_MATCHING_CONFIG, ...config };
    this.logger.log(`Handling rider ${riderId} rejection for delivery ${deliveryId}: ${reason}`);

    const state = this.getOrCreateMatchingState(deliveryId, matchingConfig);
    state.excludedRiderIds.add(riderId);

    const event = new RiderRejectedEventV1({
      eventId: uuidv4(),
      deliveryId,
      riderId,
      reason,
      rejectedAt: new Date(),
    });

    await this.eventBus.publish(NatsSubjects.Delivery.RIDER_REJECTED_V1, event);

    return this.findAndAssignRider(deliveryId, config);
  }

  /**
   * Reassigns a delivery by unassigning the current rider and triggering new matching.
   */
  async reassignDelivery(
    deliveryId: string,
    reason: string,
    config: Partial<MatchingConfig> = {}
  ): Promise<MatchingResult> {
    this.logger.log(`Reassigning delivery ${deliveryId}: ${reason}`);

    const delivery = await this.loadDeliveryDetails(deliveryId);
    const previousRiderId = delivery.assignedRiderId;

    this.clearMatchingState(deliveryId);

    const state = this.getOrCreateMatchingState(deliveryId, {
      ...DEFAULT_MATCHING_CONFIG,
      ...config,
    });

    if (previousRiderId) {
      state.excludedRiderIds.add(previousRiderId);

      const event = new RiderRejectedEventV1({
        eventId: uuidv4(),
        deliveryId,
        riderId: previousRiderId,
        reason: `Reassignment: ${reason}`,
        rejectedAt: new Date(),
      });

      await this.eventBus.publish(NatsSubjects.Delivery.RIDER_REJECTED_V1, event);
    }

    return this.findAndAssignRider(deliveryId, config);
  }

  /**
   * Gets the current matching state for a delivery.
   */
  getMatchingState(deliveryId: string): MatchingState | undefined {
    return this.matchingStates.get(deliveryId);
  }

  /**
   * Gets the consecutive assignment count for a sacco.
   */
  getSaccoAssignmentCount(saccoId: string): number {
    return this.recentSaccoAssignments.get(saccoId) ?? 0;
  }

  private getOrCreateMatchingState(deliveryId: string, config: MatchingConfig): MatchingState {
    let state = this.matchingStates.get(deliveryId);
    if (!state) {
      state = {
        deliveryId,
        attemptCount: 0,
        currentRadiusMeters: config.initialRadiusMeters,
        excludedRiderIds: new Set(),
        saccoAssignmentCounts: new Map(),
      };
      this.matchingStates.set(deliveryId, state);
    }
    return state;
  }

  private clearMatchingState(deliveryId: string): void {
    this.matchingStates.delete(deliveryId);
  }

  private async loadDeliveryDetails(deliveryId: string): Promise<DeliveryEntity> {
    const delivery = await this.deliveryRepository.findOneBy({ id: deliveryId });
    if (!delivery) {
      throw new DeliveryNotFoundError(deliveryId);
    }
    return delivery;
  }

  private async findCandidates(
    delivery: DeliveryEntity,
    radiusMeters: number
  ): Promise<MatchingCandidate[]> {
    // Use a default pickup location - in production this would be resolved from pickupLocationId
    const pickup: GeoPoint = { latitude: -1.2921, longitude: 36.8219 }; // Default Nairobi coordinates

    const candidates = await this.candidateSelectionService.findAndRankCandidates({
      pickup,
      scheduledPickupTime: delivery.scheduledPickupTime,
      scheduledDropoffTime: delivery.scheduledDropoffTime,
      radiusMeters,
    });

    return candidates.map((c) => ({
      riderId: c.riderId,
      // Preserve saccoId if available (e.g., from enriched candidate data or mocks)
      // In production, this would need a separate lookup service
      saccoId: (c as unknown as { saccoId?: string | null }).saccoId ?? null,
      distanceMeters: c.distanceMeters,
      score: c.score,
      vehicleType: c.vehicleType,
    }));
  }

  private filterExcludedRiders(
    candidates: MatchingCandidate[],
    excludedIds: Set<string>
  ): MatchingCandidate[] {
    return candidates.filter((c) => !excludedIds.has(c.riderId));
  }

  private async evaluateCandidates(
    candidates: MatchingCandidate[],
    delivery: DeliveryEntity,
    _config: MatchingConfig
  ): Promise<MatchingCandidate[]> {
    // Check if we should match now or schedule for later
    const timingDecision = this.assignmentRulesService.evaluateForMatching({
      isScheduled: delivery.isScheduled,
      scheduledPickupTime: delivery.scheduledPickupTime,
      scheduledDropoffTime: delivery.scheduledDropoffTime,
    });

    if (timingDecision.decision === 'SCHEDULE_FOR_LATER') {
      this.logger.debug(
        `Delivery ${delivery.id} scheduled for later matching: ${timingDecision.reason}`
      );
      // Return empty array to indicate we shouldn't match now
      return [];
    }

    // For MATCH_NOW, all candidates are eligible (policy engine filters later)
    return candidates;
  }

  /**
   * Applies fairness rules to rank candidates:
   * 1. Round-robin within same-distance tier
   * 2. Penalize saccos with consecutive assignments
   */
  private applyFairnessRules(
    candidates: MatchingCandidate[],
    config: MatchingConfig
  ): MatchingCandidate[] {
    const tieredCandidates = this.groupByDistanceTier(
      candidates,
      config.distanceTierThresholdMeters
    );

    const fairnessScoredCandidates = candidates.map((candidate) => {
      let fairnessScore = candidate.score;

      if (candidate.saccoId) {
        const consecutiveCount = this.recentSaccoAssignments.get(candidate.saccoId) ?? 0;
        if (consecutiveCount >= config.maxConsecutiveSaccoAssignments) {
          fairnessScore -= 100;
        } else {
          fairnessScore -= consecutiveCount * 10;
        }
      }

      const tier = this.getDistanceTier(
        candidate.distanceMeters,
        config.distanceTierThresholdMeters
      );
      const tierCandidates = tieredCandidates.get(tier) ?? [];
      const tierIndex = tierCandidates.findIndex((c) => c.riderId === candidate.riderId);
      fairnessScore -= tierIndex * 0.1;

      return {
        ...candidate,
        score: fairnessScore,
      };
    });

    return fairnessScoredCandidates.sort((a, b) => b.score - a.score);
  }

  private groupByDistanceTier(
    candidates: MatchingCandidate[],
    tierThreshold: number
  ): Map<number, MatchingCandidate[]> {
    const tiers = new Map<number, MatchingCandidate[]>();

    for (const candidate of candidates) {
      const tier = this.getDistanceTier(candidate.distanceMeters, tierThreshold);
      const tierCandidates = tiers.get(tier) ?? [];
      tierCandidates.push(candidate);
      tiers.set(tier, tierCandidates);
    }

    return tiers;
  }

  private getDistanceTier(distanceMeters: number, tierThreshold: number): number {
    return Math.floor(distanceMeters / tierThreshold);
  }

  private async evaluatePolicyRules(
    delivery: DeliveryEntity,
    candidate: MatchingCandidate
  ): Promise<{ finalDecision: { effect: PolicyEffect } }> {
    return this.policyEngine.evaluate({
      trigger: PolicyTrigger.RIDER_ASSIGNMENT,
      workspaceId: delivery.businessId,
      deliveryId: delivery.id,
      riderId: candidate.riderId,
      saccoId: candidate.saccoId ?? undefined,
      timestamp: new Date(),
      metadata: {
        distanceMeters: candidate.distanceMeters,
        candidateScore: candidate.score,
        vehicleType: candidate.vehicleType,
      },
    });
  }

  private updateSaccoAssignmentTracking(saccoId: string | null): void {
    if (!saccoId) return;

    for (const [id] of this.recentSaccoAssignments) {
      if (id !== saccoId) {
        this.recentSaccoAssignments.set(id, 0);
      }
    }

    const currentCount = this.recentSaccoAssignments.get(saccoId) ?? 0;
    this.recentSaccoAssignments.set(saccoId, currentCount + 1);
  }
}
