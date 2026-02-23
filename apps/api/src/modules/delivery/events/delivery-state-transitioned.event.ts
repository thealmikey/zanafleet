/**
 * DeliveryStateTransitionedEventV1
 *
 * Append-only event emitted when a delivery transitions between states.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 */
export class DeliveryStateTransitionedEventV1 {
  readonly eventId: string;
  readonly eventType = 'DeliveryStateTransitionedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Delivery' as const;

  readonly deliveryId: string;
  readonly previousState: string;
  readonly newState: string;
  readonly transitionedAt: Date;
  readonly triggeredBy?: string;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    deliveryId: string;
    previousState: string;
    newState: string;
    transitionedAt: Date;
    triggeredBy?: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.deliveryId = data.deliveryId;
    this.previousState = data.previousState;
    this.newState = data.newState;
    this.transitionedAt = data.transitionedAt;
    this.triggeredBy = data.triggeredBy;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.deliveryId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'DeliveryStateTransitionedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    previousState: string;
    newState: string;
    transitionedAt: string;
    triggeredBy?: string;
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
      previousState: this.previousState,
      newState: this.newState,
      transitionedAt: this.transitionedAt.toISOString(),
      triggeredBy: this.triggeredBy,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    deliveryId: string;
    previousState: string;
    newState: string;
    transitionedAt: string;
    triggeredBy?: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): DeliveryStateTransitionedEventV1 {
    return new DeliveryStateTransitionedEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      previousState: data.previousState,
      newState: data.newState,
      transitionedAt: new Date(data.transitionedAt),
      triggeredBy: data.triggeredBy,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
