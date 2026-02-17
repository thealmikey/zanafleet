import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AISuggestionStatus } from '../interfaces/ai-suggestion.interface';

/**
 * AI Suggestion Entity
 *
 * Persists AI-generated suggestions to PostgreSQL.
 * Supports TTL-based expiration and deduplication.
 */
@Entity('ai_suggestions')
@Index('ai_suggestions_actor_id_index', ['actorId'])
@Index('ai_suggestions_context_type_index', ['contextType'])
@Index('ai_suggestions_context_id_index', ['contextId'])
@Index('ai_suggestions_status_index', ['status'])
@Index('ai_suggestions_capability_index', ['capability'])
@Index('ai_suggestions_expires_at_index', ['expiresAt'])
@Index('ai_suggestions_deduplication_hash_index', ['deduplicationHash'])
@Index('ai_suggestions_actor_context_composite', [
  'actorId',
  'contextType',
  'contextId',
  'status',
])
export class AISuggestionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  actorId!: string;

  @Column({ type: 'varchar', length: 100 })
  contextType!: string;

  @Column('uuid')
  contextId!: string;

  @Column({ type: 'varchar', length: 100 })
  workflowState!: string;

  @Column({ type: 'varchar', length: 255 })
  capability!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  confidence!: number;

  @Column({ type: 'int', nullable: true })
  riskScore!: number | null;

  @Column({
    type: 'enum',
    enum: AISuggestionStatus,
    default: AISuggestionStatus.PENDING,
  })
  status!: AISuggestionStatus;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column({ type: 'timestamp with time zone' })
  expiresAt!: Date;

  @Column({ type: 'varchar', length: 64, nullable: true })
  deduplicationHash!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: 'uuid', nullable: true })
  correlationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  causationId!: string | null;

  /**
   * Create an entity from a domain object
   */
  static fromDomain(params: {
    id: string;
    actorId: string;
    contextType: string;
    contextId: string;
    workflowState: string;
    capability: string;
    reason: string;
    confidence: number;
    riskScore?: number;
    status?: AISuggestionStatus;
    expiresAt: Date;
    deduplicationHash?: string;
    metadata?: Record<string, unknown>;
    correlationId?: string;
    causationId?: string;
  }): AISuggestionEntity {
    const entity = new AISuggestionEntity();
    entity.id = params.id;
    entity.actorId = params.actorId;
    entity.contextType = params.contextType;
    entity.contextId = params.contextId;
    entity.workflowState = params.workflowState;
    entity.capability = params.capability;
    entity.reason = params.reason;
    entity.confidence = params.confidence;
    entity.riskScore = params.riskScore ?? null;
    entity.status = params.status ?? AISuggestionStatus.PENDING;
    entity.expiresAt = params.expiresAt;
    entity.deduplicationHash = params.deduplicationHash ?? null;
    entity.metadata = params.metadata ?? null;
    entity.correlationId = params.correlationId ?? null;
    entity.causationId = params.causationId ?? null;
    return entity;
  }

  /**
   * Check if the suggestion has expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if the suggestion is still pending
   */
  isPending(): boolean {
    return this.status === AISuggestionStatus.PENDING;
  }

  /**
   * Mark the suggestion as accepted
   */
  accept(): void {
    this.status = AISuggestionStatus.ACCEPTED;
  }

  /**
   * Mark the suggestion as rejected
   */
  reject(): void {
    this.status = AISuggestionStatus.REJECTED;
  }

  /**
   * Mark the suggestion as expired
   */
  expire(): void {
    this.status = AISuggestionStatus.EXPIRED;
  }
}
