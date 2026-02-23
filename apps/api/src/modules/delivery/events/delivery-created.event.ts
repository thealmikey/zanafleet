/**
 * DeliveryCreatedEventV1
 *
 * Append-only event emitted when a new delivery is created via the lifecycle coordinator.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 */
export class DeliveryCreatedEventV1 {
  readonly eventId: string;
  readonly eventType = 'DeliveryCreatedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Delivery' as const;

  readonly deliveryId: string;
  readonly businessId: string;
  readonly workspaceId: string;
  readonly isScheduled: boolean;
  readonly scheduledPickupTime: Date | null;
  readonly estimatedCharges: number | null;
  readonly currency: string;
  readonly createdAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    deliveryId: string;
    businessId: string;
    workspaceId: string;
    isScheduled: boolean;
    scheduledPickupTime?: Date | null;
    estimatedCharges?: number | null;
    currency?: string;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.deliveryId = data.deliveryId;
    this.businessId = data.businessId;
    this.workspaceId = data.workspaceId;
    this.isScheduled = data.isScheduled;
    this.scheduledPickupTime = data.scheduledPickupTime ?? null;
    this.estimatedCharges = data.estimatedCharges ?? null;
    this.currency = data.currency ?? 'KES';
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.deliveryId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'DeliveryCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    businessId: string;
    workspaceId: string;
    isScheduled: boolean;
    scheduledPickupTime: string | null;
    estimatedCharges: number | null;
    currency: string;
    createdAt: string;
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
      workspaceId: this.workspaceId,
      isScheduled: this.isScheduled,
      scheduledPickupTime: this.scheduledPickupTime?.toISOString() ?? null,
      estimatedCharges: this.estimatedCharges,
      currency: this.currency,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    deliveryId: string;
    businessId: string;
    workspaceId: string;
    isScheduled: boolean;
    scheduledPickupTime: string | null;
    estimatedCharges: number | null;
    currency: string;
    createdAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): DeliveryCreatedEventV1 {
    return new DeliveryCreatedEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      businessId: data.businessId,
      workspaceId: data.workspaceId,
      isScheduled: data.isScheduled,
      scheduledPickupTime: data.scheduledPickupTime ? new Date(data.scheduledPickupTime) : null,
      estimatedCharges: data.estimatedCharges,
      currency: data.currency,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
