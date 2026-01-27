import { CommitmentStatus, CommitmentType } from '../dto/commitment.enums';

/**
 * CommitmentCreatedEvent-V1
 *
 * Append-only event emitted when a commitment is successfully created.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: -V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Postgres persistence (Commitment entity)
 * 2. Neo4j projection (Commitment node in graph)
 * 3. Any other downstream event handlers
 */
export class CommitmentCreatedEventV1 {
  /**
   * Event metadata
   */
  readonly eventId: string;
  readonly eventType: 'CommitmentCreatedEvent-V1' = 'CommitmentCreatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Commitment' = 'Commitment';

  /**
   * Event payload (immutable)
   */
  readonly commitmentId: string;
  readonly actorId: string;
  readonly workspaceId: string;
  readonly type: CommitmentType;
  readonly status: CommitmentStatus;
  readonly description: string;
  readonly dueAt: Date;
  readonly createdAt: Date;

  /**
   * Correlation context (for tracing and causality)
   */
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    commitmentId: string;
    actorId: string;
    workspaceId: string;
    type: CommitmentType;
    status: CommitmentStatus;
    description: string;
    dueAt: Date;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.commitmentId = data.commitmentId;
    this.actorId = data.actorId;
    this.workspaceId = data.workspaceId;
    this.type = data.type;
    this.status = data.status;
    this.description = data.description;
    this.dueAt = data.dueAt;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.commitmentId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  /**
   * Serializes event to JSON-friendly format
   * Used for event store persistence and NATS message serialization
   */
  toJSON(): {
    eventId: string;
    eventType: 'CommitmentCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Commitment';
    commitmentId: string;
    actorId: string;
    workspaceId: string;
    type: CommitmentType;
    status: CommitmentStatus;
    description: string;
    dueAt: string;
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
      commitmentId: this.commitmentId,
      actorId: this.actorId,
      workspaceId: this.workspaceId,
      type: this.type,
      status: this.status,
      description: this.description,
      dueAt: this.dueAt.toISOString(),
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Deserializes event from persisted format
   */
  static fromJSON(data: Record<string, unknown>): CommitmentCreatedEventV1 {
    return new CommitmentCreatedEventV1({
      eventId: data.eventId as string,
      commitmentId: data.commitmentId as string,
      actorId: data.actorId as string,
      workspaceId: data.workspaceId as string,
      type: data.type as CommitmentType,
      status: data.status as CommitmentStatus,
      description: data.description as string,
      dueAt: new Date(data.dueAt as string),
      createdAt: new Date(data.createdAt as string),
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}
