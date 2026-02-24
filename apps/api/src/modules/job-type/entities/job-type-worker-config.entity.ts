/**
 * JobType Worker Config Entity
 *
 * Defines worker type requirements for a job type
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { JobTypeEntity } from './job-type.entity';

/**
 * JobTypeWorkerConfigEntity
 *
 * Defines the worker type requirements for a job type including:
 * - Minimum and maximum number of workers
 * - Whether the worker type is required
 * - Qualifications/requirements for the workers
 */
@Entity('job_type_worker_configs')
export class JobTypeWorkerConfigEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  jobTypeId!: string;

  @ManyToOne(() => JobTypeEntity, (jt) => jt.workerConfigs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'jobTypeId' })
  jobType!: JobTypeEntity;

  @Column('varchar', { length: 100 })
  workerType!: string;

  @Column('int', { default: 1 })
  minWorkers!: number;

  @Column('int', { nullable: true })
  maxWorkers!: number | null;

  @Column('boolean', { default: false })
  required!: boolean;

  @Column('jsonb', { nullable: true })
  qualifications!: Record<string, unknown> | null;

  /**
   * Convert entity to domain object
   */
  toDomain(): Record<string, unknown> {
    return {
      id: this.id,
      jobTypeId: this.jobTypeId,
      workerType: this.workerType,
      minWorkers: this.minWorkers,
      maxWorkers: this.maxWorkers,
      required: this.required,
      qualifications: this.qualifications,
    };
  }
}
