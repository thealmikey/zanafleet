import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JobTypeEntity } from '../../job-type/entities/job-type.entity';
import {
  AssignedWorker,
  AssignmentConstraints,
  AssignmentContext,
  JobDestination,
  WorkerRequirement,
} from '../interfaces';

/**
 * Job Entity interface (for reference)
 */
interface JobEntity {
  id: string;
  jobTypeId: string;
  workspaceId: string;
  destinations: JobDestination[];
  deadline?: Date;
}

/**
 * Assignment Context Service
 *
 * Service for building and managing assignment context.
 * Constructs the context needed by assignment strategies.
 */
@Injectable()
export class AssignmentContextService {
  private readonly logger = new Logger(AssignmentContextService.name);

  constructor(
    @InjectRepository(JobTypeEntity)
    private readonly jobTypeRepository: Repository<JobTypeEntity>
  ) {}

  /**
   * Build assignment context for a job.
   */
  async buildContext(params: {
    job: JobEntity;
    metadata?: Record<string, unknown>;
  }): Promise<AssignmentContext> {
    const { job } = params;
    this.logger.log(`Building assignment context for job ${job.id}`);

    // Fetch job type
    const jobType = await this.jobTypeRepository.findOne({
      where: { id: job.jobTypeId },
    });

    if (!jobType) {
      throw new Error(`JobType ${job.jobTypeId} not found`);
    }

    // Get worker requirements from job type
    const requiredWorkerTypes = this.extractWorkerRequirements(jobType);

    // Get current workers assigned to the job
    const currentWorkers = await this.getCurrentWorkers(job.id);

    // Build the context
    const context: AssignmentContext = {
      jobId: job.id,
      jobTypeId: job.jobTypeId,
      jobTypeName: jobType.name,
      workspaceId: job.workspaceId,
      requiredWorkerTypes,
      currentWorkers,
      destinations: job.destinations || [],
      deadline: job.deadline,
      constraints: this.buildConstraints(jobType, params.metadata),
      metadata: params.metadata,
    };

    // Add optional parameters from metadata
    if (params.metadata?.biddingConfig) {
      context.biddingConfig = params.metadata.biddingConfig as AssignmentContext['biddingConfig'];
    }

    if (params.metadata?.scheduledTime) {
      context.scheduledTime = new Date(params.metadata.scheduledTime as string);
    }

    this.logger.log(
      `Built context for job ${job.id}: ${requiredWorkerTypes.length} worker types required, ${currentWorkers.length} current workers`
    );

    return context;
  }

  /**
   * Build constraints from job type and metadata.
   */
  private buildConstraints(
    jobType: JobTypeEntity,
    metadata?: Record<string, unknown>
  ): AssignmentConstraints {
    const constraints: AssignmentConstraints = {};

    // Get constraints from job type configuration
    const assignmentConfig = jobType.assignmentStrategy as unknown as
      | Record<string, unknown>
      | undefined;

    if (assignmentConfig?.autoAssignmentRules) {
      const rules = assignmentConfig.autoAssignmentRules as Record<string, unknown>;
      constraints.maxDistanceKm = rules.maxDistanceKm as number | undefined;
      constraints.maxLoadFactor = rules.maxLoadFactor as number | undefined;
    }

    // Override with metadata constraints if provided
    if (metadata?.constraints) {
      const metaConstraints = metadata.constraints as Partial<AssignmentConstraints>;
      Object.assign(constraints, metaConstraints);
    }

    // Set default values
    if (!constraints.maxWorkers) {
      const totalRequired =
        jobType.workerConfigs?.reduce((sum, config) => sum + (config.minWorkers || 1), 0) || 1;
      constraints.maxWorkers = totalRequired;
    }

    return constraints;
  }

  /**
   * Extract worker requirements from job type.
   */
  private extractWorkerRequirements(jobType: JobTypeEntity): WorkerRequirement[] {
    if (!jobType.workerConfigs || jobType.workerConfigs.length === 0) {
      // Default to single worker requirement
      return [
        {
          workerType: 'default',
          minWorkers: 1,
          required: true,
        },
      ];
    }

    return jobType.workerConfigs.map((config) => ({
      workerType: config.workerType,
      minWorkers: config.minWorkers || 1,
      maxWorkers: config.maxWorkers || undefined,
      required: config.required,
      qualifications: config.qualifications || undefined,
    }));
  }

  /**
   * Get current workers assigned to a job.
   */
  private async getCurrentWorkers(_jobId: string): Promise<AssignedWorker[]> {
    // Query the job_worker_assignments table
    // For now, return empty array
    // In production, this would query the actual assignments
    return [];
  }
}
