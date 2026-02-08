import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

import {
  PolicyEffect,
  PolicyScope,
  PolicyTrigger,
  EvaluationContext,
} from '../dto';

/**
 * EvaluatedPolicyLogEntry Interface
 * Represents a single policy that was evaluated during decision making.
 * Stored as part of the evaluatedPolicies JSONB array.
 */
export interface EvaluatedPolicyLogEntry {
  policyId: string;
  policyName: string;
  scope: PolicyScope;
  priority: number;
  matched: boolean;
  matchReason: string;
}

/**
 * PolicyDecisionLogEntity
 * Immutable audit log recording every policy evaluation for explainability.
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Indexed columns for common queries
 * - JSONB for complex nested structures (context, evaluated policies)
 * - Immutable records (no updatedAt, no update methods)
 * - requestId for correlation with triggering requests
 */
@Entity('policy_decision_logs')
@Index(['requestId'])
@Index(['workspaceId'])
@Index(['subjectId'])
@Index(['createdAt'])
@Index(['finalEffect'])
export class PolicyDecisionLogEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  requestId!: string;

  @Column('varchar', { length: 255, nullable: true })
  correlationId!: string | null;

  @Column('enum', { enum: PolicyTrigger })
  trigger!: PolicyTrigger;

  @Column('uuid')
  workspaceId!: string;

  @Column('uuid', { nullable: true })
  actorId!: string | null;

  @Column('varchar', { length: 50 })
  subjectType!: string;

  @Column('uuid')
  subjectId!: string;

  @Column('jsonb')
  contextSnapshot!: EvaluationContext;

  @Column('jsonb')
  evaluatedPolicies!: EvaluatedPolicyLogEntry[];

  @Column('enum', { enum: PolicyEffect })
  finalEffect!: PolicyEffect;

  @Column('uuid', { nullable: true })
  finalPolicyId!: string | null;

  @Column('text')
  finalReason!: string;

  @Column('jsonb', { nullable: true })
  modifications!: Record<string, unknown> | null;

  @Column('int')
  processingTimeMs!: number;

  @Column('boolean', { default: false })
  evaluationFailed!: boolean;

  @Column('varchar', { length: 10, nullable: true })
  failMode!: 'open' | 'closed' | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    logId: string;
    requestId: string;
    correlationId: string | null;
    trigger: PolicyTrigger;
    workspaceId: string;
    actorId: string | null;
    subjectType: string;
    subjectId: string;
    contextSnapshot: EvaluationContext;
    evaluatedPolicies: EvaluatedPolicyLogEntry[];
    finalEffect: PolicyEffect;
    finalPolicyId: string | null;
    finalReason: string;
    modifications: Record<string, unknown> | null;
    processingTimeMs: number;
    evaluationFailed: boolean;
    failMode: 'open' | 'closed' | null;
    createdAt: Date;
  } {
    return {
      logId: this.id,
      requestId: this.requestId,
      correlationId: this.correlationId,
      trigger: this.trigger,
      workspaceId: this.workspaceId,
      actorId: this.actorId,
      subjectType: this.subjectType,
      subjectId: this.subjectId,
      contextSnapshot: this.contextSnapshot,
      evaluatedPolicies: this.evaluatedPolicies,
      finalEffect: this.finalEffect,
      finalPolicyId: this.finalPolicyId,
      finalReason: this.finalReason,
      modifications: this.modifications,
      processingTimeMs: this.processingTimeMs,
      evaluationFailed: this.evaluationFailed,
      failMode: this.failMode,
      createdAt: this.createdAt,
    };
  }

  /**
   * Create entity from domain data
   * Note: This entity is immutable - only creation is supported.
   */
  static fromDomain(data: {
    logId: string;
    requestId: string;
    correlationId?: string | null;
    trigger: PolicyTrigger;
    workspaceId: string;
    actorId?: string | null;
    subjectType: string;
    subjectId: string;
    contextSnapshot: EvaluationContext;
    evaluatedPolicies: EvaluatedPolicyLogEntry[];
    finalEffect: PolicyEffect;
    finalPolicyId?: string | null;
    finalReason: string;
    modifications?: Record<string, unknown> | null;
    processingTimeMs: number;
    evaluationFailed?: boolean;
    failMode?: 'open' | 'closed' | null;
    createdAt: Date;
  }): PolicyDecisionLogEntity {
    const entity = new PolicyDecisionLogEntity();
    entity.id = data.logId;
    entity.requestId = data.requestId;
    entity.correlationId = data.correlationId ?? null;
    entity.trigger = data.trigger;
    entity.workspaceId = data.workspaceId;
    entity.actorId = data.actorId ?? null;
    entity.subjectType = data.subjectType;
    entity.subjectId = data.subjectId;
    entity.contextSnapshot = data.contextSnapshot;
    entity.evaluatedPolicies = data.evaluatedPolicies;
    entity.finalEffect = data.finalEffect;
    entity.finalPolicyId = data.finalPolicyId ?? null;
    entity.finalReason = data.finalReason;
    entity.modifications = data.modifications ?? null;
    entity.processingTimeMs = data.processingTimeMs;
    entity.evaluationFailed = data.evaluationFailed ?? false;
    entity.failMode = data.failMode ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
