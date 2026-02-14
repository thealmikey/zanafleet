/**
 * AI Suggestion Rejected Event
 *
 * Emitted when a user rejects an AI suggestion.
 */

/**
 * AI Suggestion Rejected Event JSON
 */
export interface AISuggestionRejectedEventV1JSON {
  eventId: string;
  eventType: 'AISuggestionRejectedEvent-V1';
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
  confidence: number;
  riskScore?: number;
  reason: string;

  // User feedback
  userComment?: string;

  // Tracing
  correlationId?: string;
  causationId?: string;

  // Additional metadata
  metadata?: Record<string, unknown>;
}

/**
 * AI Suggestion Rejected Event V1
 *
 * Emitted whenever a user rejects an AI suggestion.
 * This is used for feedback loops and analytics.
 */
export class AISuggestionRejectedEventV1 {
  readonly eventId: string;
  readonly eventType: 'AISuggestionRejectedEvent-V1' = 'AISuggestionRejectedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'AISuggestion' = 'AISuggestion';

  // Actor information
  readonly actorId: string;

  // Suggestion details
  readonly suggestionId: string;
  readonly contextType: string;
  readonly contextId: string;
  readonly workflowState: string;
  readonly capability: string;
  readonly confidence: number;
  readonly riskScore?: number;
  readonly reason: string;

  // User feedback
  readonly userComment?: string;

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
    confidence: number;
    riskScore?: number;
    reason: string;
    userComment?: string;
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
    this.confidence = params.confidence;
    this.riskScore = params.riskScore;
    this.reason = params.reason;
    this.userComment = params.userComment;
    this.correlationId = params.correlationId;
    this.causationId = params.causationId;
    this.metadata = params.metadata;
  }

  /**
   * Serialize to JSON
   */
  toJSON(): AISuggestionRejectedEventV1JSON {
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
      confidence: this.confidence,
      riskScore: this.riskScore,
      reason: this.reason,
      userComment: this.userComment,
      correlationId: this.correlationId,
      causationId: this.causationId,
      metadata: this.metadata,
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json: AISuggestionRejectedEventV1JSON): AISuggestionRejectedEventV1 {
    return new AISuggestionRejectedEventV1({
      eventId: json.eventId,
      occurredAt: new Date(json.occurredAt),
      aggregateId: json.aggregateId,
      actorId: json.actorId,
      suggestionId: json.suggestionId,
      contextType: json.contextType,
      contextId: json.contextId,
      workflowState: json.workflowState,
      capability: json.capability,
      confidence: json.confidence,
      riskScore: json.riskScore,
      reason: json.reason,
      userComment: json.userComment,
      correlationId: json.correlationId,
      causationId: json.causationId,
      metadata: json.metadata,
    });
  }
}
