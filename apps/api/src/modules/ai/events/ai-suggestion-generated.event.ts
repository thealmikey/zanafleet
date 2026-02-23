/**
 * AI Suggestion Generated Event
 *
 * Emitted when an AI suggestion is generated.
 * This is an immutable event that represents the fact that a suggestion was created.
 */

/**
 * AI Suggestion Generated Event JSON
 */
export interface AISuggestionGeneratedEventV1JSON {
  eventId: string;
  eventType: 'AISuggestionGeneratedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'AISuggestion';

  // Actor information
  actorId: string;

  // Suggestion details
  suggestionId: string;
  contextType: string;
  contextId: string;
  workflowState: string;
  capability: string;
  reason: string;
  confidence: number;
  riskScore?: number;

  // Expiration
  expiresAt: string;

  // Deduplication
  deduplicationHash?: string;

  // Tracing
  correlationId?: string;
  causationId?: string;

  // Additional metadata
  metadata?: Record<string, unknown>;
}

/**
 * AI Suggestion Generated Event V1
 *
 * Emitted whenever an AI generates a new suggestion.
 * This event is used for auditing, projections, and analytics.
 */
export class AISuggestionGeneratedEventV1 {
  readonly eventId: string;
  readonly eventType = 'AISuggestionGeneratedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'AISuggestion' as const;

  // Actor information
  readonly actorId: string;

  // Suggestion details
  readonly suggestionId: string;
  readonly contextType: string;
  readonly contextId: string;
  readonly workflowState: string;
  readonly capability: string;
  readonly reason: string;
  readonly confidence: number;
  readonly riskScore?: number;

  // Expiration
  readonly expiresAt: Date;

  // Deduplication
  readonly deduplicationHash?: string;

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
    suggestionId: string;
    contextType: string;
    contextId: string;
    workflowState: string;
    capability: string;
    reason: string;
    confidence: number;
    riskScore?: number;
    expiresAt: Date;
    deduplicationHash?: string;
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }) {
    this.eventId = params.eventId;
    this.occurredAt = params.occurredAt ?? new Date();
    this.aggregateId = params.aggregateId;
    this.actorId = params.actorId;
    this.suggestionId = params.suggestionId;
    this.contextType = params.contextType;
    this.contextId = params.contextId;
    this.workflowState = params.workflowState;
    this.capability = params.capability;
    this.reason = params.reason;
    this.confidence = params.confidence;
    this.riskScore = params.riskScore;
    this.expiresAt = params.expiresAt;
    this.deduplicationHash = params.deduplicationHash;
    this.correlationId = params.correlationId;
    this.causationId = params.causationId;
    this.metadata = params.metadata;
  }

  /**
   * Serialize to JSON
   */
  toJSON(): AISuggestionGeneratedEventV1JSON {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      actorId: this.actorId,
      suggestionId: this.suggestionId,
      contextType: this.contextType,
      contextId: this.contextId,
      workflowState: this.workflowState,
      capability: this.capability,
      reason: this.reason,
      confidence: this.confidence,
      riskScore: this.riskScore,
      expiresAt: this.expiresAt.toISOString(),
      deduplicationHash: this.deduplicationHash,
      correlationId: this.correlationId,
      causationId: this.causationId,
      metadata: this.metadata,
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json: AISuggestionGeneratedEventV1JSON): AISuggestionGeneratedEventV1 {
    return new AISuggestionGeneratedEventV1({
      eventId: json.eventId,
      occurredAt: new Date(json.occurredAt),
      aggregateId: json.aggregateId,
      actorId: json.actorId,
      suggestionId: json.suggestionId,
      contextType: json.contextType,
      contextId: json.contextId,
      workflowState: json.workflowState,
      capability: json.capability,
      reason: json.reason,
      confidence: json.confidence,
      riskScore: json.riskScore,
      expiresAt: new Date(json.expiresAt),
      deduplicationHash: json.deduplicationHash,
      correlationId: json.correlationId,
      causationId: json.causationId,
      metadata: json.metadata,
    });
  }
}
