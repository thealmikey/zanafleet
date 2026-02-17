import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

/**
 * AI Telemetry Event Type
 */
export enum AITelemetryEventType {
  SUGGESTION_GENERATED = 'suggestion_generated',
  SUGGESTION_ACCEPTED = 'suggestion_accepted',
  SUGGESTION_REJECTED = 'suggestion_rejected',
  SUGGESTION_EXPIRED = 'suggestion_expired',
  HANGING_STATE_DETECTED = 'hanging_state_detected',
  RISK_ANALYZED = 'risk_analyzed',
  REMINDER_GENERATED = 'reminder_generated',
  ERROR_OCCURRED = 'error_occurred',
}

/**
 * AI Telemetry Severity
 */
export enum AITelemetrySeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

/**
 * AI Telemetry Entity
 *
 * Persists telemetry events for AI operations.
 * Used for monitoring, debugging, and analytics.
 */
@Entity('ai_telemetry')
@Index('ai_telemetry_actor_id_index', ['actorId'])
@Index('ai_telemetry_event_type_index', ['eventType'])
@Index('ai_telemetry_severity_index', ['severity'])
@Index('ai_telemetry_created_at_index', ['createdAt'])
@Index('ai_telemetry_correlation_id_index', ['correlationId'])
@Index('ai_telemetry_actor_event_composite', ['actorId', 'eventType', 'createdAt'])
export class AITelemetryEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  actorId!: string;

  @Column({
    type: 'enum',
    enum: AITelemetryEventType,
  })
  eventType!: AITelemetryEventType;

  @Column({
    type: 'enum',
    enum: AITelemetrySeverity,
    default: AITelemetrySeverity.INFO,
  })
  severity!: AITelemetrySeverity;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contextType!: string | null;

  @Column('uuid', { nullable: true })
  contextId!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  capability!: string | null;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidence!: number | null;

  @Column({ type: 'int', nullable: true })
  riskScore!: number | null;

  @Column({ type: 'int', nullable: true })
  processingTimeMs!: number | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  correlationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  causationId!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  source!: string | null;

  /**
   * Create a telemetry entity
   */
  static create(params: {
    id: string;
    actorId: string;
    eventType: AITelemetryEventType;
    severity?: AITelemetrySeverity;
    contextType?: string;
    contextId?: string;
    capability?: string;
    message?: string;
    payload?: Record<string, unknown>;
    confidence?: number;
    riskScore?: number;
    processingTimeMs?: number;
    correlationId?: string;
    causationId?: string;
    source?: string;
  }): AITelemetryEntity {
    const entity = new AITelemetryEntity();
    entity.id = params.id;
    entity.actorId = params.actorId;
    entity.eventType = params.eventType;
    entity.severity = params.severity ?? AITelemetrySeverity.INFO;
    entity.contextType = params.contextType ?? null;
    entity.contextId = params.contextId ?? null;
    entity.capability = params.capability ?? null;
    entity.message = params.message ?? null;
    entity.payload = params.payload ?? null;
    entity.confidence = params.confidence ?? null;
    entity.riskScore = params.riskScore ?? null;
    entity.processingTimeMs = params.processingTimeMs ?? null;
    entity.correlationId = params.correlationId ?? null;
    entity.causationId = params.causationId ?? null;
    entity.source = params.source ?? null;
    return entity;
  }

  /**
   * Create suggestion generated telemetry
   */
  static suggestionGenerated(params: {
    id: string;
    actorId: string;
    contextType: string;
    contextId: string;
    capability: string;
    confidence: number;
    riskScore?: number;
    processingTimeMs?: number;
    correlationId?: string;
    causationId?: string;
  }): AITelemetryEntity {
    return AITelemetryEntity.create({
      ...params,
      eventType: AITelemetryEventType.SUGGESTION_GENERATED,
      severity: AITelemetrySeverity.INFO,
    });
  }

  /**
   * Create error telemetry
   */
  static errorOccurred(params: {
    id: string;
    actorId: string;
    message: string;
    contextType?: string;
    contextId?: string;
    capability?: string;
    payload?: Record<string, unknown>;
    correlationId?: string;
    causationId?: string;
  }): AITelemetryEntity {
    return AITelemetryEntity.create({
      ...params,
      eventType: AITelemetryEventType.ERROR_OCCURRED,
      severity: AITelemetrySeverity.ERROR,
    });
  }
}
