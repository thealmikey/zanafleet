/**
 * MatchingTimeoutEventV1
 *
 * Append-only event emitted when rider matching times out
 * and search radius is expanded.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 */
export class MatchingTimeoutEventV1 {
  readonly eventId: string;
  readonly eventType: 'MatchingTimeoutEvent-V1' = 'MatchingTimeoutEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Delivery' = 'Delivery';

  readonly deliveryId: string;
  readonly attemptCount: number;
  readonly previousRadiusMeters: number;
  readonly expandedRadiusMeters: number;
  readonly timedOutAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    deliveryId: string;
    attemptCount: number;
    previousRadiusMeters: number;
    expandedRadiusMeters: number;
    timedOutAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.deliveryId = data.deliveryId;
    this.attemptCount = data.attemptCount;
    this.previousRadiusMeters = data.previousRadiusMeters;
    this.expandedRadiusMeters = data.expandedRadiusMeters;
    this.timedOutAt = data.timedOutAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.deliveryId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'MatchingTimeoutEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    attemptCount: number;
    previousRadiusMeters: number;
    expandedRadiusMeters: number;
    timedOutAt: string;
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
      attemptCount: this.attemptCount,
      previousRadiusMeters: this.previousRadiusMeters,
      expandedRadiusMeters: this.expandedRadiusMeters,
      timedOutAt: this.timedOutAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    deliveryId: string;
    attemptCount: number;
    previousRadiusMeters: number;
    expandedRadiusMeters: number;
    timedOutAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): MatchingTimeoutEventV1 {
    return new MatchingTimeoutEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      attemptCount: data.attemptCount,
      previousRadiusMeters: data.previousRadiusMeters,
      expandedRadiusMeters: data.expandedRadiusMeters,
      timedOutAt: new Date(data.timedOutAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
