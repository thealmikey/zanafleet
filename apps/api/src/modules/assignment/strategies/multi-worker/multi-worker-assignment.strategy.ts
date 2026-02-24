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
  WorkerRequirement,
} from '../../interfaces';

/**
 * Multi Worker Assignment Strategy
 *
 * Assigns multiple workers to a job based on JobType worker requirements.
 * Supports primary, helper, and supervisor roles.
 */
@Injectable()
export class MultiWorkerAssignmentStrategy extends BaseAssignmentStrategy {
  constructor() {
    super(AssignmentStrategyType.MULTI_WORKER, 'Multi Worker Assignment');
  }

  /**
   * Multi worker strategy handles jobs requiring multiple workers.
   */
  async canHandle(context: AssignmentContext): Promise<boolean> {
    const totalRequiredWorkers = context.requiredWorkerTypes.reduce(
      (sum, req) => sum + req.minWorkers,
      0
    );

    return totalRequiredWorkers > 1 || !!context.constraints.maxWorkers;
  }

  /**
   * Assign multiple workers based on JobType requirements.
   */
  async assign(
    context: AssignmentContext,
    candidates: WorkerCandidate[]
  ): Promise<AssignmentResult> {
    this.logger.log(
      `Starting multi worker assignment for job ${context.jobId} with ${candidates.length} candidates`
    );

    const assignments: AssignmentAssignment[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get requirements grouped by worker type
    const requirementsByType = this.groupRequirementsByType(context.requiredWorkerTypes);

    // Track which workers have been assigned
    const assignedWorkerIds = new Set<string>();

    // First pass: assign primary workers
    const primaryRequirement = requirementsByType.get('primary') || {
      workerType: 'default',
      minWorkers: 1,
      required: true,
    };

    const primaryCandidates = this.filterByWorkerType(candidates, primaryRequirement.workerType);
    const primaryAssignments = await this.assignWorkersByRole(
      primaryCandidates,
      context,
      AssignmentWorkerRole.PRIMARY,
      primaryRequirement.minWorkers,
      assignedWorkerIds
    );

    assignments.push(...primaryAssignments.assignments);
    primaryAssignments.assignedWorkerIds.forEach((id) => assignedWorkerIds.add(id));
    errors.push(...primaryAssignments.errors);
    warnings.push(...primaryAssignments.warnings);

    // Second pass: assign helper workers
    const helperRequirement = requirementsByType.get('helper');
    if (helperRequirement && helperRequirement.minWorkers > 0) {
      const helperCandidates = this.filterByWorkerType(
        candidates,
        helperRequirement.workerType
      ).filter((c) => !assignedWorkerIds.has(c.workerId));

      const helperAssignments = await this.assignWorkersByRole(
        helperCandidates,
        context,
        AssignmentWorkerRole.HELPER,
        helperRequirement.minWorkers,
        assignedWorkerIds
      );

      assignments.push(...helperAssignments.assignments);
      errors.push(...helperAssignments.errors);
      warnings.push(...helperAssignments.warnings);
    }

    // Third pass: assign supervisor workers
    const supervisorRequirement = requirementsByType.get('supervisor');
    if (supervisorRequirement && supervisorRequirement.minWorkers > 0) {
      const supervisorCandidates = this.filterByWorkerType(
        candidates,
        supervisorRequirement.workerType
      ).filter((c) => !assignedWorkerIds.has(c.workerId));

      const supervisorAssignments = await this.assignWorkersByRole(
        supervisorCandidates,
        context,
        AssignmentWorkerRole.SUPERVISOR,
        supervisorRequirement.minWorkers,
        assignedWorkerIds
      );

      assignments.push(...supervisorAssignments.assignments);
      errors.push(...supervisorAssignments.errors);
      warnings.push(...supervisorAssignments.warnings);
    }

    // Check if all requirements were met
    const totalAssigned = assignments.length;
    const totalRequired = context.requiredWorkerTypes.reduce((sum, req) => sum + req.minWorkers, 0);

    if (totalAssigned < totalRequired) {
      warnings.push(`Only assigned ${totalAssigned} of ${totalRequired} required workers`);
    }

    const success = assignments.length > 0;

    this.logger.log(
      `Multi worker assignment completed: ${success ? 'success' : 'failed'} for job ${
        context.jobId
      }`
    );

    return {
      success,
      assignments,
      errors: errors.length > 0 ? errors : [],
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate a candidate for multi worker assignment.
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

    // Check if worker is already assigned to this job
    if (context.currentWorkers.some((w) => w.workerId === candidate.workerId)) {
      reasons.push('Worker is already assigned to this job');
      score -= 50;
    }

    // Check if adding this worker would exceed max workers constraint
    const currentCount = context.currentWorkers.length;
    if (context.constraints.maxWorkers && currentCount >= context.constraints.maxWorkers) {
      reasons.push('Maximum number of workers already assigned');
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
   * High priority for multi worker jobs.
   */
  getPriority(context: AssignmentContext): number {
    const totalRequiredWorkers = context.requiredWorkerTypes.reduce(
      (sum, req) => sum + req.minWorkers,
      0
    );

    if (totalRequiredWorkers > 1 || !!context.constraints.maxWorkers) {
      return 100;
    }
    return 0;
  }

  /**
   * Group worker requirements by role/type.
   */
  private groupRequirementsByType(
    requirements: WorkerRequirement[]
  ): Map<string, WorkerRequirement> {
    const grouped = new Map<string, WorkerRequirement>();

    for (const req of requirements) {
      const key = req.workerType || 'default';
      const existing = grouped.get(key);

      if (existing) {
        existing.minWorkers += req.minWorkers;
        if (req.maxWorkers && (!existing.maxWorkers || req.maxWorkers > existing.maxWorkers)) {
          existing.maxWorkers = req.maxWorkers;
        }
      } else {
        grouped.set(key, { ...req });
      }
    }

    return grouped;
  }

  /**
   * Filter candidates by worker type.
   */
  private filterByWorkerType(candidates: WorkerCandidate[], workerType: string): WorkerCandidate[] {
    if (!workerType || workerType === 'default') {
      return candidates;
    }

    return candidates.filter((c) => c.workerType === workerType);
  }

  /**
   * Assign workers for a specific role.
   */
  private async assignWorkersByRole(
    candidates: WorkerCandidate[],
    context: AssignmentContext,
    role: AssignmentWorkerRole,
    minWorkers: number,
    alreadyAssigned: Set<string>
  ): Promise<{
    assignments: AssignmentAssignment[];
    assignedWorkerIds: string[];
    errors: string[];
    warnings: string[];
  }> {
    const assignments: AssignmentAssignment[] = [];
    const assignedWorkerIds: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Filter valid candidates
    const validCandidates = await this.filterValidCandidates(candidates, context);

    // Filter out already assigned workers
    const availableCandidates = validCandidates.filter((c) => !alreadyAssigned.has(c.workerId));

    // Assign workers up to the minimum required
    let assigned = 0;
    for (const candidate of availableCandidates) {
      if (assigned >= minWorkers) {
        break;
      }

      const assignment: AssignmentAssignment = {
        workerId: candidate.workerId,
        workerType: candidate.workerType,
        role,
        assignedAt: new Date(),
        assignmentMethod: AssignmentStrategyType.MULTI_WORKER,
        status: AssignmentStatus.PENDING,
      };

      assignments.push(assignment);
      assignedWorkerIds.push(candidate.workerId);
      alreadyAssigned.add(candidate.workerId);
      assigned++;
    }

    if (assigned < minWorkers) {
      errors.push(`Could not assign enough ${role} workers: needed ${minWorkers}, got ${assigned}`);
    }

    return { assignments, assignedWorkerIds, errors, warnings };
  }
}
