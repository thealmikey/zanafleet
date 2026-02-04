import { BaseEvent, LocationData } from '@zanafleet/contracts';

/**
 * SaccoCreatedEventV1
 * Event emitted when a new Sacco is created
 *
 * This is the immutable fact of what happened in the system.
 * Neo4j projections and other read models subscribe to this event.
 */
export class SaccoCreatedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'Sacco.Sacco.CreatedV1';
  readonly eventVersion = 'V1';
  readonly aggregateId: string;
  readonly aggregateType = 'Sacco';
  readonly occurredAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;

  readonly saccoId: string;
  readonly name: string;
  readonly location: LocationData;
  readonly contactPhone: string;
  readonly createdAt: Date;

  constructor(data: {
    eventId: string;
    saccoId: string;
    name: string;
    location: LocationData;
    contactPhone: string;
    createdAt: Date;
    occurredAt: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.saccoId = data.saccoId;
    this.aggregateId = data.saccoId;
    this.name = data.name;
    this.location = data.location;
    this.contactPhone = data.contactPhone;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      occurredAt: this.occurredAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
      saccoId: this.saccoId,
      name: this.name,
      location: this.location,
      contactPhone: this.contactPhone,
      createdAt: this.createdAt.toISOString(),
    };
  }

  static fromJSON(data: Record<string, unknown>): SaccoCreatedEventV1 {
    return new SaccoCreatedEventV1({
      eventId: data.eventId as string,
      saccoId: data.saccoId as string,
      name: data.name as string,
      location: data.location as LocationData,
      contactPhone: data.contactPhone as string,
      createdAt: new Date(data.createdAt as string),
      occurredAt: new Date(data.occurredAt as string),
      correlationId: data.correlationId as string | undefined,
      causationId: data.causationId as string | undefined,
    });
  }
}
