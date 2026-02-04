import { DeliveryScheduledEventV1 } from '../../events/delivery-scheduled.event';

describe('DeliveryScheduledEventV1', () => {
  it('should round-trip via toJSON/fromJSON with full payload', () => {
    const occurredAt = new Date('2024-03-03T10:20:30.000Z');
    const pickup = new Date('2024-03-04T08:00:00.000Z');
    const dropoff = new Date('2024-03-04T09:00:00.000Z');

    const event = new DeliveryScheduledEventV1({
      eventId: 'evt-789',
      deliveryId: 'del-100',
      businessId: 'biz-100',
      scheduledPickupTime: pickup,
      scheduledDropoffTime: dropoff,
      itemSummary: 'Fragile package',
      occurredAt,
      correlationId: 'corr-111',
      causationId: 'caus-222',
    });

    const json = event.toJSON();
    expect(json).toEqual({
      eventId: 'evt-789',
      eventType: 'Delivery.Delivery.ScheduledV1',
      eventVersion: '1.0.0',
      occurredAt: occurredAt.toISOString(),
      aggregateId: 'del-100',
      aggregateType: 'Delivery',
      deliveryId: 'del-100',
      businessId: 'biz-100',
      scheduledPickupTime: pickup.toISOString(),
      scheduledDropoffTime: dropoff.toISOString(),
      itemSummary: 'Fragile package',
      correlationId: 'corr-111',
      causationId: 'caus-222',
    });

    const materialized = DeliveryScheduledEventV1.fromJSON(json);
    expect(materialized.toJSON()).toEqual(json);
  });

  it('should handle nullable fields in round-trip', () => {
    const occurredAt = new Date('2024-04-03T10:20:30.000Z');

    const event = new DeliveryScheduledEventV1({
      eventId: 'evt-900',
      deliveryId: 'del-200',
      businessId: 'biz-200',
      scheduledPickupTime: null,
      scheduledDropoffTime: null,
      itemSummary: null,
      occurredAt,
    });

    const json = event.toJSON();
    const materialized = DeliveryScheduledEventV1.fromJSON(json);
    expect(materialized.toJSON()).toEqual(json);
  });
});
