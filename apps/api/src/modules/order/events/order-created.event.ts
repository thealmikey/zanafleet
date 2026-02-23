import { OrderStatus, PaymentStatus } from '@zanafleet/contracts';

/**
 * OrderCreatedEventV1
 *
 * Emitted when a new order is created.
 *
 * Contract guarantees:
 * - Immutable event data
 * - Append-only event log
 * - Deterministic event generation
 * - Versioned schema (V1)
 */
export class OrderCreatedEventV1 {
  readonly eventId: string;
  readonly eventType = 'Order.Order.CreatedV1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Order' as const;

  readonly orderId: string;
  readonly businessId: string;
  readonly deliveryId: string | null;
  readonly itemSummary: string | null;
  readonly scheduledTime: Date | null;
  readonly status: OrderStatus;
  readonly totalAmount: number | null;
  readonly currency: string | null;
  readonly paymentStatus: PaymentStatus;
  readonly createdAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    orderId: string;
    businessId: string;
    deliveryId: string | null;
    itemSummary: string | null;
    scheduledTime: Date | null;
    status: OrderStatus;
    totalAmount?: number | null;
    currency?: string | null;
    paymentStatus?: PaymentStatus;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.orderId = data.orderId;
    this.aggregateId = data.orderId;
    this.businessId = data.businessId;
    this.deliveryId = data.deliveryId;
    this.itemSummary = data.itemSummary;
    this.scheduledTime = data.scheduledTime;
    this.status = data.status;
    this.totalAmount = data.totalAmount ?? null;
    this.currency = data.currency ?? null;
    this.paymentStatus = data.paymentStatus ?? PaymentStatus.Pending;
    this.createdAt = data.createdAt;

    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'Order.Order.CreatedV1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Order';
    orderId: string;
    businessId: string;
    deliveryId: string | null;
    itemSummary: string | null;
    scheduledTime: string | null;
    status: OrderStatus;
    totalAmount: number | null;
    currency: string | null;
    paymentStatus: PaymentStatus;
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

      orderId: this.orderId,
      businessId: this.businessId,
      deliveryId: this.deliveryId,
      itemSummary: this.itemSummary,
      scheduledTime: this.scheduledTime ? this.scheduledTime.toISOString() : null,
      status: this.status,
      totalAmount: this.totalAmount,
      currency: this.currency,
      paymentStatus: this.paymentStatus,
      createdAt: this.createdAt.toISOString(),

      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    eventType: 'Order.Order.CreatedV1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Order';
    orderId: string;
    businessId: string;
    deliveryId: string | null;
    itemSummary: string | null;
    scheduledTime: string | null;
    status: OrderStatus;
    totalAmount?: number | null;
    currency?: string | null;
    paymentStatus?: PaymentStatus;
    createdAt: string;
    correlationId?: string;
    causationId?: string;
  }): OrderCreatedEventV1 {
    return new OrderCreatedEventV1({
      eventId: data.eventId,
      orderId: data.orderId,
      businessId: data.businessId,
      deliveryId: data.deliveryId,
      itemSummary: data.itemSummary,
      scheduledTime: data.scheduledTime ? new Date(data.scheduledTime) : null,
      status: data.status,
      totalAmount: data.totalAmount,
      currency: data.currency,
      paymentStatus: data.paymentStatus,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
