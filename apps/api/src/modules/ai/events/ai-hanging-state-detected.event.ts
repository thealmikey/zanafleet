/**
 * AI Hanging State Detected Event
 *
 * Emitted when a workflow state exceeds its expected duration.
 */

/**
 * AI Hanging State Detected Event JSON
 */
export interface AIHangingStateDetectedEventV1JSON {
  eventId: string;
  eventType: 'AIHangingStateDetectedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'WorkflowProcess';

  // Actor information
  actorId: string;

  // Context details
  contextType: string;
  contextId: string;
  workflowState: string;
  previousState?: string;

  // Timing
  stateEnteredAt: string;
  durationMs: number;
  expectedDurationMs: number;

  // Suggested action
  suggestedCapability?: string;
  reason?: string;

  // Tracing
  correlationId?: string;
  causationId?: string;

  // Additional metadata
  metadata?: Record<string, unknown>;
}

/**
 * AI Hanging State Detected Event V1
 *
 * Emitted when a workflow state exceeds its expected duration.
 * This triggers the AI to generate a reminder suggestion.
 */
export class AIHangingStateDetectedEventV1 {
  readonly eventId: string;
  readonly eventType = 'AIHangingStateDetectedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'WorkflowProcess' as const;

  // Actor information
  readonly actorId: string;

  // Context details
  readonly contextType: string;
  readonly contextId: string;
  readonly workflowState: string;
  readonly previousState?: string;

  // Timing
  readonly stateEnteredAt: Date;
  readonly durationMs: number;
  readonly expectedDurationMs: number;

  // Suggested action
  readonly suggestedCapability?: string;
  readonly reason?: string;

  // Tracing
  readonly correlationId?: string;
  readonly causationId?: string;

  // Additional metadata
  readonly metadata?: Record<string, unknown>;

  constructor(params: {
    eventId: string;
    occurredAt?: Date;
    aggregateId: string;
    actorId: string;
    contextType: string;
    contextId: string;
    workflowState: string;
    previousState?: string;
    stateEnteredAt: Date;
    durationMs: number;
    expectedDurationMs: number;
    suggestedCapability?: string;
    reason?: string;
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }) {
    this.eventId = params.eventId;
    this.occurredAt = params.occurredAt ?? new Date();
    this.aggregateId = params.aggregateId;
    this.actorId = params.actorId;
    this.contextType = params.contextType;
    this.contextId = params.contextId;
    this.workflowState = params.workflowState;
    this.previousState = params.previousState;
    this.stateEnteredAt = params.stateEnteredAt;
    this.durationMs = params.durationMs;
    this.expectedDurationMs = params.expectedDurationMs;
    this.suggestedCapability = params.suggestedCapability;
    this.reason = params.reason;
    this.correlationId = params.correlationId;
    this.causationId = params.causationId;
    this.metadata = params.metadata;
  }

  /**
   * Serialize to JSON
   */
  toJSON(): AIHangingStateDetectedEventV1JSON {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      actorId: this.actorId,
      contextType: this.contextType,
      contextId: this.contextId,
      workflowState: this.workflowState,
      previousState: this.previousState,
      stateEnteredAt: this.stateEnteredAt.toISOString(),
      durationMs: this.durationMs,
      expectedDurationMs: this.expectedDurationMs,
      suggestedCapability: this.suggestedCapability,
      reason: this.reason,
      correlationId: this.correlationId,
      causationId: this.causationId,
      metadata: this.metadata,
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json: AIHangingStateDetectedEventV1JSON): AIHangingStateDetectedEventV1 {
    return new AIHangingStateDetectedEventV1({
      eventId: json.eventId,
      occurredAt: new Date(json.occurredAt),
      aggregateId: json.aggregateId,
      actorId: json.actorId,
      contextType: json.contextType,
      contextId: json.contextId,
      workflowState: json.workflowState,
      previousState: json.previousState,
      stateEnteredAt: new Date(json.stateEnteredAt),
      durationMs: json.durationMs,
      expectedDurationMs: json.expectedDurationMs,
      suggestedCapability: json.suggestedCapability,
      reason: json.reason,
      correlationId: json.correlationId,
      causationId: json.causationId,
      metadata: json.metadata,
    });
  }

  /**
   * Calculate the severity ratio (actual / expected)
   */
  getSeverityRatio(): number {
    return this.durationMs / this.expectedDurationMs;
  }

  /**
   * Check if this is a critical hanging state (>2x expected)
   */
  isCritical(): boolean {
    return this.getSeverityRatio() > 2;
  }
}
