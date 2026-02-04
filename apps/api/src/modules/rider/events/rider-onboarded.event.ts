import { VehicleType, LocationData } from '@zanafleet/contracts';

/**
 * RiderOnboardedEventV1
 *
 * Append-only event emitted when a rider is successfully onboarded.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Postgres persistence (Rider entity)
 * 2. Neo4j projection (Rider node and BELONGS_TO relationship in graph)
 * 3. Any other downstream event handlers
 */
export class RiderOnboardedEventV1 {
  readonly eventId: string;
  readonly eventType: 'Rider.Rider.OnboardedV1' = 'Rider.Rider.OnboardedV1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Rider' = 'Rider';

  readonly riderId: string;
  readonly fullName: string;
  readonly nationalId: string;
  readonly phone: string;
  readonly location: LocationData;
  readonly vehicleType: VehicleType;
  readonly saccoId: string | null;
  readonly email: string | null;
  readonly createdAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    riderId: string;
    fullName: string;
    nationalId: string;
    phone: string;
    location: LocationData;
    vehicleType: VehicleType;
    saccoId: string | null;
    email: string | null;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.riderId = data.riderId;
    this.aggregateId = data.riderId;
    this.fullName = data.fullName;
    this.nationalId = data.nationalId;
    this.phone = data.phone;
    this.location = data.location;
    this.vehicleType = data.vehicleType;
    this.saccoId = data.saccoId;
    this.email = data.email;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'Rider.Rider.OnboardedV1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Rider';
    riderId: string;
    fullName: string;
    nationalId: string;
    phone: string;
    location: LocationData;
    vehicleType: VehicleType;
    saccoId: string | null;
    email: string | null;
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
      riderId: this.riderId,
      fullName: this.fullName,
      nationalId: this.nationalId,
      phone: this.phone,
      location: this.location,
      vehicleType: this.vehicleType,
      saccoId: this.saccoId,
      email: this.email,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    riderId: string;
    fullName: string;
    nationalId: string;
    phone: string;
    location: LocationData;
    vehicleType: VehicleType;
    saccoId: string | null;
    email: string | null;
    createdAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): RiderOnboardedEventV1 {
    return new RiderOnboardedEventV1({
      eventId: data.eventId,
      riderId: data.riderId,
      fullName: data.fullName,
      nationalId: data.nationalId,
      phone: data.phone,
      location: data.location as LocationData,
      vehicleType: data.vehicleType,
      saccoId: data.saccoId,
      email: data.email,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
