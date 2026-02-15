import { InteractionEventType, InteractionActorType } from '../entities/interaction-event.entity';

/**
 * InteractionEventCreatedEventV1
 *
 * Append-only event emitted when a new interaction event is created.
 * This is the core event that drives the entire Interaction Engine.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Neo4j projection (InteractionEvent node in graph)
 * 2. Search indexing
 * 3. AI Orchestrator (if human message)
 * 4. Policy evaluation (if human message)
 * 5. WebSocket push to subscribers
 * 6. Any other downstream event handlers
 */
export class InteractionEventCreatedEventV1 {
  readonly eventId: string;
  readonly eventType: 'InteractionEventCreatedEvent-V1' = 'InteractionEventCreatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'InteractionEvent' = 'InteractionEvent';

  readonly interactionEventId: string;
  readonly streamId: string;
  readonly actorId: string;
  readonly actorType: InteractionActorType;
  readonly eventTypeValue: InteractionEventType;
  readonly payload: Record<string, unknown>;
  readonly createdAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    interactionEventId: string;
    streamId: string;
    actorId: string;
    actorType: InteractionActorType;
    eventType: InteractionEventType;
    payload: Record<string, unknown>;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.interactionEventId = data.interactionEventId;
    this.streamId = data.streamId;
    this.actorId = data.actorId;
    this.actorType = data.actorType;
    this.eventTypeValue = data.eventType;
    this.payload = data.payload;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.interactionEventId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  /**
   * Get the event type enum value
   */
  getEventType(): InteractionEventType {
    return this.eventTypeValue;
  }

  /**
   * Check if this is a human message
   */
  isHumanMessage(): boolean {
    return this.eventTypeValue === InteractionEventType.HUMAN_MESSAGE;
  }

  /**
   * Check if this is an AI response
   */
  isAIResponse(): boolean {
    return this.eventTypeValue === InteractionEventType.AI_RESPONSE;
  }

  /**
   * Check if this is an AI intent detection
   */
  isAIIntentDetected(): boolean {
    return this.eventTypeValue === InteractionEventType.AI_INTENT_DETECTED;
  }

  toJSON(): {
    eventId: string;
    eventType: 'InteractionEventCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'InteractionEvent';
    interactionEventId: string;
    streamId: string;
    actorId: string;
    actorType: InteractionActorType;
    eventTypeValue: InteractionEventType;
    payload: Record<string, unknown>;
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
      interactionEventId: this.interactionEventId,
      streamId: this.streamId,
      actorId: this.actorId,
      actorType: this.actorType,
      eventTypeValue: this.eventTypeValue,
      payload: this.payload,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    interactionEventId: string;
    streamId: string;
    actorId: string;
    actorType: InteractionActorType;
    eventType: InteractionEventType;
    payload: Record<string, unknown>;
    createdAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): InteractionEventCreatedEventV1 {
    return new InteractionEventCreatedEventV1({
      eventId: data.eventId,
      interactionEventId: data.interactionEventId,
      streamId: data.streamId,
      actorId: data.actorId,
      actorType: data.actorType,
      eventType: data.eventType,
      payload: data.payload,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
