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
 * Single Worker Assignment Strategy
 *
 * Assigns exactly one worker to a job.
 * This is the most common assignment pattern for simple delivery and service tasks.
 */
@Injectable()
export class SingleWorkerAssignmentStrategy extends BaseAssignmentStrategy {
  constructor() {
    super(AssignmentStrategyType.SINGLE_WORKER, 'Single Worker Assignment');
  }

  /**
   * Single worker strategy can handle any context with at most one required worker.
   */
  async canHandle(context: AssignmentContext): Promise<boolean> {
    // Check if job requires more than one worker
    const totalRequiredWorkers = context.requiredWorkerTypes.reduce(
      (sum, req) => sum + req.minWorkers,
      0
    );

    // Can handle if total required workers is 1 or if multi-worker is not enabled
    return totalRequiredWorkers <= 1 && !context.constraints.maxWorkers;
  }

  /**
   * Assign a single worker to the job.
   * Selects the best candidate based on validation score.
   */
  async assign(
    context: AssignmentContext,
    candidates: WorkerCandidate[]
  ): Promise<AssignmentResult> {
    this.logger.log(`Starting single worker assignment for job ${context.jobId}`);

    // Filter valid candidates
    const validCandidates = await this.filterValidCandidates(candidates, context);

    if (validCandidates.length === 0) {
      this.logger.warn(`No valid candidates found for job ${context.jobId}`);
      return {
        success: false,
        assignments: [],
        errors: ['No valid candidates available for assignment'],
      };
    }

    // Select the best candidate (first after sorting by score)
    const selectedWorker = validCandidates[0];

    const assignment: AssignmentAssignment = {
      workerId: selectedWorker.workerId,
      workerType: selectedWorker.workerType,
      role: AssignmentWorkerRole.PRIMARY,
      assignedAt: new Date(),
      assignmentMethod: AssignmentStrategyType.SINGLE_WORKER,
      status: AssignmentStatus.PENDING,
    };

    this.logger.log(`Assigned worker ${selectedWorker.workerId} to job ${context.jobId}`);

    return {
      success: true,
      assignments: [assignment],
      errors: [],
    };
  }

  /**
   * Validate a candidate for single worker assignment.
   * Adds specific checks for single worker requirements.
   */
  async validateCandidate(
    candidate: WorkerCandidate,
    context: AssignmentContext
  ): Promise<ValidationResult> {
    // First run base validation
    const baseResult = await super.validateCandidate(candidate, context);

    if (!baseResult.valid) {
      return baseResult;
    }

    const reasons = [...baseResult.reasons];
    let score = baseResult.score ?? 100;

    // Check if job already has a primary worker
    const hasPrimaryWorker = context.currentWorkers.some(
      (w) => w.role === AssignmentWorkerRole.PRIMARY
    );

    if (hasPrimaryWorker) {
      reasons.push('Job already has a primary worker assigned');
      score -= 100;
    }

    // Check max distance constraint
    if (
      context.destinations.length > 0 &&
      candidate.location &&
      context.constraints.maxDistanceKm
    ) {
      const firstDestination = context.destinations[0];
      const distance = this.calculateDistance(candidate.location, firstDestination.location);

      if (distance > context.constraints.maxDistanceKm) {
        reasons.push(
          `Worker is ${distance.toFixed(1)}km away, exceeds maximum ${
            context.constraints.maxDistanceKm
          }km`
        );
        score -= 25;
      }
    }

    // Bonus points for preferred workers
    if (context.constraints.preferredWorkerIds?.includes(candidate.workerId)) {
      score += 10;
    }

    const valid = reasons.length === baseResult.reasons.length && score > 0;

    return {
      valid,
      reasons,
      score: Math.max(0, Math.min(100, score)),
    };
  }

  /**
   * High priority for single worker jobs.
   */
  getPriority(context: AssignmentContext): number {
    // Check if this strategy can handle the context
    const totalRequiredWorkers = context.requiredWorkerTypes.reduce(
      (sum, req) => sum + req.minWorkers,
      0
    );

    if (totalRequiredWorkers <= 1 && !context.constraints.maxWorkers) {
      return 100;
    }
    return 0;
  }
}
