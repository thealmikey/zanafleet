import { WorkspaceType, WorkspaceStatus } from '../dto/workspace.enums';

/**
 * WorkspaceCreatedEvent-V1
 *
 * Append-only event emitted when a workspace is successfully created.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: -V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Postgres persistence (Workspace entity)
 * 2. Neo4j projection (Workspace node in graph)
 * 3. Any other downstream event handlers
 */
export class WorkspaceCreatedEventV1 {
  /**
   * Event metadata
   */
  readonly eventId: string; // UUID, unique identifier for this event
  readonly eventType = 'WorkspaceCreatedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date; // When this event was created
  readonly aggregateId: string; // workspaceId (aggregate root identifier)
  readonly aggregateType = 'Workspace' as const;

  /**
   * Event payload (immutable)
   */
  readonly workspaceId: string; // UUID
  readonly orgId: string; // UUID of the parent organization
  readonly name: string;
  readonly type: WorkspaceType;
  readonly status: WorkspaceStatus;
  readonly roleTemplates: string[];
  readonly createdAt: Date;

  /**
   * Correlation context (for tracing and causality)
   */
  readonly correlationId?: string; // Links related commands/events
  readonly causationId?: string; // ID of the command that caused this event

  constructor(data: {
    eventId: string;
    workspaceId: string;
    orgId: string;
    name: string;
    type: WorkspaceType;
    status: WorkspaceStatus;
    roleTemplates: string[];
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.workspaceId = data.workspaceId;
    this.orgId = data.orgId;
    this.name = data.name;
    this.type = data.type;
    this.status = data.status;
    this.roleTemplates = data.roleTemplates;
    this.createdAt = data.createdAt;
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
    eventType: 'WorkspaceCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Workspace';
    workspaceId: string;
    orgId: string;
    name: string;
    type: WorkspaceType;
    status: WorkspaceStatus;
    roleTemplates: string[];
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
      workspaceId: this.workspaceId,
      orgId: this.orgId,
      name: this.name,
      type: this.type,
      status: this.status,
      roleTemplates: this.roleTemplates,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Deserializes event from persisted format
   */
  static fromJSON(data: Record<string, unknown>): WorkspaceCreatedEventV1 {
    return new WorkspaceCreatedEventV1({
      eventId: data.eventId as string,
      workspaceId: data.workspaceId as string,
      orgId: data.orgId as string,
      name: data.name as string,
      type: data.type as WorkspaceType,
      status: data.status as WorkspaceStatus,
      roleTemplates: (data.roleTemplates as string[]) || [],
      createdAt: new Date(data.createdAt as string),
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}
