/**
 * AI Risk Analyzed Event
 *
 * Emitted when the AI risk analyzer completes a risk analysis.
 */

/**
 * AI Risk Factor JSON
 */
export interface AIRiskFactorJSON {
  factor: string;
  weight: number;
  description: string;
}

/**
 * AI Risk Analyzed Event JSON
 */
export interface AIRiskAnalyzedEventV1JSON {
  eventId: string;
  eventType: 'AIRiskAnalyzedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'AIRiskAnalysis';

  // Analysis subject
  actorId: string;
  contextType: string;
  contextId: string;
  workflowState: string;
  capability: string;

  // Risk analysis results
  riskScore: number;
  riskFactors: AIRiskFactorJSON[];
  analysisTimestamp: string;

  // Confidence of the suggestion being analyzed
  confidence?: number;

  // Tracing
  correlationId?: string;
  causationId?: string;

  // Additional metadata
  metadata?: Record<string, unknown>;
}

/**
 * AI Risk Factor
 */
export class AIRiskFactor {
  readonly factor: string;
  readonly weight: number;
  readonly description: string;

  constructor(params: { factor: string; weight: number; description: string }) {
    this.factor = params.factor;
    this.weight = params.weight;
    this.description = params.description;
  }

  toJSON(): AIRiskFactorJSON {
    return {
      factor: this.factor,
      weight: this.weight,
      description: this.description,
    };
  }

  static fromJSON(json: AIRiskFactorJSON): AIRiskFactor {
    return new AIRiskFactor({
      factor: json.factor,
      weight: json.weight,
      description: json.description,
    });
  }
}

/**
 * AI Risk Analyzed Event V1
 *
 * Emitted when the AI risk analyzer completes a risk analysis.
 * This event is used for auditing and analytics.
 */
export class AIRiskAnalyzedEventV1 {
  readonly eventId: string;
  readonly eventType = 'AIRiskAnalyzedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'AIRiskAnalysis' as const;

  // Analysis subject
  readonly actorId: string;
  readonly contextType: string;
  readonly contextId: string;
  readonly workflowState: string;
  readonly capability: string;

  // Risk analysis results
  readonly riskScore: number;
  readonly riskFactors: AIRiskFactor[];
  readonly analysisTimestamp: Date;

  // Confidence of the suggestion being analyzed
  readonly confidence?: number;

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
    capability: string;
    riskScore: number;
    riskFactors: AIRiskFactor[];
    analysisTimestamp?: Date;
    confidence?: number;
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
    this.capability = params.capability;
    this.riskScore = params.riskScore;
    this.riskFactors = params.riskFactors;
    this.analysisTimestamp = params.analysisTimestamp ?? new Date();
    this.confidence = params.confidence;
    this.correlationId = params.correlationId;
    this.causationId = params.causationId;
    this.metadata = params.metadata;
  }

  /**
   * Serialize to JSON
   */
  toJSON(): AIRiskAnalyzedEventV1JSON {
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
      capability: this.capability,
      riskScore: this.riskScore,
      riskFactors: this.riskFactors.map((rf) => rf.toJSON()),
      analysisTimestamp: this.analysisTimestamp.toISOString(),
      confidence: this.confidence,
      correlationId: this.correlationId,
      causationId: this.causationId,
      metadata: this.metadata,
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json: AIRiskAnalyzedEventV1JSON): AIRiskAnalyzedEventV1 {
    return new AIRiskAnalyzedEventV1({
      eventId: json.eventId,
      occurredAt: new Date(json.occurredAt),
      aggregateId: json.aggregateId,
      actorId: json.actorId,
      contextType: json.contextType,
      contextId: json.contextId,
      workflowState: json.workflowState,
      capability: json.capability,
      riskScore: json.riskScore,
      riskFactors: json.riskFactors.map((rf) => AIRiskFactor.fromJSON(rf)),
      analysisTimestamp: new Date(json.analysisTimestamp),
      confidence: json.confidence,
      correlationId: json.correlationId,
      causationId: json.causationId,
      metadata: json.metadata,
    });
  }

  /**
   * Get risk level based on score
   */
  getRiskLevel(): string {
    if (this.riskScore < 25) return 'low';
    if (this.riskScore < 50) return 'medium';
    if (this.riskScore < 75) return 'high';
    return 'critical';
  }
}
