/**
 * DelayDetectedEventV1
 *
 * Append-only event emitted when a delay is detected for a delivery.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 */
export class DelayDetectedEventV1 {
  readonly eventId: string;
  readonly eventType = 'DelayDetectedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Delivery' as const;

  readonly deliveryId: string;
  readonly riderId: string | null;
  readonly expectedBy: Date;
  readonly detectedAt: Date;
  readonly delayMinutes: number;
  readonly reason: string | null;

  readonly correlationId?: string;

  constructor(data: {
    eventId: string;
    deliveryId: string;
    riderId?: string | null;
    expectedBy: Date;
    detectedAt: Date;
    delayMinutes: number;
    reason?: string | null;
    occurredAt?: Date;
    correlationId?: string;
  }) {
    this.eventId = data.eventId;
    this.deliveryId = data.deliveryId;
    this.riderId = data.riderId ?? null;
    this.expectedBy = data.expectedBy;
    this.detectedAt = data.detectedAt;
    this.delayMinutes = data.delayMinutes;
    this.reason = data.reason ?? null;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.deliveryId;
    this.correlationId = data.correlationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'DelayDetectedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    riderId: string | null;
    expectedBy: string;
    detectedAt: string;
    delayMinutes: number;
    reason: string | null;
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
      expectedBy: this.expectedBy.toISOString(),
      detectedAt: this.detectedAt.toISOString(),
      delayMinutes: this.delayMinutes,
      reason: this.reason,
      correlationId: this.correlationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    deliveryId: string;
    riderId: string | null;
    expectedBy: string;
    detectedAt: string;
    delayMinutes: number;
    reason: string | null;
    occurredAt: string;
    correlationId?: string;
  }): DelayDetectedEventV1 {
    return new DelayDetectedEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      riderId: data.riderId,
      expectedBy: new Date(data.expectedBy),
      detectedAt: new Date(data.detectedAt),
      delayMinutes: data.delayMinutes,
      reason: data.reason,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
    });
  }
}
