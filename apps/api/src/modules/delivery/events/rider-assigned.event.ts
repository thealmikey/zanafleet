/**
 * RiderAssignedEventV1
 *
 * Append-only event emitted when a rider is successfully assigned to a delivery.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 */
export class RiderAssignedEventV1 {
  readonly eventId: string;
  readonly eventType: 'RiderAssignedEvent-V1' = 'RiderAssignedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Delivery' = 'Delivery';

  readonly deliveryId: string;
  readonly riderId: string;
  readonly saccoId: string | null;
  readonly score: number;
  readonly distanceMeters: number;
  readonly assignedAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    deliveryId: string;
    riderId: string;
    saccoId?: string | null;
    score: number;
    distanceMeters: number;
    assignedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.deliveryId = data.deliveryId;
    this.riderId = data.riderId;
    this.saccoId = data.saccoId ?? null;
    this.score = data.score;
    this.distanceMeters = data.distanceMeters;
    this.assignedAt = data.assignedAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.deliveryId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'RiderAssignedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    riderId: string;
    saccoId: string | null;
    score: number;
    distanceMeters: number;
    assignedAt: string;
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
      deliveryId: this.deliveryId,
      riderId: this.riderId,
      saccoId: this.saccoId,
      score: this.score,
      distanceMeters: this.distanceMeters,
      assignedAt: this.assignedAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    deliveryId: string;
    riderId: string;
    saccoId: string | null;
    score: number;
    distanceMeters: number;
    assignedAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): RiderAssignedEventV1 {
    return new RiderAssignedEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      riderId: data.riderId,
      saccoId: data.saccoId,
      score: data.score,
      distanceMeters: data.distanceMeters,
      assignedAt: new Date(data.assignedAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
