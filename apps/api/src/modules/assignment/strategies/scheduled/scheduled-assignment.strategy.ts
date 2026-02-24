import { Injectable } from '@nestjs/common';

import { BaseAssignmentStrategy } from '../base/base-assignment.strategy';
import {
  AssignmentAssignment,
  AssignmentContext,
  AssignmentResult,
  AssignmentStatus,
  AssignmentStrategyType,
  AssignmentWorkerRole,
  WorkerCandidate,
} from '../../interfaces';

/**
 * Scheduled Assignment Strategy
 *
 * Assigns workers for jobs that are scheduled for a future time.
 * Pre-allocates workers in advance to ensure availability.
 */
@Injectable()
export class ScheduledAssignmentStrategy extends BaseAssignmentStrategy {
  constructor() {
    super(AssignmentStrategyType.SCHEDULED, 'Scheduled Assignment');
  }

  /**
   * Scheduled assignment requires a future scheduled time.
   */
  async canHandle(context: AssignmentContext): Promise<boolean> {
    if (!context.scheduledTime) {
      return false;
    }

    // Check if scheduled time is in the future
    const now = new Date();
    const scheduledTime = new Date(context.scheduledTime);
    return scheduledTime > now;
  }

  /**
   * Assign workers for a scheduled job.
   * Similar to single-worker but optimized for future scheduling.
   */
  async assign(
    context: AssignmentContext,
    candidates: WorkerCandidate[]
  ): Promise<AssignmentResult> {
    this.logger.log(
      `Starting scheduled assignment for job ${context.jobId} at ${context.scheduledTime}`
    );

    if (!context.scheduledTime) {
      return {
        success: false,
        assignments: [],
        errors: ['Scheduled time is required for scheduled assignment'],
      };
    }

    // Verify scheduled time is in the future
    const now = new Date();
    const scheduledTime = new Date(context.scheduledTime);

    if (scheduledTime <= now) {
      return {
        success: false,
        assignments: [],
        errors: ['Scheduled time must be in the future'],
      };
    }

    // Filter valid candidates - but be more lenient for scheduled jobs
    const validCandidates = await this.filterValidCandidates(
      candidates,
      context
    );

    if (validCandidates.length === 0) {
      return {
        success: false,
        assignments: [],
        errors: ['No valid candidates available for scheduled assignment'],
      };
    }

    // For scheduled assignments, prefer workers with better availability
    // (workers who are more likely to be available at the scheduled time)
    const sortedCandidates = validCandidates.sort((a, b) => {
      // Prefer available workers
      const aAvailable = a.availabilityStatus === 'available' || a.availabilityStatus === 'on_duty';
      const bAvailable = b.availabilityStatus === 'available' || b.availabilityStatus === 'on_duty';

      if (aAvailable && !bAvailable) return -1;
      if (!aAvailable && bAvailable) return 1;

      // Then prefer lower load
      const aLoad = a.currentLoad / a.maxCapacity;
      const bLoad = b.currentLoad / b.maxCapacity;
      return aLoad - bLoad;
    });

    const selectedWorker = sortedCandidates[0];

    const assignment: AssignmentAssignment = {
      workerId: selectedWorker.workerId,
      workerType: selectedWorker.workerType,
      role: AssignmentWorkerRole.PRIMARY,
      assignedAt: new Date(),
      assignmentMethod: AssignmentStrategyType.SCHEDULED,
      status: AssignmentStatus.PENDING,
    };

    this.logger.log(
      `Scheduled assignment: worker ${selectedWorker.workerId} pre-assigned to job ${context.jobId} for ${context.scheduledTime}`
    );

    return {
      success: true,
      assignments: [assignment],
      errors: [],
      metadata: {
        scheduledTime: context.scheduledTime.toISOString(),
        preAssigned: true,
      },
    };
  }

  /**
   * Medium priority - used when scheduled time is specified.
   */
  getPriority(context: AssignmentContext): number {
    if (context.scheduledTime) {
      const now = new Date();
      const scheduledTime = new Date(context.scheduledTime);

      // Higher priority for closer scheduled times
      const hoursUntilScheduled = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilScheduled <= 1) {
        return 85;
      } else if (hoursUntilScheduled <= 24) {
        return 75;
      } else {
        return 60;
      }
    }
    return 0;
  }
}

