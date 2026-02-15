/**
 * AI Context Interface
 *
 * Represents the context used to generate AI suggestions.
 * This is built from domain events and used to provide context for AI decision-making.
 */

/**
 * AI Context
 *
 * Contains all the information needed to generate an AI suggestion
 */
export interface AIContext {
  /** The actor this context is for */
  actorId: string;

  /** Type of context (e.g., 'workflow', 'task', 'booking') */
  contextType: string;

  /** ID of the context */
  contextId: string;

  /** Current workflow state */
  workflowState: string;

  /** Previous workflow states (if available) */
  previousStates?: string[];

  /** Related actors (e.g., assignees, participants) */
  relatedActors?: string[];

  /** Suggested capability to evaluate */
  capability?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;

  /** Correlation ID for tracing */
  correlationId?: string;

  /** Causation ID for tracing */
  causationId?: string;

  /** Timestamp of when this context was created */
  timestamp?: Date;
}

/**
 * AI Context Builder
 *
 * Helper to build AI context from domain events
 */
export interface AIContextBuilder {
  actorId: string;
  contextType: string;
  contextId: string;
  workflowState: string;
  previousStates: string[];
  relatedActors: string[];
  capability?: string;
  metadata: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
  timestamp: Date;

  addPreviousState(state: string): AIContextBuilder;
  addRelatedActor(actorId: string): AIContextBuilder;
  setCapability(capability: string): AIContextBuilder;
  setMetadata(key: string, value: unknown): AIContextBuilder;
  setCorrelationId(correlationId: string): AIContextBuilder;
  setCausationId(causationId: string): AIContextBuilder;
  build(): AIContext;
}

/**
 * Event to AI Context mapping
 */
export interface EventToContextMapping {
  eventType: string;
  extractContext: (event: unknown) => Partial<AIContext>;
}
