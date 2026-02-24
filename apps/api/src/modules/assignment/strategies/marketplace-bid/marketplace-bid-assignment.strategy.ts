import { Injectable } from '@nestjs/common';

import {
  AssignmentAssignment,
  AssignmentContext,
  AssignmentResult,
  AssignmentStatus,
  AssignmentStrategyType,
  AssignmentWorkerRole,
  ValidationResult,
  WorkerCandidate,
} from '../../interfaces';
import { BaseAssignmentStrategy } from '../base/base-assignment.strategy';

/**
 * Marketplace Bid Assignment Strategy
 *
 * Workers submit bids for jobs and the assignment is made based on
 * the best bid (price, rating, or combination).
 */
@Injectable()
export class MarketplaceBidAssignmentStrategy extends BaseAssignmentStrategy {
  constructor() {
    super(AssignmentStrategyType.MARKETPLACE_BID, 'Marketplace Bid Assignment');
  }

  /**
   * Marketplace bid requires bidding configuration.
   */
  async canHandle(context: AssignmentContext): Promise<boolean> {
    return !!context.biddingConfig;
  }

  /**
   * Assign workers based on marketplace bidding.
   * In this implementation, we simulate bids from candidates.
   * In production, this would integrate with a bidding marketplace.
   */
  async assign(
    context: AssignmentContext,
    candidates: WorkerCandidate[]
  ): Promise<AssignmentResult> {
    this.logger.log(`Starting marketplace bid assignment for job ${context.jobId}`);

    if (!context.biddingConfig) {
      return {
        success: false,
        assignments: [],
        errors: ['Bidding configuration is required for marketplace bid assignment'],
      };
    }

    // Filter valid candidates
    const validCandidates = await this.filterValidCandidates(candidates, context);

    if (validCandidates.length === 0) {
      return {
        success: false,
        assignments: [],
        errors: ['No valid candidates available for bidding'],
      };
    }

    // Check minimum bidders requirement
    if (validCandidates.length < context.biddingConfig.minBidders) {
      return {
        success: false,
        assignments: [],
        errors: [
          `Not enough bidders: ${validCandidates.length} < ${context.biddingConfig.minBidders}`,
        ],
      };
    }

    // Generate simulated bids for each candidate
    // In production, these would come from actual worker submissions
    const bids = validCandidates.map((candidate) => ({
      candidate,
      bidAmount: this.generateBidAmount(candidate, context),
      bidScore: this.calculateBidScore(candidate),
    }));

    // Sort by bid score (lower is better for price-based, but we use a combined score)
    bids.sort((a, b) => b.bidScore - a.bidScore);

    // Select the best bid
    const winningBid = bids[0];

    // Check minimum bid amount constraint
    if (
      context.biddingConfig.minBidAmount &&
      winningBid.bidAmount < context.biddingConfig.minBidAmount
    ) {
      return {
        success: false,
        assignments: [],
        errors: [
          `Winning bid ${winningBid.bidAmount} is below minimum ${context.biddingConfig.minBidAmount}`,
        ],
      };
    }

    // Check maximum bid amount constraint
    if (
      context.biddingConfig.maxBidAmount &&
      winningBid.bidAmount > context.biddingConfig.maxBidAmount
    ) {
      return {
        success: false,
        assignments: [],
        errors: [
          `Winning bid ${winningBid.bidAmount} exceeds maximum ${context.biddingConfig.maxBidAmount}`,
        ],
      };
    }

    const assignment: AssignmentAssignment = {
      workerId: winningBid.candidate.workerId,
      workerType: winningBid.candidate.workerType,
      role: AssignmentWorkerRole.PRIMARY,
      assignedAt: new Date(),
      assignmentMethod: AssignmentStrategyType.MARKETPLACE_BID,
      status: AssignmentStatus.PENDING,
    };

    this.logger.log(
      `Marketplace bid assigned worker ${winningBid.candidate.workerId} with bid ${winningBid.bidAmount} to job ${context.jobId}`
    );

    return {
      success: true,
      assignments: [assignment],
      errors: [],
      metadata: {
        bidAmount: winningBid.bidAmount,
        bidScore: winningBid.bidScore,
        totalBids: bids.length,
      },
    };
  }

  /**
   * Validate a candidate for marketplace bidding.
   */
  async validateCandidate(
    candidate: WorkerCandidate,
    context: AssignmentContext
  ): Promise<ValidationResult> {
    const baseResult = await super.validateCandidate(candidate, context);

    if (!baseResult.valid) {
      return baseResult;
    }

    const reasons = [...baseResult.reasons];
    let score = baseResult.score ?? 100;

    // Marketplace bidding favors available workers
    if (candidate.availabilityStatus === 'available') {
      score += 10;
    }

    // Favor higher rated workers
    if (candidate.rating >= 4.5) {
      score += 15;
    } else if (candidate.rating >= 4.0) {
      score += 10;
    } else if (candidate.rating < 3.0) {
      score -= 20;
    }

    // Penalize high load workers (they may not accept low-paying bids)
    const loadFactor = candidate.currentLoad / candidate.maxCapacity;
    if (loadFactor > 0.8) {
      score -= 15;
    }

    const valid = reasons.length === baseResult.reasons.length && score > 0;

    return {
      valid,
      reasons,
      score: Math.max(0, Math.min(100, score)),
    };
  }

  /**
   * Lower priority - only used when bidding is explicitly configured.
   */
  getPriority(context: AssignmentContext): number {
    if (context.biddingConfig) {
      return 70;
    }
    return 0;
  }

  /**
   * Generate a simulated bid amount for a candidate.
   * In production, this would come from actual worker submissions.
   */
  private generateBidAmount(candidate: WorkerCandidate, context: AssignmentContext): number {
    // Base bid amount based on worker rating (higher rated workers charge more)
    const baseAmount = 100 + candidate.rating * 20;

    // Adjust based on current load (busier workers charge more)
    const loadFactor = candidate.currentLoad / candidate.maxCapacity;
    const loadAdjustment = 1 + loadFactor * 0.3;

    // Add some randomness
    const randomFactor = 0.9 + Math.random() * 0.2;

    return Math.round(baseAmount * loadAdjustment * randomFactor);
  }

  /**
   * Calculate a bid score (higher is better).
   * Combines rating, price competitiveness, and availability.
   */
  private calculateBidScore(candidate: WorkerCandidate): number {
    // Rating score (0-40 points)
    const ratingScore = candidate.rating * 8;

    // Availability score (0-30 points)
    let availabilityScore = 0;
    switch (candidate.availabilityStatus) {
      case 'available':
        availabilityScore = 30;
        break;
      case 'on_duty':
        availabilityScore = 20;
        break;
      case 'busy':
        availabilityScore = 10;
        break;
      default:
        availabilityScore = 0;
    }

    // Load score (0-30 points) - lower load is better
    const loadFactor = candidate.currentLoad / candidate.maxCapacity;
    const loadScore = Math.round((1 - loadFactor) * 30);

    return ratingScore + availabilityScore + loadScore;
  }
}
