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
 * Fleet Matching Assignment Strategy
 *
 * Assigns workers from the same fleet/team to a job.
 * Useful for jobs that require coordination or shared resources.
 */
@Injectable()
export class FleetMatchingAssignmentStrategy extends BaseAssignmentStrategy {
  constructor() {
    super(AssignmentStrategyType.FLEET_MATCHING, 'Fleet Matching Assignment');
  }

  /**
   * Fleet matching strategy handles jobs that need fleet coordination.
   */
  async canHandle(context: AssignmentContext): Promise<boolean> {
    // Check if metadata specifies fleet matching is needed
    const fleetId = context.metadata?.fleetId as string | undefined;
    return !!fleetId || context.requiredWorkerTypes.length > 1;
  }

  /**
   * Assign workers from the same fleet.
   */
  async assign(
    context: AssignmentContext,
    candidates: WorkerCandidate[]
  ): Promise<AssignmentResult> {
    this.logger.log(
      `Starting fleet matching assignment for job ${context.jobId}`
    );

    const fleetId = context.metadata?.fleetId as string | undefined;
    const assignments: AssignmentAssignment[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!fleetId) {
      this.logger.warn('No fleet ID specified in context metadata');
      return {
        success: false,
        assignments: [],
        errors: ['Fleet ID is required for fleet matching strategy'],
      };
    }

    // Filter candidates by fleet
    const fleetCandidates = candidates.filter(
      (c) => (c as Record<string, unknown>).fleetId === fleetId
    );

    if (fleetCandidates.length === 0) {
      this.logger.warn(`No candidates found for fleet ${fleetId}`);
      return {
        success: false,
        assignments: [],
        errors: [`No workers available in fleet ${fleetId}`],
      };
    }

    // Validate candidates
    const validCandidates = await this.filterValidCandidates(
      fleetCandidates,
      context
    );

    if (validCandidates.length === 0) {
      return {
        success: false,
        assignments: [],
        errors: ['No valid candidates in the specified fleet'],
      };
    }

    // Assign workers up to the required count
    const requiredCount = context.requiredWorkerTypes.reduce(
      (sum, req) => sum + req.minWorkers,
      0
    );

    let assigned = 0;
    for (const candidate of validCandidates) {
      if (assigned >= requiredCount) {
        break;
      }

      const role = assigned === 0
        ? AssignmentWorkerRole.PRIMARY
        : AssignmentWorkerRole.HELPER;

      const assignment: AssignmentAssignment = {
        workerId: candidate.workerId,
        workerType: candidate.workerType,
        role,
        assignedAt: new Date(),
        assignmentMethod: AssignmentStrategyType.FLEET_MATCHING,
        status: AssignmentStatus.PENDING,
      };

      assignments.push(assignment);
      assigned++;
    }

    if (assigned < requiredCount) {
      warnings.push(
        `Only assigned ${assigned} of ${requiredCount} required workers from fleet`
      );
    }

    this.logger.log(
      `Fleet matching completed: assigned ${assigned} workers from fleet ${fleetId}`
    );

    return {
      success: assignments.length > 0,
      assignments,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate a candidate for fleet matching.
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

    // Check fleet membership
    const fleetId = context.metadata?.fleetId as string | undefined;
    const candidateFleetId = (candidate as Record<string, unknown>).fleetId as string | undefined;

    if (fleetId && candidateFleetId !== fleetId) {
      reasons.push('Worker is not a member of the required fleet');
      score -= 100;
    }

    const valid = reasons.length === baseResult.reasons.length && score > 0;

    return {
      valid,
      reasons,
      score: Math.max(0, score),
    };
  }

  /**
   * Lower priority - used when fleet matching is explicitly requested.
   */
  getPriority(context: AssignmentContext): number {
    if (context.metadata?.fleetId) {
      return 80;
    }
    return 0;
  }
}

