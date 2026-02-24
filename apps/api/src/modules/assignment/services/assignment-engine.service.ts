import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { AssignmentCompletedEventV1 } from '../events/assignment-completed.event';
import { AssignmentFailedEventV1 } from '../events/assignment-failed.event';
import { AssignmentStartedEventV1 } from '../events/assignment-started.event';
import {
  AssignmentContext,
  AssignmentResult,
  AssignmentStrategy,
  AssignmentStrategyType,
  JobDestination,
  WorkerCandidate,
} from '../interfaces';
import { AssignmentStrategyRegistry } from '../registry/assignment-strategy.registry';
import { AssignmentRepository } from '../repositories/assignment.repository';
import { AssignmentContextService } from './assignment-context.service';
import { WorkerCandidateService } from './worker-candidate.service';

/**
 * Assignment Engine Options
 */
export interface AssignmentEngineOptions {
  /** Strategy type to use. If not specified, automatic selection is used. */
  strategyType?: AssignmentStrategyType;
  /** Whether to publish events. Defaults to true. */
  publishEvents?: boolean;
  /** Maximum candidates to consider. Defaults to 50. */
  maxCandidates?: number;
}

/**
 * Job Assignment Data
 */
interface JobAssignmentData {
  id: string;
  jobTypeId: string;
  workspaceId: string;
  destinations: JobDestination[];
  deadline?: Date;
}

/**
 * Assignment Engine Service
 *
 * Core orchestration service for job-worker assignment.
 * Coordinates between strategy registry, candidate service, and context service.
 */
@Injectable()
export class AssignmentEngineService {
  private readonly logger = new Logger(AssignmentEngineService.name);

  constructor(
    private readonly registry: AssignmentStrategyRegistry,
    private readonly candidateService: WorkerCandidateService,
    private readonly contextService: AssignmentContextService,
    private readonly assignmentRepository: AssignmentRepository,
    private readonly eventBus: EventBusService
  ) {}

