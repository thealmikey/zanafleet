import { randomUUID } from 'node:crypto'

export class DeliveryDeliveredEventV1 {
  readonly eventId: string
  readonly eventType = 'Delivery.Delivery.DeliveredV1' as const
  readonly eventVersion = '1.0.0' as const
  readonly occurredAt: Date
  readonly aggregateId: string
  readonly aggregateType = 'Delivery' as const
  readonly deliveryId: string
  readonly businessId: string
  readonly deliveredAt: Date
  readonly correlationId?: string
  readonly causationId?: string

  constructor(data: {
    eventId?: string
    deliveryId: string
    businessId: string
    deliveredAt: Date
    occurredAt?: Date
    correlationId?: string
    causationId?: string
  }) {
    this.eventId = data.eventId ?? randomUUID()
    this.deliveryId = data.deliveryId
    this.businessId = data.businessId
    this.deliveredAt = data.deliveredAt
    this.occurredAt = data.occurredAt ?? new Date()
    this.aggregateId = data.deliveryId
    this.correlationId = data.correlationId
    this.causationId = data.causationId
  }

  toJSON(): {
    eventId: string
    eventType: 'Delivery.Delivery.DeliveredV1'
    eventVersion: '1.0.0'
    occurredAt: string
    aggregateId: string
    aggregateType: 'Delivery'
    deliveryId: string
    businessId: string
    deliveredAt: string
    correlationId?: string
    causationId?: string
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
      deliveredAt: this.deliveredAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    }
  }

  static fromJSON(data: {
    eventId: string
    eventType: 'Delivery.Delivery.DeliveredV1'
    eventVersion: '1.0.0'
    occurredAt: string
    aggregateId: string
    aggregateType: 'Delivery'
    deliveryId: string
    businessId: string
    deliveredAt: string
    correlationId?: string
    causationId?: string
  }): DeliveryDeliveredEventV1 {
    return new DeliveryDeliveredEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      businessId: data.businessId,
      deliveredAt: new Date(data.deliveredAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    })
  }
}
