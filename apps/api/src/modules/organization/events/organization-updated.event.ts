import { OrganizationStatus, OrganizationType } from '../dto/organization.enums';

export type OrganizationUpdatedEventV1Changes = {
  name?: string;
  type?: OrganizationType;
  status?: OrganizationStatus;
  linkedWallets?: readonly string[];
};

export interface OrganizationUpdatedEventV1JSON {
  eventId: string;
  eventType: 'OrganizationUpdatedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'Organization';
  organizationId: string;
  changes: {
    name?: string;
    type?: OrganizationType;
    status?: OrganizationStatus;
    linkedWallets?: readonly string[];
  };
  updatedAt: string;
  correlationId?: string;
  causationId?: string;
}

/**
 * OrganizationUpdatedEvent-V1
 *
 * Append-only event emitted when an organization is updated.
 */
export class OrganizationUpdatedEventV1 {
  readonly eventId: string;
  readonly eventType: 'OrganizationUpdatedEvent-V1' = 'OrganizationUpdatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Organization' = 'Organization';

  readonly organizationId: string;
  readonly changes: Readonly<OrganizationUpdatedEventV1Changes>;
  readonly updatedAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    organizationId: string;
    changes: OrganizationUpdatedEventV1Changes;
    updatedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.organizationId = data.organizationId;
    this.aggregateId = data.organizationId;
    this.updatedAt = data.updatedAt;
    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;

    const normalizedChanges: OrganizationUpdatedEventV1Changes = {};
    if (data.changes.name !== undefined) {
      normalizedChanges.name = data.changes.name;
    }
    if (data.changes.type !== undefined) {
      normalizedChanges.type = data.changes.type;
    }
    if (data.changes.status !== undefined) {
      normalizedChanges.status = data.changes.status;
    }
    if (data.changes.linkedWallets !== undefined) {
      normalizedChanges.linkedWallets = Object.freeze([...data.changes.linkedWallets]);
    }

    this.changes = Object.freeze(normalizedChanges);
  }

  toJSON(): OrganizationUpdatedEventV1JSON {
    const changes: OrganizationUpdatedEventV1JSON['changes'] = {};
    if (this.changes.name !== undefined) {
      changes.name = this.changes.name;
    }
    if (this.changes.type !== undefined) {
      changes.type = this.changes.type;
    }
    if (this.changes.status !== undefined) {
      changes.status = this.changes.status;
    }
    if (this.changes.linkedWallets !== undefined) {
      changes.linkedWallets = [...this.changes.linkedWallets];
    }

    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      organizationId: this.organizationId,
      changes,
      updatedAt: this.updatedAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: OrganizationUpdatedEventV1JSON): OrganizationUpdatedEventV1 {
    const changes: OrganizationUpdatedEventV1Changes = {};
    if (data.changes.name !== undefined) {
      changes.name = data.changes.name;
    }
    if (data.changes.type !== undefined) {
      changes.type = data.changes.type;
    }
    if (data.changes.status !== undefined) {
      changes.status = data.changes.status;
    }
    if (data.changes.linkedWallets !== undefined) {
      changes.linkedWallets = [...data.changes.linkedWallets];
    }

    return new OrganizationUpdatedEventV1({
      eventId: data.eventId,
      organizationId: data.organizationId,
      changes,
      updatedAt: new Date(data.updatedAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
