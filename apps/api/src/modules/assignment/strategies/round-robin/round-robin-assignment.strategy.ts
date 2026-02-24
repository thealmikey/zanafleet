import { Injectable } from '@nestjs/common';

import {
  AssignmentAssignment,
  AssignmentContext,
  AssignmentResult,
  AssignmentStatus,
  AssignmentStrategyType,
  AssignmentWorkerRole,
  WorkerCandidate,
} from '../../interfaces';
import { BaseAssignmentStrategy } from '../base/base-assignment.strategy';

/**
 * Round Robin Assignment Strategy
 *
 * Assigns workers in a circular order to ensure fair distribution of work.
 * Maintains state of last assigned worker to ensure even distribution.
 */
@Injectable()
export class RoundRobinAssignmentStrategy extends BaseAssignmentStrategy {
  // In-memory state for round-robin tracking (in production, use Redis)
  private lastAssignedIndex: Map<string, number> = new Map();

  constructor() {
    super(AssignmentStrategyType.ROUND_ROBIN, 'Round Robin Assignment');
  }

  /**
   * Round robin can handle any assignment context.
   */
  async canHandle(_context: AssignmentContext): Promise<boolean> {
    return true;
  }

  /**
   * Assign workers using round-robin algorithm.
   */
  async assign(
    context: AssignmentContext,
    candidates: WorkerCandidate[]
  ): Promise<AssignmentResult> {
    this.logger.log(`Starting round-robin assignment for job ${context.jobId}`);

    if (candidates.length === 0) {
      return {
        success: false,
        assignments: [],
        errors: ['No candidates available'],
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

    // Get the last assigned index for this worker type group
    const workerTypeKey = context.requiredWorkerTypes
      .map((r) => r.workerType)
      .sort()
      .join(',');

    const lastIndex = this.lastAssignedIndex.get(workerTypeKey) ?? -1;

    // Calculate next index (round-robin)
    const nextIndex = (lastIndex + 1) % validCandidates.length;
    this.lastAssignedIndex.set(workerTypeKey, nextIndex);

    // Select the next worker in round-robin order
    const selectedWorker = validCandidates[nextIndex];

    const assignment: AssignmentAssignment = {
      workerId: selectedWorker.workerId,
      workerType: selectedWorker.workerType,
      role: AssignmentWorkerRole.PRIMARY,
      assignedAt: new Date(),
      assignmentMethod: AssignmentStrategyType.ROUND_ROBIN,
      status: AssignmentStatus.PENDING,
    };

    this.logger.log(
      `Round-robin assigned worker ${selectedWorker.workerId} (index: ${nextIndex}) to job ${context.jobId}`
    );

    return {
      success: true,
      assignments: [assignment],
      errors: [],
      metadata: {
        roundRobinIndex: nextIndex,
        totalCandidates: validCandidates.length,
      },
    };
  }

  /**
   * Round-robin has medium priority - used for fair distribution.
   */
  getPriority(_context: AssignmentContext): number {
    return 50;
  }

  /**
   * Reset the round-robin state for a worker type group.
   * Useful for testing or manual reset.
   */
  resetState(workerTypeKey?: string): void {
    if (workerTypeKey) {
      this.lastAssignedIndex.delete(workerTypeKey);
    } else {
      this.lastAssignedIndex.clear();
    }
  }
}
