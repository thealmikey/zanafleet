import { RoleScope } from '../dto/role.enums';

/**
 * RoleCreatedEvent-V1
 *
 * Append-only event emitted when a role is successfully created.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: -V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Postgres persistence (Role entity)
 * 2. Neo4j projection (Role node in graph)
 * 3. Any other downstream event handlers
 */
export class RoleCreatedEventV1 {
  /**
   * Event metadata
   */
  readonly eventId: string;
  readonly eventType: 'RoleCreatedEvent-V1' = 'RoleCreatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Role' = 'Role';

  /**
   * Event payload (immutable)
   */
  readonly roleId: string;
  readonly name: string;
  readonly permissions: readonly string[];
  readonly scope: RoleScope;
  readonly createdAt: Date;

  /**
   * Correlation context (for tracing and causality)
   */
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    roleId: string;
    name: string;
    permissions: string[];
    scope: RoleScope;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.roleId = data.roleId;
    this.name = data.name;
    this.permissions = Object.freeze([...data.permissions]);
    this.scope = data.scope;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.roleId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  /**
   * Serializes event to JSON-friendly format
   * Used for event store persistence and NATS message serialization
   */
  toJSON(): {
    eventId: string;
    eventType: 'RoleCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Role';
    roleId: string;
    name: string;
    permissions: readonly string[];
    scope: RoleScope;
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
      roleId: this.roleId,
      name: this.name,
      permissions: this.permissions,
      scope: this.scope,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Deserializes event from persisted format
   */
  static fromJSON(data: {
    eventId: string;
    roleId: string;
    name: string;
    permissions: string[];
    scope: RoleScope;
    createdAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): RoleCreatedEventV1 {
    return new RoleCreatedEventV1({
      eventId: data.eventId,
      roleId: data.roleId,
      name: data.name,
      permissions: data.permissions,
      scope: data.scope,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
