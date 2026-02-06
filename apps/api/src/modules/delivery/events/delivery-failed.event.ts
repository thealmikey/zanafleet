import { randomUUID } from 'node:crypto'

export class DeliveryFailedEventV1 {
  readonly eventId: string
  readonly eventType: 'Delivery.Delivery.FailedV1' = 'Delivery.Delivery.FailedV1'
  readonly eventVersion: '1.0.0' = '1.0.0'
  readonly occurredAt: Date
  readonly aggregateId: string
  readonly aggregateType: 'Delivery' = 'Delivery'
  readonly deliveryId: string
  readonly businessId: string
  readonly attemptCount: number
  readonly lastAttemptAt: Date
  readonly reason?: string
  readonly correlationId?: string
  readonly causationId?: string

  constructor(data: {
    eventId?: string
    deliveryId: string
    businessId: string
    attemptCount: number
    lastAttemptAt: Date
    reason?: string
    occurredAt?: Date
    correlationId?: string
    causationId?: string
  }) {
    this.eventId = data.eventId ?? randomUUID()
    this.deliveryId = data.deliveryId
    this.businessId = data.businessId
    this.attemptCount = data.attemptCount
    this.lastAttemptAt = data.lastAttemptAt
    this.reason = data.reason
    this.occurredAt = data.occurredAt ?? new Date()
    this.aggregateId = data.deliveryId
    this.correlationId = data.correlationId
    this.causationId = data.causationId
  }

  toJSON(): {
    eventId: string
    eventType: 'Delivery.Delivery.FailedV1'
    eventVersion: '1.0.0'
    occurredAt: string
    aggregateId: string
    aggregateType: 'Delivery'
    deliveryId: string
    businessId: string
    attemptCount: number
    lastAttemptAt: string
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
      attemptCount: this.attemptCount,
      lastAttemptAt: this.lastAttemptAt.toISOString(),
      reason: this.reason,
      correlationId: this.correlationId,
      causationId: this.causationId,
    }
  }

  static fromJSON(data: {
    eventId: string
    eventType: 'Delivery.Delivery.FailedV1'
    eventVersion: '1.0.0'
    occurredAt: string
    aggregateId: string
    aggregateType: 'Delivery'
    deliveryId: string
    businessId: string
    attemptCount: number
    lastAttemptAt: string
    reason?: string
    correlationId?: string
    causationId?: string
  }): DeliveryFailedEventV1 {
    return new DeliveryFailedEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      businessId: data.businessId,
      attemptCount: data.attemptCount,
      lastAttemptAt: new Date(data.lastAttemptAt),
      reason: data.reason,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    })
  }
}
