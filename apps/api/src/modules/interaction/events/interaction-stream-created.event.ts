import { InteractionStreamState, InteractionContextType } from '../entities/interaction-stream.entity';

/**
 * InteractionStreamCreatedEventV1
 *
 * Append-only event emitted when a new interaction stream is created.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Neo4j projection (InteractionStream node in graph)
 * 2. Search indexing
 * 3. Any other downstream event handlers
 */
export class InteractionStreamCreatedEventV1 {
  readonly eventId: string;
  readonly eventType: 'InteractionStreamCreatedEvent-V1' = 'InteractionStreamCreatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'InteractionStream' = 'InteractionStream';

  readonly streamId: string;
  readonly contextType: InteractionContextType;
  readonly contextId: string;
  readonly participantIds: string[];
  readonly metadata: Record<string, unknown>;
  readonly state: InteractionStreamState;
  readonly createdAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    streamId: string;
    contextType: InteractionContextType;
    contextId: string;
    participantIds: string[];
    metadata?: Record<string, unknown>;
    state?: InteractionStreamState;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.streamId = data.streamId;
    this.contextType = data.contextType;
    this.contextId = data.contextId;
    this.participantIds = data.participantIds;
    this.metadata = data.metadata || {};
    this.state = data.state || InteractionStreamState.ACTIVE;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.streamId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'InteractionStreamCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'InteractionStream';
    streamId: string;
    contextType: InteractionContextType;
    contextId: string;
    participantIds: string[];
    metadata: Record<string, unknown>;
    state: InteractionStreamState;
    createdAt: string;
    correlationId?: string;
    causationId?: string;
  } {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      streamId: this.streamId,
      contextType: this.contextType,
      contextId: this.contextId,
      participantIds: this.participantIds,
      metadata: this.metadata,
      state: this.state,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    streamId: string;
    contextType: InteractionContextType;
    contextId: string;
    participantIds: string[];
    metadata: Record<string, unknown>;
    state: InteractionStreamState;
    createdAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): InteractionStreamCreatedEventV1 {
    return new InteractionStreamCreatedEventV1({
      eventId: data.eventId,
      streamId: data.streamId,
      contextType: data.contextType,
      contextId: data.contextId,
      participantIds: data.participantIds,
      metadata: data.metadata,
      state: data.state,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
