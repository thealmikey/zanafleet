import { MembershipRole } from '../dto/workspace.enums';

/**
 * ActorAddedToWorkspaceEvent-V1
 *
 * Append-only event emitted when an actor is added to a workspace.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: -V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Postgres persistence (Membership entity)
 * 2. Neo4j projection (MEMBER_OF relationship)
 * 3. Any other downstream event handlers
 */
export class ActorAddedToWorkspaceEventV1 {
  /**
   * Event metadata
   */
  readonly eventId: string;
  readonly eventType = 'ActorAddedToWorkspaceEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Workspace' as const;

  /**
   * Event payload (immutable)
   */
  readonly actorId: string;
  readonly workspaceId: string;
  readonly role: MembershipRole;
  readonly since: Date;

  /**
   * Correlation context (for tracing and causality)
   */
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    actorId: string;
    workspaceId: string;
    role: MembershipRole;
    since: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.actorId = data.actorId;
    this.workspaceId = data.workspaceId;
    this.role = data.role;
    this.since = data.since;
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
    eventType: 'ActorAddedToWorkspaceEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Workspace';
    actorId: string;
    workspaceId: string;
    role: MembershipRole;
    since: string;
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
      role: this.role,
      since: this.since.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Deserializes event from persisted format
   */
  static fromJSON(data: Record<string, unknown>): ActorAddedToWorkspaceEventV1 {
    return new ActorAddedToWorkspaceEventV1({
      eventId: data.eventId as string,
      actorId: data.actorId as string,
      workspaceId: data.workspaceId as string,
      role: data.role as MembershipRole,
      since: new Date(data.since as string),
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}
