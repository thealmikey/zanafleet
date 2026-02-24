import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * AI Feedback Type
 */
export enum AIFeedbackType {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * AI Feedback Entity
 *
 * Persists user feedback on AI suggestions.
 * Captures accepted, rejected, and expired suggestions for learning.
 */
@Entity('ai_feedback')
@Index('ai_feedback_actor_id_index', ['actorId'])
@Index('ai_feedback_suggestion_id_index', ['suggestionId'])
@Index('ai_feedback_type_index', ['feedbackType'])
@Index('ai_feedback_created_at_index', ['createdAt'])
@Index('ai_feedback_capability_index', ['capability'])
@Index('ai_feedback_actor_suggestion_composite', ['actorId', 'suggestionId'])
export class AIFeedbackEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  actorId!: string;

  @Column('uuid')
  suggestionId!: string;

  @Column({
    type: 'enum',
    enum: AIFeedbackType,
  })
  feedbackType!: AIFeedbackType;

  @Column({ type: 'varchar', length: 255 })
  capability!: string;

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  confidence!: number;

  @Column({ type: 'int', nullable: true })
  riskScore!: number | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'text', nullable: true })
  userComment!: string | null;

  @Column({ type: 'varchar', length: 100 })
  contextType!: string;

  @Column('uuid')
  contextId!: string;

  @Column({ type: 'varchar', length: 100 })
  workflowState!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: 'uuid', nullable: true })
  correlationId!: string | null;

  /**
   * Create an entity from accepted suggestion
   */
  static fromAcceptedSuggestion(params: {
    id: string;
    actorId: string;
    suggestionId: string;
    capability: string;
    confidence: number;
    riskScore?: number;
    reason: string;
    contextType: string;
    contextId: string;
    workflowState: string;
    userComment?: string;
    metadata?: Record<string, unknown>;
    correlationId?: string;
  }): AIFeedbackEntity {
    const entity = new AIFeedbackEntity();
    entity.id = params.id;
    entity.actorId = params.actorId;
    entity.suggestionId = params.suggestionId;
    entity.feedbackType = AIFeedbackType.ACCEPTED;
    entity.capability = params.capability;
    entity.confidence = params.confidence;
    entity.riskScore = params.riskScore ?? null;
    entity.reason = params.reason;
    entity.userComment = params.userComment ?? null;
    entity.contextType = params.contextType;
    entity.contextId = params.contextId;
    entity.workflowState = params.workflowState;
    entity.metadata = params.metadata ?? null;
    entity.correlationId = params.correlationId ?? null;
    return entity;
  }

  /**
   * Create an entity from rejected suggestion
   */
  static fromRejectedSuggestion(params: {
    id: string;
    actorId: string;
    suggestionId: string;
    capability: string;
    confidence: number;
    riskScore?: number;
    reason: string;
    userComment?: string;
    contextType: string;
    contextId: string;
    workflowState: string;
    metadata?: Record<string, unknown>;
    correlationId?: string;
  }): AIFeedbackEntity {
    const entity = new AIFeedbackEntity();
    entity.id = params.id;
    entity.actorId = params.actorId;
    entity.suggestionId = params.suggestionId;
    entity.feedbackType = AIFeedbackType.REJECTED;
    entity.capability = params.capability;
    entity.confidence = params.confidence;
    entity.riskScore = params.riskScore ?? null;
    entity.reason = params.reason;
    entity.userComment = params.userComment ?? null;
    entity.contextType = params.contextType;
    entity.contextId = params.contextId;
    entity.workflowState = params.workflowState;
    entity.metadata = params.metadata ?? null;
    entity.correlationId = params.correlationId ?? null;
    return entity;
  }

  /**
   * Create an entity from expired suggestion
   */
  static fromExpiredSuggestion(params: {
    id: string;
    actorId: string;
    suggestionId: string;
    capability: string;
    confidence: number;
    riskScore?: number;
    reason: string;
    contextType: string;
    contextId: string;
    workflowState: string;
    metadata?: Record<string, unknown>;
    correlationId?: string;
  }): AIFeedbackEntity {
    const entity = new AIFeedbackEntity();
    entity.id = params.id;
    entity.actorId = params.actorId;
    entity.suggestionId = params.suggestionId;
    entity.feedbackType = AIFeedbackType.EXPIRED;
    entity.capability = params.capability;
    entity.confidence = params.confidence;
    entity.riskScore = params.riskScore ?? null;
    entity.reason = params.reason;
    entity.userComment = null;
    entity.contextType = params.contextType;
    entity.contextId = params.contextId;
    entity.workflowState = params.workflowState;
    entity.metadata = params.metadata ?? null;
    entity.correlationId = params.correlationId ?? null;
    return entity;
  }
}
