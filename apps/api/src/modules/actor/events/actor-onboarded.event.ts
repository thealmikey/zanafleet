import { ActorType } from '../dto/actor.enums';

/**
 * ActorOnboardedEventV1
 *
 * Append-only event emitted when an actor is successfully onboarded.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Postgres persistence (Actor entity)
 * 2. Neo4j projection (Actor node in graph)
 * 3. Any other downstream event handlers
 */
export class ActorOnboardedEventV1 {
  readonly eventId: string;
  readonly eventType = 'ActorOnboardedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Actor' as const;

  readonly actorId: string;
  readonly email: string;
  readonly username: string;
  readonly type: ActorType;
  readonly workspaceId: string | null;
  readonly createdAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    actorId: string;
    email: string;
    username: string;
    type: ActorType;
    workspaceId: string | null;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.actorId = data.actorId;
    this.email = data.email;
    this.username = data.username;
    this.type = data.type;
    this.workspaceId = data.workspaceId;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.actorId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'ActorOnboardedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Actor';
    actorId: string;
    email: string;
    username: string;
    type: ActorType;
    workspaceId: string | null;
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
      actorId: this.actorId,
      email: this.email,
      username: this.username,
      type: this.type,
      workspaceId: this.workspaceId,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    actorId: string;
    email: string;
    username: string;
    type: ActorType;
    workspaceId: string | null;
    createdAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): ActorOnboardedEventV1 {
    return new ActorOnboardedEventV1({
      eventId: data.eventId,
      actorId: data.actorId,
      email: data.email,
      username: data.username,
      type: data.type,
      workspaceId: data.workspaceId,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
