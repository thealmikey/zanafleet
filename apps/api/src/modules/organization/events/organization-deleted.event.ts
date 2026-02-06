export interface OrganizationDeletedEventV1JSON {
  eventId: string;
  eventType: 'OrganizationDeletedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'Organization';
  organizationId: string;
  deletedAt: string;
  deletedByActorId?: string;
  correlationId?: string;
  causationId?: string;
}

export class OrganizationDeletedEventV1 {
  readonly eventId: string;
  readonly eventType: 'OrganizationDeletedEvent-V1' = 'OrganizationDeletedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Organization' = 'Organization';

  readonly organizationId: string;
  readonly deletedAt: Date;
  readonly deletedByActorId?: string;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    organizationId: string;
    deletedAt: Date;
    deletedByActorId?: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.organizationId = data.organizationId;
    this.aggregateId = data.organizationId;
    this.deletedAt = data.deletedAt;
    this.deletedByActorId = data.deletedByActorId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): OrganizationDeletedEventV1JSON {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      organizationId: this.organizationId,
      deletedAt: this.deletedAt.toISOString(),
      deletedByActorId: this.deletedByActorId,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: OrganizationDeletedEventV1JSON): OrganizationDeletedEventV1 {
    return new OrganizationDeletedEventV1({
      eventId: data.eventId,
      organizationId: data.organizationId,
      deletedAt: new Date(data.deletedAt),
      deletedByActorId: data.deletedByActorId,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
