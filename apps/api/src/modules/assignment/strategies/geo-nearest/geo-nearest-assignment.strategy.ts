import { Injectable } from '@nestjs/common';

import { BaseAssignmentStrategy } from '../base/base-assignment.strategy';
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

/**
 * Geo-Nearest Assignment Strategy
 *
 * Assigns the worker closest to the job destination.
 * Optimizes for response time and travel distance.
 */
@Injectable()
export class GeoNearestAssignmentStrategy extends BaseAssignmentStrategy {
  constructor() {
    super(AssignmentStrategyType.GEO_NEAREST, 'Geo-Nearest Assignment');
  }

  /**
   * Geo-nearest requires destinations and candidate locations.
   */
  async canHandle(context: AssignmentContext): Promise<boolean> {
    return context.destinations.length > 0;
  }

  /**
   * Assign the nearest worker to the job destination.
   */
  async assign(
    context: AssignmentContext,
    candidates: WorkerCandidate[]
  ): Promise<AssignmentResult> {
    this.logger.log(`Starting geo-nearest assignment for job ${context.jobId}`);

    if (context.destinations.length === 0) {
      return {
        success: false,
        assignments: [],
        errors: ['No destinations specified for geo-nearest assignment'],
      };
    }

    // Filter valid candidates
    const validCandidates = await this.filterValidCandidates(candidates, context);

    if (validCandidates.length === 0) {
      return {
        success: false,
        assignments: [],
        errors: ['No valid candidates available'],
      };
    }

    // Get the first destination as the primary target
    const primaryDestination = context.destinations[0];

    // Calculate distance for each candidate and sort
    const candidatesWithDistance = validCandidates
      .filter((c) => c.location)
      .map((candidate) => ({
        candidate,
        distance: this.calculateDistance(candidate.location!, primaryDestination.location),
      }))
      .sort((a, b) => a.distance - b.distance);

    if (candidatesWithDistance.length === 0) {
      return {
        success: false,
        assignments: [],
        errors: ['No candidates with location data available'],
      };
    }

    // Select the nearest worker
    const nearest = candidatesWithDistance[0];

    // Check max distance constraint
    if (context.constraints.maxDistanceKm && nearest.distance > context.constraints.maxDistanceKm) {
      return {
        success: false,
        assignments: [],
        errors: [
          `Nearest worker is ${nearest.distance.toFixed(1)}km away, exceeds maximum ${
            context.constraints.maxDistanceKm
          }km`,
        ],
      };
    }

    const assignment: AssignmentAssignment = {
      workerId: nearest.candidate.workerId,
      workerType: nearest.candidate.workerType,
      role: AssignmentWorkerRole.PRIMARY,
      assignedAt: new Date(),
      assignmentMethod: AssignmentStrategyType.GEO_NEAREST,
      status: AssignmentStatus.PENDING,
    };

    this.logger.log(
      `Geo-nearest assigned worker ${nearest.candidate.workerId} (${nearest.distance.toFixed(
        1
      )}km) to job ${context.jobId}`
    );

    return {
      success: true,
      assignments: [assignment],
      errors: [],
      metadata: {
        distanceKm: nearest.distance,
      },
    };
  }

  /**
   * Validate candidate with distance scoring.
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

    // Require location for geo-nearest
    if (!candidate.location) {
      reasons.push('Worker does not have location data');
      score -= 100;
    } else if (context.destinations.length > 0) {
      const primaryDestination = context.destinations[0];
      const distance = this.calculateDistance(candidate.location, primaryDestination.location);

      // Score based on distance
      if (distance <= 1) {
        score += 20; // Bonus for very close
      } else if (distance <= 5) {
        score += 10;
      } else if (distance > 20) {
        score -= 20; // Penalty for far away
      }

      // Check hard distance constraint
      if (context.constraints.maxDistanceKm && distance > context.constraints.maxDistanceKm) {
        reasons.push(
          `Worker is ${distance.toFixed(1)}km away, exceeds maximum ${
            context.constraints.maxDistanceKm
          }km`
        );
        score -= 100;
      }
    }

    const valid = reasons.length === baseResult.reasons.length && score > 0;

    return {
      valid,
      reasons,
      score: Math.max(0, Math.min(100, score)),
    };
  }

  /**
   * High priority when location-based assignment is preferred.
   */
  getPriority(context: AssignmentContext): number {
    if (context.destinations.length > 0) {
      return 90;
    }
    return 0;
  }
}
