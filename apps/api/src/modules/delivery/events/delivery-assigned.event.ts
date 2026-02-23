import { randomUUID } from 'node:crypto'

export class DeliveryAssignedEventV1 {
  readonly eventId: string
  readonly eventType = 'Delivery.Delivery.AssignedV1' as const
  readonly eventVersion = '1.0.0' as const
  readonly occurredAt: Date
  readonly aggregateId: string
  readonly aggregateType = 'Delivery' as const
  readonly deliveryId: string
  readonly businessId: string
  readonly assignedRiderId: string
  readonly assignedAt: Date | null
  readonly accepted?: boolean
  readonly correlationId?: string
  readonly causationId?: string

  constructor(data: {
    eventId?: string
    deliveryId: string
    businessId: string
    assignedRiderId: string
    assignedAt?: Date | null
    accepted?: boolean
    occurredAt?: Date
    correlationId?: string
    causationId?: string
  }) {
    this.eventId = data.eventId ?? randomUUID()
    this.deliveryId = data.deliveryId
    this.businessId = data.businessId
    this.assignedRiderId = data.assignedRiderId
    this.assignedAt = data.assignedAt ?? null
    this.accepted = data.accepted
    this.occurredAt = data.occurredAt ?? new Date()
    this.aggregateId = data.deliveryId
    this.correlationId = data.correlationId
    this.causationId = data.causationId
  }

  toJSON(): {
    eventId: string
    eventType: 'Delivery.Delivery.AssignedV1'
    eventVersion: '1.0.0'
    occurredAt: string
    aggregateId: string
    aggregateType: 'Delivery'
    deliveryId: string
    businessId: string
    assignedRiderId: string
    assignedAt: string | null
    accepted?: boolean
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
      assignedRiderId: this.assignedRiderId,
      assignedAt: this.assignedAt ? this.assignedAt.toISOString() : null,
      accepted: this.accepted,
      correlationId: this.correlationId,
      causationId: this.causationId,
    }
  }

  static fromJSON(data: {
    eventId: string
    eventType: 'Delivery.Delivery.AssignedV1'
    eventVersion: '1.0.0'
    occurredAt: string
    aggregateId: string
    aggregateType: 'Delivery'
    deliveryId: string
    businessId: string
    assignedRiderId: string
    assignedAt: string | null
    accepted?: boolean
    correlationId?: string
    causationId?: string
  }): DeliveryAssignedEventV1 {
    return new DeliveryAssignedEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      businessId: data.businessId,
      assignedRiderId: data.assignedRiderId,
      assignedAt: data.assignedAt ? new Date(data.assignedAt) : null,
      accepted: data.accepted,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    })
  }
}
