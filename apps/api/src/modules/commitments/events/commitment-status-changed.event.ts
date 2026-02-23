import { CommitmentStatus } from '../dto/commitment.enums';

/**
 * CommitmentStatusChangedEvent-V1
 *
 * Append-only event emitted when a commitment's status changes.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: -V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Neo4j projection (status update, Breached label)
 * 2. Any other downstream event handlers
 */
export class CommitmentStatusChangedEventV1 {
  /**
   * Event metadata
   */
  readonly eventId: string;
  readonly eventType = 'CommitmentStatusChangedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Commitment' as const;

  /**
   * Event payload (immutable)
   */
  readonly commitmentId: string;
  readonly previousStatus: CommitmentStatus;
  readonly newStatus: CommitmentStatus;
  readonly changedAt: Date;

  /**
   * Correlation context (for tracing and causality)
   */
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    commitmentId: string;
    previousStatus: CommitmentStatus;
    newStatus: CommitmentStatus;
    changedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.commitmentId = data.commitmentId;
    this.previousStatus = data.previousStatus;
    this.newStatus = data.newStatus;
    this.changedAt = data.changedAt;
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
    eventType: 'CommitmentStatusChangedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Commitment';
    commitmentId: string;
    previousStatus: CommitmentStatus;
    newStatus: CommitmentStatus;
    changedAt: string;
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
      previousStatus: this.previousStatus,
      newStatus: this.newStatus,
      changedAt: this.changedAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Deserializes event from persisted format
   */
  static fromJSON(data: Record<string, unknown>): CommitmentStatusChangedEventV1 {
    return new CommitmentStatusChangedEventV1({
      eventId: data.eventId as string,
      commitmentId: data.commitmentId as string,
      previousStatus: data.previousStatus as CommitmentStatus,
      newStatus: data.newStatus as CommitmentStatus,
      changedAt: new Date(data.changedAt as string),
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}
