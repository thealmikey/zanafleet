import { randomUUID } from 'node:crypto'

export class DeliveryCancelledEventV1 {
  readonly eventId: string
  readonly eventType: 'Delivery.Delivery.CancelledV1' = 'Delivery.Delivery.CancelledV1'
  readonly eventVersion: '1.0.0' = '1.0.0'
  readonly occurredAt: Date
  readonly aggregateId: string
  readonly aggregateType: 'Delivery' = 'Delivery'
  readonly deliveryId: string
  readonly businessId: string
  readonly cancelledAt: Date
  readonly reason?: string
  readonly correlationId?: string
  readonly causationId?: string

  constructor(data: {
    eventId?: string
    deliveryId: string
    businessId: string
    cancelledAt: Date
    reason?: string
    occurredAt?: Date
    correlationId?: string
    causationId?: string
  }) {
    this.eventId = data.eventId ?? randomUUID()
    this.deliveryId = data.deliveryId
    this.businessId = data.businessId
    this.cancelledAt = data.cancelledAt
    this.reason = data.reason
    this.occurredAt = data.occurredAt ?? new Date()
    this.aggregateId = data.deliveryId
    this.correlationId = data.correlationId
    this.causationId = data.causationId
  }

  toJSON(): {
    eventId: string
    eventType: 'Delivery.Delivery.CancelledV1'
    eventVersion: '1.0.0'
    occurredAt: string
    aggregateId: string
    aggregateType: 'Delivery'
    deliveryId: string
    businessId: string
    cancelledAt: string
    reason?: string
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
      cancelledAt: this.cancelledAt.toISOString(),
      reason: this.reason,
      correlationId: this.correlationId,
      causationId: this.causationId,
    }
  }

  static fromJSON(data: {
    eventId: string
    eventType: 'Delivery.Delivery.CancelledV1'
    eventVersion: '1.0.0'
    occurredAt: string
    aggregateId: string
    aggregateType: 'Delivery'
    deliveryId: string
    businessId: string
    cancelledAt: string
    reason?: string
    correlationId?: string
    causationId?: string
  }): DeliveryCancelledEventV1 {
    return new DeliveryCancelledEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      businessId: data.businessId,
      cancelledAt: new Date(data.cancelledAt),
      reason: data.reason,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    })
  }
}
