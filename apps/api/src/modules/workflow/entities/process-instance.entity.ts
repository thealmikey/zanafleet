import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { ProcessDefinitionEntity , ProcessState } from './process-definition.entity';

/**
 * Process Instance Status Enum
 *
 * Runtime status of a process instance.
 */
export enum ProcessInstanceStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

/**
 * Related Entity Reference
 *
 * Links to other domain entities (orders, users, vehicles, etc.)
 */
export interface ProcessRelatedEntity {
  entityType: string;
  entityId: string;
  role: string;
  linkedAt: Date;
}

/**
 * Process History Entry
 *
 * Audit trail of state transitions.
 */
export interface ProcessHistoryEntry {
  transitionId: string;
  fromState: string;
  toState: string;
  eventType: string;
  eventId: string;
  triggeredBy: string;
  contextSnapshot: Record<string, unknown>;
  timestamp: Date;
  guardResults?: GuardEvaluationResult[];
}

/**
 * Guard Evaluation Result
 *
 * Result of policy/condition evaluation for a transition.
 */
export interface GuardEvaluationResult {
  guardName: string;
  passed: boolean;
  reason: string;
  policyId?: string;
}

/**
 * Process Instance Entity
 *
 * Runtime instance of a process definition.
 * Tracks current state, context, and related entities.
 */
@Entity({ name: 'process_instances' })
@Index('IDX_process_instances_definition_status', ['definitionId', 'status'])
@Index('IDX_process_instances_state_status', ['currentState', 'status'])
@Index('IDX_process_instances_created_at', ['createdAt'])
export class ProcessInstanceEntity {
  @PrimaryColumn('uuid')
  instanceId!: string;

  @Index('IDX_process_instances_definition_id')
  @Column('uuid')
  definitionId!: string;

  @ManyToOne(() => ProcessDefinitionEntity)
  @JoinColumn({ name: 'definitionId' })
  definition!: ProcessDefinitionEntity;

  @Column()
  name!: string;

  @Column({
    type: 'enum',
    enum: ProcessState,
    default: ProcessState.DRAFT,
  })
  currentState!: ProcessState;

  @Column({
    type: 'enum',
    enum: ProcessInstanceStatus,
    default: ProcessInstanceStatus.ACTIVE,
  })
  status!: ProcessInstanceStatus;

  @Column('jsonb', { default: {} })
  context!: Record<string, unknown>;

  @Column('jsonb', { default: [] })
  relatedEntities!: ProcessRelatedEntity[];

  @Column({ nullable: true })
  triggeredBy!: string;

  @Column({ nullable: true, type: 'varchar' })
  correlationId!: string | undefined;

  @Column({ nullable: true, type: 'varchar' })
  parentInstanceId!: string | undefined;

  @Column({ nullable: true, type: 'timestamp with time zone' })
  expiresAt!: Date | undefined;

  @Column({ default: 0 })
  transitionCount!: number;

  @Column('jsonb', { default: [] })
  history!: ProcessHistoryEntry[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt!: Date | null;

  /**
   * Convert entity to domain representation
   */
  toDomain(): {
    instanceId: string;
    definitionId: string;
    name: string;
    currentState: ProcessState;
    status: ProcessInstanceStatus;
    context: Record<string, unknown>;
    relatedEntities: ProcessRelatedEntity[];
    triggeredBy: string | undefined;
    correlationId: string | undefined;
    parentInstanceId: string | undefined;
    expiresAt: Date | undefined;
    transitionCount: number;
    history: ProcessHistoryEntry[];
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
  } {
    return {
      instanceId: this.instanceId,
      definitionId: this.definitionId,
      name: this.name,
      currentState: this.currentState,
      status: this.status,
      context: this.context,
      relatedEntities: this.relatedEntities,
      triggeredBy: this.triggeredBy,
      correlationId: this.correlationId,
      parentInstanceId: this.parentInstanceId,
      expiresAt: this.expiresAt,
      transitionCount: this.transitionCount,
      history: this.history,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    instanceId: string;
    definitionId: string;
    name: string;
    currentState: ProcessState;
    status?: ProcessInstanceStatus;
    context?: Record<string, unknown>;
    relatedEntities?: ProcessRelatedEntity[];
    triggeredBy?: string;
    correlationId?: string;
    parentInstanceId?: string;
    expiresAt?: Date;
    transitionCount?: number;
    history?: ProcessHistoryEntry[];
    createdAt: Date;
    completedAt?: Date | null;
  }): ProcessInstanceEntity {
    const e = new ProcessInstanceEntity();
    e.instanceId = data.instanceId;
    e.definitionId = data.definitionId;
    e.name = data.name;
    e.currentState = data.currentState;
    e.status = data.status ?? ProcessInstanceStatus.ACTIVE;
    e.context = data.context ?? {};
    e.relatedEntities = data.relatedEntities ?? [];
    e.triggeredBy = data.triggeredBy ?? '';
    e.correlationId = data.correlationId;
    e.parentInstanceId = data.parentInstanceId;
    e.expiresAt = data.expiresAt;
    e.transitionCount = data.transitionCount ?? 0;
    e.history = data.history ?? [];
    e.createdAt = data.createdAt;
    e.completedAt = data.completedAt ?? null;
    return e;
  }
}
