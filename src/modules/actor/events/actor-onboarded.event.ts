import { ActorType } from '../dto/actor.enums';

/**
 * ActorOnboardedEvent-V1
 *
 * Append-only event emitted when an actor is successfully onboarded.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: -V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Postgres persistence (Actor entity)
 * 2. Neo4j projection (Actor node in graph)
 * 3. Any other downstream event handlers
 */
export class ActorOnboardedEventV1 {
  /**
   * Event metadata
   */
  readonly eventId: string;
  readonly eventType: 'ActorOnboardedEvent-V1' = 'ActorOnboardedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Actor' = 'Actor';

  /**
   * Event payload (immutable)
   */
  readonly actorId: string;
  readonly type: ActorType;
  readonly roles: readonly string[];
  readonly workspaceId: string;
  readonly linkedWallets: readonly string[];
  readonly createdAt: Date;

  /**
   * Correlation context (for tracing and causality)
   */
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    actorId: string;
    type: ActorType;
    roles: string[];
    workspaceId: string;
    linkedWallets: string[];
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.actorId = data.actorId;
    this.type = data.type;
    this.roles = Object.freeze([...data.roles]);
    this.workspaceId = data.workspaceId;
    this.linkedWallets = Object.freeze([...data.linkedWallets]);
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.actorId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  /**
   * Serializes event to JSON-friendly format
   * Used for event store persistence and NATS message serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      actorId: this.actorId,
      type: this.type,
      roles: [...this.roles],
      workspaceId: this.workspaceId,
      linkedWallets: [...this.linkedWallets],
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Deserializes event from persisted format
   */
  static fromJSON(data: Record<string, unknown>): ActorOnboardedEventV1 {
    return new ActorOnboardedEventV1({
      eventId: data.eventId as string,
      actorId: data.actorId as string,
      type: data.type as ActorType,
      roles: data.roles as string[],
      workspaceId: data.workspaceId as string,
      linkedWallets: data.linkedWallets as string[],
      createdAt: new Date(data.createdAt as string),
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}
