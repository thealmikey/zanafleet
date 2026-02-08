import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import {
  PolicyScope,
  PolicyEffect,
  PolicyStatus,
  PolicyTrigger,
  PolicyCondition,
} from '../dto';

/**
 * Policy Entity
 * Represents the Postgres persistence model for policy definitions.
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Indexed columns for common queries (scope, trigger, status, priority)
 * - JSONB for flexible condition and modification storage
 * - Effective date range for time-bound policies
 */
@Entity('policies')
@Index(['scope'])
@Index(['trigger'])
@Index(['status'])
@Index(['priority'])
export class PolicyEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255, unique: true })
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('enum', { enum: PolicyScope })
  scope!: PolicyScope;

  @Column('uuid', { nullable: true })
  scopeTargetId!: string | null;

  @Column('enum', { enum: PolicyTrigger })
  trigger!: PolicyTrigger;

  @Column('int', { default: 0 })
  priority!: number;

  @Column('jsonb')
  conditions!: PolicyCondition;

  @Column('enum', { enum: PolicyEffect })
  effect!: PolicyEffect;

  @Column('jsonb', { nullable: true })
  modifications!: Record<string, unknown> | null;

  @Column('varchar', { array: true, nullable: true })
  approvalRoles!: string[] | null;

  @Column('enum', { enum: PolicyStatus, default: PolicyStatus.ACTIVE })
  status!: PolicyStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  effectiveFrom!: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  effectiveUntil!: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    policyId: string;
    name: string;
    description: string | null;
    scope: PolicyScope;
    scopeTargetId: string | null;
    trigger: PolicyTrigger;
    priority: number;
    conditions: PolicyCondition;
    effect: PolicyEffect;
    modifications: Record<string, unknown> | null;
    approvalRoles: string[] | null;
    status: PolicyStatus;
    effectiveFrom: Date | null;
    effectiveUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      policyId: this.id,
      name: this.name,
      description: this.description,
      scope: this.scope,
      scopeTargetId: this.scopeTargetId,
      trigger: this.trigger,
      priority: this.priority,
      conditions: this.conditions,
      effect: this.effect,
      modifications: this.modifications,
      approvalRoles: this.approvalRoles,
      status: this.status,
      effectiveFrom: this.effectiveFrom,
      effectiveUntil: this.effectiveUntil,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    policyId: string;
    name: string;
    description?: string | null;
    scope: PolicyScope;
    scopeTargetId?: string | null;
    trigger: PolicyTrigger;
    priority?: number;
    conditions: PolicyCondition;
    effect: PolicyEffect;
    modifications?: Record<string, unknown> | null;
    approvalRoles?: string[] | null;
    status?: PolicyStatus;
    effectiveFrom?: Date | null;
    effectiveUntil?: Date | null;
    createdAt: Date;
    updatedAt?: Date;
  }): PolicyEntity {
    const entity = new PolicyEntity();
    entity.id = data.policyId;
    entity.name = data.name;
    entity.description = data.description ?? null;
    entity.scope = data.scope;
    entity.scopeTargetId = data.scopeTargetId ?? null;
    entity.trigger = data.trigger;
    entity.priority = data.priority ?? 0;
    entity.conditions = data.conditions;
    entity.effect = data.effect;
    entity.modifications = data.modifications ?? null;
    entity.approvalRoles = data.approvalRoles ?? null;
    entity.status = data.status ?? PolicyStatus.ACTIVE;
    entity.effectiveFrom = data.effectiveFrom ?? null;
    entity.effectiveUntil = data.effectiveUntil ?? null;
    entity.createdAt = data.createdAt;
    entity.updatedAt = data.updatedAt ?? data.createdAt;
    return entity;
  }
}
