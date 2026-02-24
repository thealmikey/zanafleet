/**
 * JobType Entity
 *
 * Core entity for JobType Registry - represents a job type template
 * that defines worker requirements, metadata fields, workflows, and configuration
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

import { JobTypeMode, JobTypeStatus, Vertical } from '../dto/job-type.enums';
import { JobTypeWorkerConfigEntity } from './job-type-worker-config.entity';
import { JobTypeMetadataFieldEntity } from './job-type-metadata-field.entity';
import {
  AssignmentStrategyConfig,
  PricingStrategyConfig,
  UILayoutConfig,
  SLARulesConfig,
} from '../dto/job-type.response.dto';

/**
 * JobType Entity
 *
 * Represents a job type template that defines:
 * - Which vertical it belongs to
 * - Worker type requirements
 * - Required metadata fields
 * - Workflow template reference
 * - Assignment strategy
 * - Pricing strategy
 * - UI layout configuration
 * - SLA rules
 *
 * Key Design Decisions:
 * - Uses JSONB for flexible configuration (strategies, UI layouts)
 * - References ProcessDefinitionEntity for workflow templates
 * - Separate entities for worker configs and metadata fields for normalized data
 */
@Entity('job_types')
@Index(['workspaceId'])
@Index(['vertical'])
@Index(['status'])
export class JobTypeEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  workspaceId!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('enum', { enum: Vertical })
  vertical!: Vertical;

  @Column('enum', { enum: JobTypeMode, default: JobTypeMode.INTERNAL })
  mode!: JobTypeMode;

  @Column('enum', { enum: JobTypeStatus, default: JobTypeStatus.ACTIVE })
  status!: JobTypeStatus;

  // Worker Configuration
  @OneToMany(() => JobTypeWorkerConfigEntity, (config) => config.jobType, {
    cascade: true,
    eager: true,
  })
  workerConfigs!: JobTypeWorkerConfigEntity[];

  // Metadata Fields
  @OneToMany(() => JobTypeMetadataFieldEntity, (field) => field.jobType, {
    cascade: true,
    eager: true,
  })
  metadataFields!: JobTypeMetadataFieldEntity[];

  // Workflow Template Reference (links to ProcessDefinitionEntity)
  @Column('uuid', { nullable: true })
  workflowDefinitionId!: string | null;

  // Assignment Strategy (JSONB for flexibility)
  @Column('jsonb', { default: {} })
  assignmentStrategy!: AssignmentStrategyConfig;

  // Pricing Strategy (JSONB for flexibility)
  @Column('jsonb', { default: {} })
  pricingStrategy!: PricingStrategyConfig;

  // UI Layout Configuration (JSONB for flexibility)
  @Column('jsonb', { default: {} })
  uiLayoutConfig!: UILayoutConfig;

  // SLA Rules (JSONB for flexibility)
  @Column('jsonb', { default: {} })
  slaRules!: SLARulesConfig;

  // Multi-worker and Multi-destination flags
  @Column('boolean', { default: false })
  supportsMultipleWorkers!: boolean;

  @Column('boolean', { default: false })
  supportsMultipleDestinations!: boolean;

  // Vertical-specific settings (flexible JSONB)
  @Column('jsonb', { nullable: true })
  verticalSpecificSettings!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object for API response
   */
  toDomain(): Record<string, unknown> {
    return {
      id: this.id,
      workspaceId: this.workspaceId,
      name: this.name,
      description: this.description,
      vertical: this.vertical,
      mode: this.mode,
      status: this.status,
      workflowDefinitionId: this.workflowDefinitionId,
      assignmentStrategy: this.assignmentStrategy,
      pricingStrategy: this.pricingStrategy,
      uiLayoutConfig: this.uiLayoutConfig,
      slaRules: this.slaRules,
      supportsMultipleWorkers: this.supportsMultipleWorkers,
      supportsMultipleDestinations: this.supportsMultipleDestinations,
      verticalSpecificSettings: this.verticalSpecificSettings,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      workerConfigs: this.workerConfigs?.map((wc) => wc.toDomain()) ?? [],
      metadataFields: this.metadataFields?.map((mf) => mf.toDomain()) ?? [],
    };
  }

  /**
   * Convert entity to UI config for frontend consumption
   */
  toUIConfig(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      vertical: this.vertical,
      mode: this.mode,
      metadataFields:
        this.metadataFields
          ?.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
          .map((f) => f.toDomain()) ?? [],
      uiLayout: this.uiLayoutConfig,
      workerTypes:
        this.workerConfigs?.map((wc) => ({
          type: wc.workerType,
          minCount: wc.minWorkers,
          maxCount: wc.maxWorkers,
          required: wc.required,
        })) ?? [],
      supportsMultiWorker: this.supportsMultipleWorkers,
      supportsMultiDestination: this.supportsMultipleDestinations,
    };
  }
}
