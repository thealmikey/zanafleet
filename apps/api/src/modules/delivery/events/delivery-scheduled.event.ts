/**
 * DeliveryScheduledEventV1
 *
 * Emitted when a delivery is scheduled or rescheduled.
 *
 * Contract guarantees:
 * - Immutable event data
 * - Append-only event log
 * - Deterministic event generation
 * - Versioned schema (V1)
 */
export class DeliveryScheduledEventV1 {
  readonly eventId: string;
  readonly eventType: 'Delivery.Delivery.ScheduledV1' = 'Delivery.Delivery.ScheduledV1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Delivery' = 'Delivery';

  readonly deliveryId: string;
  readonly businessId: string;
  readonly scheduledPickupTime: Date | null;
  readonly scheduledDropoffTime: Date | null;
  readonly itemSummary: string | null;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    deliveryId: string;
    businessId: string;
    scheduledPickupTime: Date | null;
    scheduledDropoffTime: Date | null;
    itemSummary: string | null;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.deliveryId = data.deliveryId;
    this.aggregateId = data.deliveryId;
    this.businessId = data.businessId;
    this.scheduledPickupTime = data.scheduledPickupTime;
    this.scheduledDropoffTime = data.scheduledDropoffTime;
    this.itemSummary = data.itemSummary;

    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'Delivery.Delivery.ScheduledV1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    businessId: string;
    scheduledPickupTime: string | null;
    scheduledDropoffTime: string | null;
    itemSummary: string | null;
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
      businessId: this.businessId,
      scheduledPickupTime: this.scheduledPickupTime
        ? this.scheduledPickupTime.toISOString()
        : null,
      scheduledDropoffTime: this.scheduledDropoffTime
        ? this.scheduledDropoffTime.toISOString()
        : null,
      itemSummary: this.itemSummary,

      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    eventType: 'Delivery.Delivery.ScheduledV1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    businessId: string;
    scheduledPickupTime: string | null;
    scheduledDropoffTime: string | null;
    itemSummary: string | null;
    correlationId?: string;
    causationId?: string;
  }): DeliveryScheduledEventV1 {
    return new DeliveryScheduledEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      businessId: data.businessId,
      scheduledPickupTime: data.scheduledPickupTime ? new Date(data.scheduledPickupTime) : null,
      scheduledDropoffTime: data.scheduledDropoffTime ? new Date(data.scheduledDropoffTime) : null,
      itemSummary: data.itemSummary,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
