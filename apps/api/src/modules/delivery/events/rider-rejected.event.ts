/**
 * RiderRejectedEventV1
 *
 * Append-only event emitted when a rider rejects a delivery assignment
 * or is rejected from the matching pool.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 */
export class RiderRejectedEventV1 {
  readonly eventId: string;
  readonly eventType = 'RiderRejectedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Delivery' as const;

  readonly deliveryId: string;
  readonly riderId: string;
  readonly reason: string;
  readonly rejectedAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    deliveryId: string;
    riderId: string;
    reason: string;
    rejectedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.deliveryId = data.deliveryId;
    this.riderId = data.riderId;
    this.reason = data.reason;
    this.rejectedAt = data.rejectedAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.deliveryId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'RiderRejectedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    riderId: string;
    reason: string;
    rejectedAt: string;
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
      reason: this.reason,
      rejectedAt: this.rejectedAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    deliveryId: string;
    riderId: string;
    reason: string;
    rejectedAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): RiderRejectedEventV1 {
    return new RiderRejectedEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      riderId: data.riderId,
      reason: data.reason,
      rejectedAt: new Date(data.rejectedAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
