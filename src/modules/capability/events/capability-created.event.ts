export interface CapabilityCreatedEventV1JSON {
  eventId: string;
  eventType: 'CapabilityCreatedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'Capability';
  capabilityId: string;
  name: string;
  createdAt: string;
  correlationId?: string;
  causationId?: string;
}

export class CapabilityCreatedEventV1 {
  readonly eventId: string;
  readonly eventType: 'CapabilityCreatedEvent-V1' = 'CapabilityCreatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Capability' = 'Capability';
  readonly capabilityId: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    capabilityId: string;
    name: string;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.capabilityId = data.capabilityId;
    this.name = data.name;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.capabilityId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): CapabilityCreatedEventV1JSON {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      capabilityId: this.capabilityId,
      name: this.name,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: CapabilityCreatedEventV1JSON): CapabilityCreatedEventV1 {
    return new CapabilityCreatedEventV1({
      eventId: data.eventId,
      capabilityId: data.capabilityId,
      name: data.name,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
