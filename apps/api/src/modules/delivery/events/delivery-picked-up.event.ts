import { randomUUID } from 'node:crypto'

export class DeliveryPickedUpEventV1 {
  readonly eventId: string
  readonly eventType: 'Delivery.Delivery.PickedUpV1' = 'Delivery.Delivery.PickedUpV1'
  readonly eventVersion: '1.0.0' = '1.0.0'
  readonly occurredAt: Date
  readonly aggregateId: string
  readonly aggregateType: 'Delivery' = 'Delivery'
  readonly deliveryId: string
  readonly businessId: string
  readonly pickedUpAt: Date
  readonly correlationId?: string
  readonly causationId?: string

  constructor(data: {
    eventId?: string
    deliveryId: string
    businessId: string
    pickedUpAt: Date
    occurredAt?: Date
    correlationId?: string
    causationId?: string
  }) {
    this.eventId = data.eventId ?? randomUUID()
    this.deliveryId = data.deliveryId
    this.businessId = data.businessId
    this.pickedUpAt = data.pickedUpAt
    this.occurredAt = data.occurredAt ?? new Date()
    this.aggregateId = data.deliveryId
    this.correlationId = data.correlationId
    this.causationId = data.causationId
  }

  toJSON(): {
    eventId: string
    eventType: 'Delivery.Delivery.PickedUpV1'
    eventVersion: '1.0.0'
    occurredAt: string
    aggregateId: string
    aggregateType: 'Delivery'
    deliveryId: string
    businessId: string
    pickedUpAt: string
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
      pickedUpAt: this.pickedUpAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    }
  }

  static fromJSON(data: {
    eventId: string
    eventType: 'Delivery.Delivery.PickedUpV1'
    eventVersion: '1.0.0'
    occurredAt: string
    aggregateId: string
    aggregateType: 'Delivery'
    deliveryId: string
    businessId: string
    pickedUpAt: string
    correlationId?: string
    causationId?: string
  }): DeliveryPickedUpEventV1 {
    return new DeliveryPickedUpEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      businessId: data.businessId,
      pickedUpAt: new Date(data.pickedUpAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    })
  }
}
