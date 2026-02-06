/**
 * ActorRemovedFromWorkspaceEvent-V1
 *
 * Append-only event emitted when an actor is removed from a workspace.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: -V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Postgres persistence (Membership entity deletion)
 * 2. Neo4j projection (MEMBER_OF relationship removal)
 * 3. Any other downstream event handlers
 */
export class ActorRemovedFromWorkspaceEventV1 {
  /**
   * Event metadata
   */
  readonly eventId: string;
  readonly eventType: 'ActorRemovedFromWorkspaceEvent-V1' = 'ActorRemovedFromWorkspaceEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Workspace' = 'Workspace';

  /**
   * Event payload (immutable)
   */
  readonly actorId: string;
  readonly workspaceId: string;
  readonly removedAt: Date;

  /**
   * Correlation context (for tracing and causality)
   */
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    actorId: string;
    workspaceId: string;
    removedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.actorId = data.actorId;
    this.workspaceId = data.workspaceId;
    this.removedAt = data.removedAt;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.workspaceId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  /**
   * Serializes event to JSON-friendly format
   * Used for event store persistence and NATS message serialization
   */
  toJSON(): {
    eventId: string;
    eventType: 'ActorRemovedFromWorkspaceEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Workspace';
    actorId: string;
    workspaceId: string;
    removedAt: string;
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
      workspaceId: this.workspaceId,
      removedAt: this.removedAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Deserializes event from persisted format
   */
  static fromJSON(data: Record<string, unknown>): ActorRemovedFromWorkspaceEventV1 {
    return new ActorRemovedFromWorkspaceEventV1({
      eventId: data.eventId as string,
      actorId: data.actorId as string,
      workspaceId: data.workspaceId as string,
      removedAt: new Date(data.removedAt as string),
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}
