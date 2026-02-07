import { Test } from '@nestjs/testing'

import { DeliveryStatus } from '@zanafleet/contracts'
import { EventBusService } from '../../../../core/event-bus'
import { NatsSubjects } from '../../../../core/event-bus/event-bus.constants'
import { DeliveryScheduledEventV1 } from '../../events/delivery-scheduled.event'
import { DeliveryService } from '../../services/delivery.service'
import { OrderCreatedSubscriber } from '../../subscribers/order-created.subscriber'

describe('OrderCreatedSubscriber', () => {
  let subscriber: OrderCreatedSubscriber
  let deliveryService: {
    createScheduled: jest.Mock
    createOnDemand: jest.Mock
    linkOrders: jest.Mock
  }
  let eventBus: { publish: jest.Mock; publishEvent: jest.Mock; isReady: jest.Mock }

  beforeEach(async () => {
    deliveryService = {
      createScheduled: jest.fn(),
      createOnDemand: jest.fn(),
      linkOrders: jest.fn(),
    }

    eventBus = {
      publish: jest.fn(),
      publishEvent: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrderCreatedSubscriber,
        { provide: DeliveryService, useValue: deliveryService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile()

    subscriber = moduleRef.get(OrderCreatedSubscriber)
  })

  it('creates a Delivery and publishes DeliveryScheduledEventV1 when scheduledTime is present', async () => {
    const scheduledAt = new Date('2025-02-01T10:00:00.000Z')
    deliveryService.createScheduled.mockResolvedValue({
      deliveryId: 'd-1',
      businessId: 'b-1',
      pickupLocationId: 'loc-p',
      dropoffLocationId: 'loc-d',
      assignedRiderId: null,
      status: DeliveryStatus.Requested,
      scheduledPickupTime: scheduledAt,
      scheduledDropoffTime: null,
      isScheduled: true,
      createdAt: new Date('2025-02-01T09:00:00.000Z'),
      updatedAt: new Date('2025-02-01T09:00:00.000Z'),
    })

    const eventPayload = {
      eventId: 'e-1',
      eventType: 'Order.Order.CreatedV1',
      eventVersion: '1.0.0',
      occurredAt: new Date('2025-02-01T09:00:00.000Z').toISOString(),
      aggregateId: 'o-1',
      aggregateType: 'Order',
      orderId: 'o-1',
      businessId: 'b-1',
      deliveryId: null,
      itemSummary: '2 items',
      scheduledTime: scheduledAt.toISOString(),
      status: 'Pending',
      createdAt: new Date('2025-02-01T09:00:00.000Z').toISOString(),
      correlationId: 'corr-1',
      causationId: 'caus-1',
      dropoffLocationId: 'loc-d',
    }

    await subscriber.handleOrderCreated(eventPayload as any, {} as any)

    // ensure a scheduled delivery was created with the scheduled pickup time
    expect(deliveryService.createScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'b-1',
        scheduledPickupTime: expect.any(Date),
        dropoffLocationId: 'loc-d',
      }),
    )

    // ensure the order -> delivery link is created
    expect(deliveryService.linkOrders).toHaveBeenCalledWith('d-1', ['o-1'])

    // ensure the delivery scheduled event was published on the bus
    expect(eventBus.publish).toHaveBeenCalledTimes(1)
    const [subject, evt] = eventBus.publish.mock.calls[0]
    expect(subject).toBe(NatsSubjects.Delivery.SCHEDULED_V1)
    expect(evt).toBeInstanceOf(DeliveryScheduledEventV1)
    const json = (evt as DeliveryScheduledEventV1).toJSON()
    expect(json.deliveryId).toBe('d-1')
    expect(json.businessId).toBe('b-1')
    expect(json.scheduledPickupTime).toBe(scheduledAt.toISOString())
  })
})
