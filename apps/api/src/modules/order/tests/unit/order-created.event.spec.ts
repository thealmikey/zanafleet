import { OrderStatus } from '@zanafleet/contracts';
import { OrderCreatedEventV1 } from '../../events/order-created.event';

describe('OrderCreatedEventV1', () => {
  it('should round-trip via toJSON/fromJSON with full payload', () => {
    const occurredAt = new Date('2024-01-03T10:20:30.000Z');
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const scheduledTime = new Date('2024-01-05T12:34:56.000Z');

    const event = new OrderCreatedEventV1({
      eventId: 'evt-123',
      orderId: 'ord-001',
      businessId: 'biz-001',
      deliveryId: 'del-001',
      itemSummary: '2x Burgers',
      scheduledTime,
      status: OrderStatus.Pending,
      createdAt,
      occurredAt,
      correlationId: 'corr-abc',
      causationId: 'caus-xyz',
    });

    const json = event.toJSON();

    expect(json).toEqual({
      eventId: 'evt-123',
      eventType: 'Order.Order.CreatedV1',
      eventVersion: '1.0.0',
      occurredAt: occurredAt.toISOString(),
      aggregateId: 'ord-001',
      aggregateType: 'Order',
      orderId: 'ord-001',
      businessId: 'biz-001',
      deliveryId: 'del-001',
      itemSummary: '2x Burgers',
      scheduledTime: scheduledTime.toISOString(),
      status: OrderStatus.Pending,
      createdAt: createdAt.toISOString(),
      correlationId: 'corr-abc',
      causationId: 'caus-xyz',
    });

    const materialized = OrderCreatedEventV1.fromJSON(json);
    expect(materialized.toJSON()).toEqual(json);
  });

  it('should handle nullable fields in round-trip', () => {
    const occurredAt = new Date('2024-02-03T10:20:30.000Z');
    const createdAt = new Date('2024-02-01T00:00:00.000Z');

    const event = new OrderCreatedEventV1({
      eventId: 'evt-456',
      orderId: 'ord-002',
      businessId: 'biz-002',
      deliveryId: null,
      itemSummary: null,
      scheduledTime: null,
      status: OrderStatus.Confirmed,
      createdAt,
      occurredAt,
    });

    const json = event.toJSON();
    const materialized = OrderCreatedEventV1.fromJSON(json);
    expect(materialized.toJSON()).toEqual(json);
  });
});
