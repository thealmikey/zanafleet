import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

import { CapabilityExecutionResult } from '../events/capability-used.event';

/**
 * CapabilityAuditEntity
 *
 * Persists capability usage audit records to PostgreSQL.
 * This provides a queryable audit trail for compliance and debugging.
 */
@Entity('capability_audit_log')
@Index('capability_audit_actor_id_index', ['actorId'])
@Index('capability_audit_capability_name_index', ['capabilityName'])
@Index('capability_audit_workspace_id_index', ['workspaceId'])
@Index('capability_audit_result_index', ['result'])
@Index('capability_audit_created_at_index', ['createdAt'])
@Index('capability_audit_correlation_id_index', ['correlationId'])
@Index('capability_audit_composite_index', [
  'actorId',
  'workspaceId',
  'capabilityName',
  'createdAt',
])
export class CapabilityAuditEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  actorId!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  actorType!: string | null;

  @Column({ type: 'varchar', length: 255 })
  capabilityName!: string;

  @Column('uuid', { nullable: true })
  capabilityId!: string | null;

  @Column('uuid', { nullable: true })
  contextId!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contextType!: string | null;

  @Column('uuid', { nullable: true })
  workspaceId!: string | null;

  @Column({
    type: 'enum',
    enum: CapabilityExecutionResult,
  })
  result!: CapabilityExecutionResult;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ type: 'boolean', nullable: true })
  consentObtained!: boolean | null;

  @Column('uuid', { nullable: true })
  consentId!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  correlationId!: string | null;

  @Column('uuid', { nullable: true })
  causationId!: string | null;

  @Column({ type: 'int', nullable: true })
  executionTimeMs!: number | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  /**
   * Check if this audit record represents a successful execution
   */
  isSuccess(): boolean {
    return this.result === CapabilityExecutionResult.SUCCESS;
  }

  /**
   * Check if this audit record represents a denied execution
   */
  isDenied(): boolean {
    return this.result === CapabilityExecutionResult.DENIED;
  }

  /**
   * Check if this audit record represents a failed execution
   */
  isFailed(): boolean {
    return this.result === CapabilityExecutionResult.FAILED;
  }

  /**
   * Check if this audit record represents a consent-required execution
   */
  isConsentRequired(): boolean {
    return this.result === CapabilityExecutionResult.CONSENT_REQUIRED;
  }

  toDomain(): {
    id: string;
    actorId: string;
    actorType: string | null;
    capabilityName: string;
    capabilityId: string | null;
    contextId: string | null;
    contextType: string | null;
    workspaceId: string | null;
    result: CapabilityExecutionResult;
    reason: string | null;
    payload: Record<string, unknown> | null;
    consentObtained: boolean | null;
    consentId: string | null;
    correlationId: string | null;
    causationId: string | null;
    executionTimeMs: number | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  } {
    return {
      id: this.id,
      actorId: this.actorId,
      actorType: this.actorType,
      capabilityName: this.capabilityName,
      capabilityId: this.capabilityId,
      contextId: this.contextId,
      contextType: this.contextType,
      workspaceId: this.workspaceId,
      result: this.result,
      reason: this.reason,
      payload: this.payload,
      consentObtained: this.consentObtained,
      consentId: this.consentId,
      correlationId: this.correlationId,
      causationId: this.causationId,
      executionTimeMs: this.executionTimeMs,
      metadata: this.metadata,
      createdAt: this.createdAt,
    };
  }

  static fromDomain(data: {
    id: string;
    actorId: string;
    actorType?: string | null;
    capabilityName: string;
    capabilityId?: string | null;
    contextId?: string | null;
    contextType?: string | null;
    workspaceId?: string | null;
    result: CapabilityExecutionResult;
    reason?: string | null;
    payload?: Record<string, unknown> | null;
    consentObtained?: boolean | null;
    consentId?: string | null;
    correlationId?: string | null;
    causationId?: string | null;
    executionTimeMs?: number | null;
    metadata?: Record<string, unknown> | null;
  }): CapabilityAuditEntity {
    const entity = new CapabilityAuditEntity();
    entity.id = data.id;
    entity.actorId = data.actorId;
    entity.actorType = data.actorType ?? null;
    entity.capabilityName = data.capabilityName;
    entity.capabilityId = data.capabilityId ?? null;
    entity.contextId = data.contextId ?? null;
    entity.contextType = data.contextType ?? null;
    entity.workspaceId = data.workspaceId ?? null;
    entity.result = data.result;
    entity.reason = data.reason ?? null;
    entity.payload = data.payload ?? null;
    entity.consentObtained = data.consentObtained ?? null;
    entity.consentId = data.consentId ?? null;
    entity.correlationId = data.correlationId ?? null;
    entity.causationId = data.causationId ?? null;
    entity.executionTimeMs = data.executionTimeMs ?? null;
    entity.metadata = data.metadata ?? null;
    return entity;
  }
}