  /**
   * Execute assignment for a job.
   */
  async assign(params: {
    job: JobAssignmentData;
    options?: AssignmentEngineOptions;
  }): Promise<AssignmentResult> {
    const startTime = Date.now();
    const { job, options = {} } = params;
    const requestId = randomUUID();

    this.logger.log(`Starting assignment for job ${job.id} (request: ${requestId})`);

    try {
      // Build the assignment context
      const context = await this.contextService.buildContext({
        job,
        metadata: options,
      });

      // Find or select the strategy
      const strategy = await this.getStrategy(context, options.strategyType);

      if (!strategy) {
        throw new Error('No suitable assignment strategy found');
      }

      // Publish assignment started event
      if (options.publishEvents !== false) {
        await this.publishAssignmentStarted(context, strategy, requestId);
      }

      // Get available candidates
      const candidates = await this.findCandidates(context, options.maxCandidates || 50);

      this.logger.log(`Found ${candidates.length} candidates for job ${job.id}`);

      // Execute the assignment
      const result = await strategy.assign(context, candidates);

      // Persist the assignments
      if (result.success && result.assignments.length > 0) {
        await this.persistAssignments(job.id, job.workspaceId, result.assignments, strategy.type);
      }

      // Calculate duration
      const durationMs = Date.now() - startTime;

      // Publish assignment completed event
      if (options.publishEvents !== false) {
        await this.publishAssignmentCompleted(context, result, strategy, requestId, durationMs);
      }

      this.logger.log(
        `Assignment completed for job ${job.id}: ${
          result.success ? 'success' : 'failed'
        } (${durationMs}ms)`
      );

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // Publish assignment failed event
      if (options.publishEvents !== false) {
        await this.publishAssignmentFailed(job.id, job.workspaceId, error, requestId, durationMs);
      }

      this.logger.error(
        `Assignment failed for job ${job.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined
      );

      throw error;
    }
  }

  /**
   * Get the strategy to use for assignment.
   */
  private async getStrategy(
    context: AssignmentContext,
    explicitType?: AssignmentStrategyType
  ): Promise<AssignmentStrategy | undefined> {
    if (explicitType) {
      const strategy = this.registry.get(explicitType);
      if (!strategy) {
        throw new Error(`Strategy ${explicitType} is not registered`);
      }

      const canHandle = await strategy.canHandle(context);
      if (!canHandle) {
        throw new Error(`Strategy ${explicitType} cannot handle this assignment context`);
      }

      return strategy;
    }

    // Auto-select best strategy
    return this.registry.findBestStrategy(context);
  }

  /**
   * Find available candidates for the job.
   */
  private async findCandidates(
    context: AssignmentContext,
    limit: number
  ): Promise<WorkerCandidate[]> {
    const workerTypes = context.constraints.workerTypes;

    const candidates = await this.candidateService.findCandidates({
      workspaceId: context.workspaceId,
      workerTypes: workerTypes,
      requiredCapabilities: context.constraints.requiredCapabilities,
    });

    // Apply limit
    return candidates.slice(0, limit);
  }

  /**
   * Persist assignments to database.
   */
  private async persistAssignments(
    jobId: string,
    workspaceId: string,
    assignments: AssignmentResult['assignments'],
    strategyType: AssignmentStrategyType
  ): Promise<void> {
    for (const assignment of assignments) {
      await this.assignmentRepository.create({
        jobId,
        workerId: assignment.workerId,
        workerType: assignment.workerType,
        role: assignment.role,
        assignedAt: assignment.assignedAt,
        assignmentMethod: strategyType,
        status: assignment.status,
        workspaceId,
      });
    }
  }

  /**
   * Publish assignment started event.
   */
  private async publishAssignmentStarted(
    context: AssignmentContext,
    strategy: AssignmentStrategy,
    requestId: string
  ): Promise<void> {
    const event = new AssignmentStartedEventV1({
      eventId: randomUUID(),
      jobId: context.jobId,
      jobTypeId: context.jobTypeId,
      workspaceId: context.workspaceId,
      strategyType: strategy.type,
      strategyName: strategy.name,
      requiredWorkerCount: context.requiredWorkerTypes.reduce(
        (sum, req) => sum + req.minWorkers,
        0
      ),
      correlationId: requestId,
    });

    await this.eventBus.publishEvent(event);
  }

  /**
   * Publish assignment completed event.
   */
  private async publishAssignmentCompleted(
    context: AssignmentContext,
    result: AssignmentResult,
    strategy: AssignmentStrategy,
    requestId: string,
    durationMs: number
  ): Promise<void> {
    const event = new AssignmentCompletedEventV1({
      eventId: randomUUID(),
      jobId: context.jobId,
      jobTypeId: context.jobTypeId,
      workspaceId: context.workspaceId,
      strategyType: strategy.type,
      strategyName: strategy.name,
      success: result.success,
      assignedWorkerCount: result.assignments.length,
      errors: result.errors,
      durationMs,
      correlationId: requestId,
    });

    await this.eventBus.publishEvent(event);
  }

  /**
   * Publish assignment failed event.
   */
  private async publishAssignmentFailed(
    jobId: string,
    workspaceId: string,
    error: unknown,
    requestId: string,
    durationMs: number
  ): Promise<void> {
    const event = new AssignmentFailedEventV1({
      eventId: randomUUID(),
      jobId,
      workspaceId,
      error: error instanceof Error ? error.message : String(error),
      durationMs,
      correlationId: requestId,
    });

    await this.eventBus.publishEvent(event);
  }

  /**
   * Get available strategies.
   */
  getStrategies(): AssignmentStrategy[] {
    return this.registry.getAll();
  }

  /**
   * Check if a strategy is available.
   */
  hasStrategy(type: AssignmentStrategyType): boolean {
    return this.registry.has(type);
  }
}
