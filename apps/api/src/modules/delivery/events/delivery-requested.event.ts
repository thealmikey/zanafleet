/**
 * Domain event emitted when a business requests a new delivery intent.
 * This is emitted in addition to DeliveryCreated to explicitly capture requester intent.
 */
export class DeliveryRequestedEventV1 {
  readonly eventId: string;
  readonly eventType = 'Delivery.Delivery.RequestedV1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Delivery' as const;

  readonly deliveryId: string;
  readonly businessId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly orderId: string | null;
  readonly requestedAt: Date;
  readonly estimatedCharges: number;
  readonly currency: string;
  readonly itemSummary: string | null;
  readonly customerName: string | null;
  readonly customerPhone: string | null;
  readonly scheduledPickupTime: Date | null;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    deliveryId: string;
    businessId: string;
    workspaceId: string;
    actorId: string;
    orderId: string | null;
    requestedAt: Date;
    estimatedCharges: number;
    currency: string;
    itemSummary: string | null;
    customerName: string | null;
    customerPhone: string | null;
    scheduledPickupTime: Date | null;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.deliveryId = data.deliveryId;
    this.aggregateId = data.deliveryId;
    this.businessId = data.businessId;
    this.workspaceId = data.workspaceId;
    this.actorId = data.actorId;
    this.orderId = data.orderId;
    this.requestedAt = data.requestedAt;
    this.estimatedCharges = data.estimatedCharges;
    this.currency = data.currency;
    this.itemSummary = data.itemSummary;
    this.customerName = data.customerName;
    this.customerPhone = data.customerPhone;
    this.scheduledPickupTime = data.scheduledPickupTime;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }
}
