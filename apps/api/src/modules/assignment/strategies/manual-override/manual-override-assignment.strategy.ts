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
 * Manual Override Assignment Strategy
 *
 * Used when an operator or admin manually assigns a worker to a job.
 * Bypasses automated assignment logic and uses the explicitly specified worker.
 */
@Injectable()
export class ManualOverrideAssignmentStrategy extends BaseAssignmentStrategy {
  constructor() {
    super(AssignmentStrategyType.MANUAL_OVERRIDE, 'Manual Override Assignment');
  }

  /**
   * Manual override requires explicit worker ID in metadata.
   */
  async canHandle(context: AssignmentContext): Promise<boolean> {
    const workerId = context.metadata?.manualWorkerId as string | undefined;
    return !!workerId;
  }

  /**
   * Assign the manually specified worker.
   */
  async assign(
    context: AssignmentContext,
    candidates: WorkerCandidate[]
  ): Promise<AssignmentResult> {
    this.logger.log(
      `Starting manual override assignment for job ${context.jobId}`
    );

    const workerId = context.metadata?.manualWorkerId as string | undefined;

    if (!workerId) {
      return {
        success: false,
        assignments: [],
        errors: ['Manual worker ID is required for manual override assignment'],
      };
    }

    // Find the specified worker in candidates
    const specifiedWorker = candidates.find((c) => c.workerId === workerId);

    if (!specifiedWorker) {
      return {
        success: false,
        assignments: [],
        errors: [`Worker ${workerId} not found in available candidates`],
      };
    }

    // Validate the manually specified worker
    const validation = await this.validateCandidate(specifiedWorker, context);

    if (!validation.valid) {
      this.logger.warn(
        `Manual override worker ${workerId} failed validation: ${validation.reasons.join(', ')}`
      );

      // Still allow assignment but with warnings
      return {
        success: false,
        assignments: [],
        errors: [
          `Manual assignment validation failed: ${validation.reasons.join(', ')}`,
        ],
        warnings: validation.warnings,
      };
    }

    const assignment: AssignmentAssignment = {
      workerId: specifiedWorker.workerId,
      workerType: specifiedWorker.workerType,
      role: AssignmentWorkerRole.PRIMARY,
      assignedAt: new Date(),
      assignmentMethod: AssignmentStrategyType.MANUAL_OVERRIDE,
      status: AssignmentStatus.PENDING,
    };

    this.logger.log(
      `Manual override assigned worker ${specifiedWorker.workerId} to job ${context.jobId}`
    );

    return {
      success: true,
      assignments: [assignment],
      errors: [],
      metadata: {
        manuallyAssigned: true,
        assignedBy: context.metadata?.assignedBy as string | undefined,
      },
    };
  }

  /**
   * Validate manually assigned worker.
   * Manual assignments bypass most restrictions but still check basic eligibility.
   */
  async validateCandidate(
    candidate: WorkerCandidate,
    context: AssignmentContext
  ): Promise<ValidationResult> {
    const reasons: string[] = [];
    let score = 100;
    const warnings: string[] = [];

    // Basic availability check
    if (candidate.availabilityStatus === 'offline') {
      reasons.push('Worker is offline');
      score -= 30;
    }

    // Check if worker is already assigned to this job
    if (context.currentWorkers.some((w) => w.workerId === candidate.workerId)) {
      warnings.push('Worker is already assigned to this job');
      score -= 10;
    }

    // Check capacity
    if (candidate.currentLoad >= candidate.maxCapacity) {
      warnings.push('Worker is at maximum capacity');
      score -= 20;
    }

    // Check if worker belongs to the workspace
    if (candidate.workspaceId !== context.workspaceId) {
      reasons.push('Worker does not belong to the workspace');
      score -= 100;
    }

    const valid = reasons.length === 0 && score > 0;

    return {
      valid,
      reasons,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Highest priority - manual overrides take precedence.
   */
  getPriority(context: AssignmentContext): number {
    if (context.metadata?.manualWorkerId) {
      return 200;
    }
    return 0;
  }
}
