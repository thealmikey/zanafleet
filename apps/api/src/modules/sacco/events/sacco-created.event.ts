import { BaseEvent } from '@zanafleet/contracts';

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
  readonly location: string;
  readonly contactPhone: string;
  readonly createdAt: Date;

  constructor(data: {
    eventId: string;
    saccoId: string;
    name: string;
    location: string;
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
}
