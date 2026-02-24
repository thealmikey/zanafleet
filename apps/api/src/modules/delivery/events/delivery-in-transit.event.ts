import { randomUUID } from 'node:crypto';

export class DeliveryInTransitEventV1 {
  readonly eventId: string;
  readonly eventType = 'Delivery.Delivery.InTransitV1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Delivery' as const;
  readonly deliveryId: string;
  readonly businessId: string;
  readonly inTransitAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId?: string;
    deliveryId: string;
    businessId: string;
    inTransitAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId ?? randomUUID();
    this.deliveryId = data.deliveryId;
    this.businessId = data.businessId;
    this.inTransitAt = data.inTransitAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.deliveryId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'Delivery.Delivery.InTransitV1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    businessId: string;
    inTransitAt: string;
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
      inTransitAt: this.inTransitAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    eventType: 'Delivery.Delivery.InTransitV1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    businessId: string;
    inTransitAt: string;
    correlationId?: string;
    causationId?: string;
  }): DeliveryInTransitEventV1 {
    return new DeliveryInTransitEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      businessId: data.businessId,
      inTransitAt: new Date(data.inTransitAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
