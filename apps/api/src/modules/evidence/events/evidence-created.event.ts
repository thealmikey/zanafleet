import { EvidenceType, SubjectType, EvidenceSource } from '../dto/evidence.enums';

/**
 * EvidenceCreatedEvent-V1
 *
 * Append-only event emitted when an evidence record is successfully created.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: -V1 suffix indicates event schema version
 *
 * Evidence records are immutable by design - they represent facts
 * that were observed and cannot be changed after creation.
 *
 * This event triggers:
 * 1. Postgres persistence (Evidence entity)
 * 2. Neo4j projection (Evidence node in graph) - if implemented
 * 3. Any other downstream event handlers
 */
export class EvidenceCreatedEventV1 {
  /**
   * Event metadata
   */
  readonly eventId: string;
  readonly eventType = 'EvidenceCreatedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Evidence' as const;

  /**
   * Event payload (immutable)
   */
  readonly evidenceId: string;
  readonly type: EvidenceType;
  readonly actorId: string;
  readonly workspaceId: string;
  readonly subjectType: SubjectType;
  readonly subjectId: string;
  readonly payload: Record<string, unknown>;
  readonly source: EvidenceSource;
  readonly commandId: string;
  readonly createdAt: Date;

  /**
   * Correlation context (for tracing and causality)
   */
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    evidenceId: string;
    type: EvidenceType;
    actorId: string;
    workspaceId: string;
    subjectType: SubjectType;
    subjectId: string;
    payload: Record<string, unknown>;
    source: EvidenceSource;
    commandId: string;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.evidenceId = data.evidenceId;
    this.type = data.type;
    this.actorId = data.actorId;
    this.workspaceId = data.workspaceId;
    this.subjectType = data.subjectType;
    this.subjectId = data.subjectId;
    this.payload = data.payload;
    this.source = data.source;
    this.commandId = data.commandId;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.evidenceId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  /**
   * Serializes event to JSON-friendly format
   * Used for event store persistence and NATS message serialization
   */
  toJSON(): {
    eventId: string;
    eventType: 'EvidenceCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Evidence';
    evidenceId: string;
    type: EvidenceType;
    actorId: string;
    workspaceId: string;
    subjectType: SubjectType;
    subjectId: string;
    payload: Record<string, unknown>;
    source: EvidenceSource;
    commandId: string;
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
      evidenceId: this.evidenceId,
      type: this.type,
      actorId: this.actorId,
      workspaceId: this.workspaceId,
      subjectType: this.subjectType,
      subjectId: this.subjectId,
      payload: this.payload,
      source: this.source,
      commandId: this.commandId,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Deserializes event from persisted format
   */
  static fromJSON(data: Record<string, unknown>): EvidenceCreatedEventV1 {
    return new EvidenceCreatedEventV1({
      eventId: data.eventId as string,
      evidenceId: data.evidenceId as string,
      type: data.type as EvidenceType,
      actorId: data.actorId as string,
      workspaceId: data.workspaceId as string,
      subjectType: data.subjectType as SubjectType,
      subjectId: data.subjectId as string,
      payload: data.payload as Record<string, unknown>,
      source: data.source as EvidenceSource,
      commandId: data.commandId as string,
      createdAt: new Date(data.createdAt as string),
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}
