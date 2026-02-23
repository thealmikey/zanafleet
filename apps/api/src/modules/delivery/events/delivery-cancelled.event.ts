/**
 * DeliveryCancelledEventV1
 *
 * Append-only event emitted when a delivery is cancelled.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 */
export class DeliveryCancelledEventV1 {
  readonly eventId: string;
  readonly eventType = 'DeliveryCancelledEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Delivery' as const;

  readonly deliveryId: string;
  readonly reason: string;
  readonly cancelledBy?: string;
  readonly previousState: string;
  readonly ledgerReservationReleased: boolean;
  readonly cancelledAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    deliveryId: string;
    reason: string;
    cancelledBy?: string;
    previousState: string;
    ledgerReservationReleased: boolean;
    cancelledAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.deliveryId = data.deliveryId;
    this.reason = data.reason;
    this.cancelledBy = data.cancelledBy;
    this.previousState = data.previousState;
    this.ledgerReservationReleased = data.ledgerReservationReleased;
    this.cancelledAt = data.cancelledAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.deliveryId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'DeliveryCancelledEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    reason: string;
    cancelledBy?: string;
    previousState: string;
    ledgerReservationReleased: boolean;
    cancelledAt: string;
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
      reason: this.reason,
      cancelledBy: this.cancelledBy,
      previousState: this.previousState,
      ledgerReservationReleased: this.ledgerReservationReleased,
      cancelledAt: this.cancelledAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    deliveryId: string;
    reason: string;
    cancelledBy?: string;
    previousState: string;
    ledgerReservationReleased: boolean;
    cancelledAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): DeliveryCancelledEventV1 {
    return new DeliveryCancelledEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      reason: data.reason,
      cancelledBy: data.cancelledBy,
      previousState: data.previousState,
      ledgerReservationReleased: data.ledgerReservationReleased,
      cancelledAt: new Date(data.cancelledAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
