import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';

import {
  AssignmentAuditLogEntity,
  JobWorkerAssignmentEntity,
} from '../entities/job-worker-assignment.entity';
import { AssignmentStatus, AssignmentWorkerRole } from '../interfaces';

/**
 * Assignment Repository
 *
 * Repository for managing job-worker assignments.
 */
@Injectable()
export class AssignmentRepository {
  private readonly logger = new Logger(AssignmentRepository.name);

  constructor(
    @InjectRepository(JobWorkerAssignmentEntity)
    private readonly assignmentRepository: Repository<JobWorkerAssignmentEntity>,
    @InjectRepository(AssignmentAuditLogEntity)
    private readonly auditRepository: Repository<AssignmentAuditLogEntity>
  ) {}

  /**
   * Create a new assignment.
   */
  async create(params: {
    jobId: string;
    workerId: string;
    workerType: string;
    role: AssignmentWorkerRole;
    assignedAt: Date;
    assignmentMethod: string;
    status: AssignmentStatus;
    workspaceId: string;
    assignedBy?: string;
    metadata?: Record<string, unknown>;
  }): Promise<JobWorkerAssignmentEntity> {
    const assignment = new JobWorkerAssignmentEntity();
    assignment.id = randomUUID();
    assignment.jobId = params.jobId;
    assignment.workerId = params.workerId;
    assignment.workerType = params.workerType;
    assignment.role = params.role;
    assignment.assignedAt = params.assignedAt;
    assignment.assignmentMethod = params.assignmentMethod;
    assignment.status = params.status;
    assignment.workspaceId = params.workspaceId;
    assignment.assignedBy = params.assignedBy || null;
    assignment.metadata = params.metadata || null;
    assignment.version = 1;

    const saved = await this.assignmentRepository.save(assignment);

    this.logger.log(
      `Created assignment ${saved.id} for job ${params.jobId}, worker ${params.workerId}`
    );

    // Create audit log
    await this.logAudit({
      jobId: params.jobId,
      workerId: params.workerId,
      strategyType: params.assignmentMethod,
      action: 'created',
      result: 'success',
      metadata: { role: params.role, status: params.status },
    });

    return saved;
  }

  /**
   * Find assignments by job ID.
   */
  async findByJobId(jobId: string): Promise<JobWorkerAssignmentEntity[]> {
    return this.assignmentRepository.find({
      where: { jobId },
      order: { assignedAt: 'ASC' },
    });
  }

  /**
   * Find assignments by worker ID.
   */
  async findByWorkerId(workerId: string): Promise<JobWorkerAssignmentEntity[]> {
    return this.assignmentRepository.find({
      where: { workerId },
      order: { assignedAt: 'DESC' },
    });
  }

  /**
   * Find a specific assignment.
   */
  async findOne(jobId: string, workerId: string): Promise<JobWorkerAssignmentEntity | null> {
    return this.assignmentRepository.findOne({
      where: { jobId, workerId },
    });
  }

  /**
   * Update assignment status.
   */
  async updateStatus(jobId: string, workerId: string, status: AssignmentStatus): Promise<void> {
    await this.assignmentRepository.update(
      { jobId, workerId },
      {
        status,
        updatedAt: new Date(),
      }
    );

    this.logger.log(`Updated assignment status to ${status} for job ${jobId}, worker ${workerId}`);

    // Log status change
    await this.logAudit({
      jobId,
      workerId,
      strategyType: 'system',
      action: 'status_changed',
      result: 'success',
      metadata: { newStatus: status },
    });
  }

  /**
   * Accept an assignment.
   */
  async accept(jobId: string, workerId: string): Promise<void> {
    await this.assignmentRepository.update(
      { jobId, workerId },
      {
        status: AssignmentStatus.ACCEPTED,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      }
    );

    await this.logAudit({
      jobId,
      workerId,
      strategyType: 'system',
      action: 'accepted',
      result: 'success',
    });
  }

  /**
   * Decline an assignment.
   */
  async decline(jobId: string, workerId: string): Promise<void> {
    await this.assignmentRepository.update(
      { jobId, workerId },
      {
        status: AssignmentStatus.DECLINED,
        declinedAt: new Date(),
        updatedAt: new Date(),
      }
    );

    await this.logAudit({
      jobId,
      workerId,
      strategyType: 'system',
      action: 'declined',
      result: 'success',
    });
  }

  /**
   * Complete an assignment.
   */
  async complete(jobId: string, workerId: string): Promise<void> {
    await this.assignmentRepository.update(
      { jobId, workerId },
      {
        status: AssignmentStatus.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date(),
      }
    );

    await this.logAudit({
      jobId,
      workerId,
      strategyType: 'system',
      action: 'completed',
      result: 'success',
    });
  }

  /**
   * Cancel an assignment.
   */
  async cancel(jobId: string, workerId: string, cancelledBy?: string): Promise<void> {
    await this.assignmentRepository.update(
      { jobId, workerId },
      {
        status: AssignmentStatus.CANCELLED,
        cancelledAt: new Date(),
        updatedAt: new Date(),
        metadata: { cancelledBy },
      }
    );

    await this.logAudit({
      jobId,
      workerId,
      strategyType: 'system',
      action: 'cancelled',
      result: 'success',
      metadata: { cancelledBy },
    });
  }

  /**
   * Get active assignments for a worker.
   */
  async getActiveAssignmentsForWorker(workerId: string): Promise<JobWorkerAssignmentEntity[]> {
    return this.assignmentRepository
      .createQueryBuilder('assignment')
      .where('assignment.workerId = :workerId', { workerId })
      .andWhere('assignment.status IN (:...statuses)', {
        statuses: [AssignmentStatus.PENDING, AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED],
      })
      .getMany();
  }

  /**
   * Get active assignments for a job.
   */
  async getActiveAssignmentsForJob(jobId: string): Promise<JobWorkerAssignmentEntity[]> {
    return this.assignmentRepository
      .createQueryBuilder('assignment')
      .where('assignment.jobId = :jobId', { jobId })
      .andWhere('assignment.status IN (:...statuses)', {
        statuses: [AssignmentStatus.PENDING, AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED],
      })
      .getMany();
  }

  /**
   * Log an audit entry.
   */
  private async logAudit(params: {
    jobId: string;
    workerId?: string;
    strategyType: string;
    action: string;
    result: string;
    metadata?: Record<string, unknown>;
    actorId?: string;
  }): Promise<void> {
    const audit = new AssignmentAuditLogEntity();
    audit.id = randomUUID();
    audit.jobId = params.jobId;
    audit.workerId = params.workerId || null;
    audit.strategyType = params.strategyType;
    audit.action = params.action;
    audit.result = params.result;
    audit.metadata = params.metadata || null;
    audit.actorId = params.actorId || null;

    await this.auditRepository.save(audit);
  }
}
