import { Logger } from '@nestjs/common';

import {
  AssignmentContext,
  AssignmentResult,
  AssignmentStrategy,
  AssignmentStrategyType,
  ValidationResult,
  WorkerCandidate,
} from '../../interfaces';

/**
 * Base Assignment Strategy
 *
 * Abstract base class for all assignment strategies.
 * Provides common functionality and enforces the strategy contract.
 */
export abstract class BaseAssignmentStrategy implements AssignmentStrategy {
  protected readonly logger: Logger;

  constructor(
    public readonly type: AssignmentStrategyType,
    public readonly name: string
  ) {
    this.logger = new Logger(`${BaseAssignmentStrategy.name}[${this.name}]`);
  }

  /**
   * Check if this strategy can handle the given context.
   * Default implementation returns true - override for custom logic.
   */
  async canHandle(_context: AssignmentContext): Promise<boolean> {
    return true;
  }

  /**
   * Execute the assignment strategy.
   * Must be implemented by concrete strategies.
   */
  abstract assign(
    context: AssignmentContext,
    candidates: WorkerCandidate[]
  ): Promise<AssignmentResult>;

  /**
   * Validate a candidate against assignment criteria.
   * Default implementation provides basic validation - override for custom logic.
   */
  async validateCandidate(
    candidate: WorkerCandidate,
    context: AssignmentContext
  ): Promise<ValidationResult> {
    const reasons: string[] = [];
    let score = 100;

    // Check if worker is available
    if (candidate.availabilityStatus !== 'available' && candidate.availabilityStatus !== 'on_duty') {
      reasons.push(`Worker is not available (status: ${candidate.availabilityStatus})`);
      score -= 50;
    }

    // Check if worker has capacity
    if (candidate.currentLoad >= candidate.maxCapacity) {
      reasons.push('Worker has reached maximum capacity');
      score -= 30;
    }

    // Check constraints
    if (context.constraints.forbiddenWorkerIds?.includes(candidate.workerId)) {
      reasons.push('Worker is explicitly forbidden for this job');
      score -= 100;
    }

    if (context.constraints.minRating && candidate.rating < context.constraints.minRating) {
      reasons.push(`Worker rating ${candidate.rating} is below minimum required ${context.constraints.minRating}`);
      score -= 20;
    }

    // Check worker type requirements
    const requiredTypes = context.requiredWorkerTypes.map((r) => r.workerType);
    if (requiredTypes.length > 0 && !requiredTypes.includes(candidate.workerType)) {
      reasons.push(`Worker type ${candidate.workerType} does not match required types: ${requiredTypes.join(', ')}`);
      score -= 40;
    }

    const valid = reasons.length === 0 && score > 0;

    return {
      valid,
      reasons,
      score: Math.max(0, score),
    };
  }

  /**
   * Get the priority of this strategy for auto-selection.
   * Default implementation returns 0 - override for custom priority logic.
   */
  getPriority(_context: AssignmentContext): number {
    return 0;
  }

  /**
   * Filter candidates based on validation results.
   * Returns only valid candidates sorted by score.
   */
  protected async filterValidCandidates(
    candidates: WorkerCandidate[],
    context: AssignmentContext
  ): Promise<WorkerCandidate[]> {
    const validationResults = await Promise.all(
      candidates.map((candidate) => this.validateCandidate(candidate, context))
    );

    return candidates
      .filter((candidate, index) => validationResults[index].valid)
      .sort((a, b) => {
        const scoreA = validationResults[candidates.indexOf(a)].score ?? 0;
        const scoreB = validationResults[candidates.indexOf(b)].score ?? 0;
        return scoreB - scoreA;
      });
  }

  /**
   * Calculate distance between two geo locations in kilometers.
   */
  protected calculateDistance(
    location1: { latitude: number; longitude: number },
    location2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(location2.latitude - location1.latitude);
    const dLon = this.toRad(location2.longitude - location1.longitude);
    const lat1 = this.toRad(location1.latitude);
    const lat2 = this.toRad(location2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
