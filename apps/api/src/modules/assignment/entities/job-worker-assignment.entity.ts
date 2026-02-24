import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, Unique } from 'typeorm';

import { AssignmentStatus, AssignmentWorkerRole } from '../interfaces';

/**
 * Job Worker Assignment Entity
 *
 * Represents the assignment of a worker to a job.
 * Supports multi-worker assignments with roles (primary, helper, supervisor).
 */
@Entity('job_worker_assignments')
@Unique('UQ_job_worker_assignment', ['jobId', 'workerId'])
@Index('IDX_job_assignments_job', ['jobId'])
@Index('IDX_job_assignments_worker', ['workerId'])
@Index('IDX_job_assignments_workspace', ['workspaceId'])
@Index('IDX_job_assignments_status', ['status'])
export class JobWorkerAssignmentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  jobId!: string;

  @Column('uuid')
  workerId!: string;

  @Column('varchar', { length: 100 })
  workerType!: string;

  @Column('varchar', { length: 50, default: AssignmentWorkerRole.PRIMARY })
  role!: AssignmentWorkerRole;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  assignedAt!: Date;

  @Column('uuid', { nullable: true })
  assignedBy!: string | null;

  @Column('varchar', { length: 50 })
  assignmentMethod!: string;

  @Column('varchar', { length: 50, default: AssignmentStatus.PENDING })
  status!: AssignmentStatus;

  @Column('int', { default: 1 })
  version!: number;

  @Column('uuid')
  workspaceId!: string;

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column('timestamp with time zone', { nullable: true })
  updatedAt!: Date | null;

  @Column('timestamp with time zone', { nullable: true })
  acceptedAt!: Date | null;

  @Column('timestamp with time zone', { nullable: true })
  declinedAt!: Date | null;

  @Column('timestamp with time zone', { nullable: true })
  completedAt!: Date | null;

  @Column('timestamp with time zone', { nullable: true })
  cancelledAt!: Date | null;
}

/**
 * Assignment Audit Log Entity
 *
 * Tracks all assignment actions for audit purposes.
 */
@Entity('assignment_audit_logs')
@Index('IDX_assignment_audit_job', ['jobId'])
@Index('IDX_assignment_audit_worker', ['workerId'])
@Index('IDX_assignment_audit_strategy', ['strategyType'])
@Index('IDX_assignment_audit_created', ['createdAt'])
export class AssignmentAuditLogEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  jobId!: string;

  @Column('uuid', { nullable: true })
  workerId!: string | null;

  @Column('varchar', { length: 50 })
  strategyType!: string;

  @Column('varchar', { length: 50 })
  action!: string;

  @Column('varchar', { length: 50 })
  result!: string;

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column('uuid', { nullable: true })
  actorId!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
