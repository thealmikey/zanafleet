/**
 * ProgressUpdatedEventV1
 *
 * Append-only event emitted when delivery progress is updated with rider location.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export class ProgressUpdatedEventV1 {
  readonly eventId: string;
  readonly eventType: 'ProgressUpdatedEvent-V1' = 'ProgressUpdatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Delivery' = 'Delivery';

  readonly deliveryId: string;
  readonly riderId: string;
  readonly currentLocation: GeoLocation;
  readonly estimatedArrival: Date | null;
  readonly distanceRemainingMeters: number | null;
  readonly updatedAt: Date;

  readonly correlationId?: string;

  constructor(data: {
    eventId: string;
    deliveryId: string;
    riderId: string;
    currentLocation: GeoLocation;
    estimatedArrival?: Date | null;
    distanceRemainingMeters?: number | null;
    updatedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
  }) {
    this.eventId = data.eventId;
    this.deliveryId = data.deliveryId;
    this.riderId = data.riderId;
    this.currentLocation = data.currentLocation;
    this.estimatedArrival = data.estimatedArrival ?? null;
    this.distanceRemainingMeters = data.distanceRemainingMeters ?? null;
    this.updatedAt = data.updatedAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.deliveryId;
    this.correlationId = data.correlationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'ProgressUpdatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    riderId: string;
    currentLocation: GeoLocation;
    estimatedArrival: string | null;
    distanceRemainingMeters: number | null;
    updatedAt: string;
    correlationId?: string;
  } {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      deliveryId: this.deliveryId,
      riderId: this.riderId,
      currentLocation: this.currentLocation,
      estimatedArrival: this.estimatedArrival?.toISOString() ?? null,
      distanceRemainingMeters: this.distanceRemainingMeters,
      updatedAt: this.updatedAt.toISOString(),
      correlationId: this.correlationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    deliveryId: string;
    riderId: string;
    currentLocation: GeoLocation;
    estimatedArrival: string | null;
    distanceRemainingMeters: number | null;
    updatedAt: string;
    occurredAt: string;
    correlationId?: string;
  }): ProgressUpdatedEventV1 {
    return new ProgressUpdatedEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      riderId: data.riderId,
      currentLocation: data.currentLocation,
      estimatedArrival: data.estimatedArrival ? new Date(data.estimatedArrival) : null,
      distanceRemainingMeters: data.distanceRemainingMeters,
      updatedAt: new Date(data.updatedAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
    });
  }
}
