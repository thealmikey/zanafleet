import { OrganizationType, OrganizationStatus } from '../dto/organization.enums';

export interface OrganizationCreatedEventV1JSON {
  eventId: string;
  eventType: 'OrganizationCreatedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'Organization';
  organizationId: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  linkedWallets: readonly string[];
  createdAt: string;
  correlationId?: string;
  causationId?: string;
}

/**
 * OrganizationCreatedEvent-V1
 * 
 * Append-only event emitted when an organization is successfully created.
 * 
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: -V1 suffix indicates event schema version
 * 
 * This event triggers:
 * 1. Postgres persistence (Organization entity)
 * 2. Neo4j projection (Organization node in graph)
 * 3. Any other downstream event handlers
 */
export class OrganizationCreatedEventV1 {
  /**
   * Event metadata
   */
  readonly eventId: string; // UUID, unique identifier for this event
  readonly eventType: 'OrganizationCreatedEvent-V1' = 'OrganizationCreatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date; // When this event was created
  readonly aggregateId: string; // organizationId (aggregate root identifier)
  readonly aggregateType: 'Organization' = 'Organization';

  /**
   * Event payload (immutable)
   */
  readonly organizationId: string; // UUID
  readonly name: string;
  readonly type: OrganizationType;
  readonly status: OrganizationStatus;
  readonly linkedWallets: readonly string[]; // Array of wallet UUIDs (immutable)
  readonly createdAt: Date;

  /**
   * Correlation context (for tracing and causality)
   */
  readonly correlationId?: string; // Links related commands/events
  readonly causationId?: string; // ID of the command that caused this event

  constructor(data: {
    eventId: string;
    organizationId: string;
    name: string;
    type: OrganizationType;
    status: OrganizationStatus;
    linkedWallets: string[];
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.organizationId = data.organizationId;
    this.name = data.name;
    this.type = data.type;
    this.status = data.status;
    this.linkedWallets = Object.freeze([...data.linkedWallets]); // Immutable copy
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.organizationId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  /**
   * Serializes event to JSON-friendly format
   * Used for event store persistence and NATS message serialization
   */
  toJSON(): OrganizationCreatedEventV1JSON {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      organizationId: this.organizationId,
      name: this.name,
      type: this.type,
      status: this.status,
      linkedWallets: this.linkedWallets,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Deserializes event from persisted format
   */
  static fromJSON(
    data: OrganizationCreatedEventV1JSON,
  ): OrganizationCreatedEventV1 {
    return new OrganizationCreatedEventV1({
      eventId: data.eventId,
      organizationId: data.organizationId,
      name: data.name,
      type: data.type,
      status: data.status,
      linkedWallets: [...data.linkedWallets],
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
