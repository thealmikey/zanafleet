import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus, BusinessType, DeliveryStatus } from '@zanafleet/contracts';

import { BusinessOnboardedEventV1 } from '../../business/events/business-onboarded.event';
import { DeliveryCreatedEventV1 } from '../../delivery/events/delivery-created.event';
import { DeliveryStateTransitionedEventV1 } from '../../delivery/events/delivery-state-transitioned.event';
import { OrderCreatedEventV1 } from '../../order/events/order-created.event';
import { SEARCH_PROVIDER } from '../providers/search-provider.interface';

import { SearchProjectionService } from './search-projection.service';

describe('SearchProjectionService', () => {
  let service: SearchProjectionService;
  let mockSearchProvider: any;

  beforeEach(async () => {
    mockSearchProvider = {
      index: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchProjectionService,
        {
          provide: SEARCH_PROVIDER,
          useValue: mockSearchProvider,
        },
      ],
    }).compile();

    service = module.get<SearchProjectionService>(SearchProjectionService);
  });

  it('1. should index OrderCreatedEventV1 correctly (Mapping)', async () => {
    const event = new OrderCreatedEventV1({
      eventId: 'evt-1',
      orderId: 'order-123',
      businessId: 'biz-1',
      deliveryId: null,
      itemSummary: 'Pepperoni Pizza',
      status: OrderStatus.Pending,
      paymentStatus: PaymentStatus.Pending,
      scheduledTime: null,
      createdAt: new Date(),
    });

    await service.handle(event);

    expect(mockSearchProvider.index).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 'order-123',
        entityType: 'Order',
        title: 'Order #ORDER-12',
        description: 'Pepperoni Pizza',
        workspaceId: 'biz-1',
      })
    );
  });

  it('2. should index BusinessOnboardedEventV1 with geo-location (Business Mapping)', async () => {
    const event = new BusinessOnboardedEventV1({
      eventId: 'evt-2',
      businessId: 'biz-123',
      businessName: 'Zana Pizza',
      phone: '+254700000000',
      location: {
        latitude: -1.29,
        longitude: 36.82,
        humanReadableName: 'Nairobi',
        administrativeArea: 'Nairobi',
        country: 'Kenya',
      },
      businessType: BusinessType.Restaurant,
      email: 'piz@za.com',
      createdAt: new Date(),
    });

    await service.handle(event);

    expect(mockSearchProvider.index).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Business',
        title: 'Zana Pizza',
        location: { latitude: -1.29, longitude: 36.82 },
      })
    );
  });

  it('3. should handle DeliveryCreatedEventV1 (Delivery Mapping)', async () => {
    const event = new DeliveryCreatedEventV1({
      eventId: 'evt-3',
      deliveryId: 'del-123',
      businessId: 'biz-1',
      workspaceId: 'ws-1',
      isScheduled: false,
      createdAt: new Date(),
    });

    await service.handle(event);

    expect(mockSearchProvider.index).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Delivery',
        workspaceId: 'ws-1',
      })
    );
  });

  it('4. should update index on status transitions (Status Transitions)', async () => {
    const event = new DeliveryStateTransitionedEventV1({
      eventId: 'evt-4',
      deliveryId: 'del-123',
      previousState: DeliveryStatus.Requested,
      newState: DeliveryStatus.PickedUp,
      transitionedAt: new Date(),
    });

    await service.handle(event);

    expect(mockSearchProvider.index).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 'del-123',
        description: `Delivery is now ${DeliveryStatus.PickedUp}`,
      })
    );
  });

  it('5. should catch and log errors during indexing (Error Handling)', async () => {
    mockSearchProvider.index.mockRejectedValue(new Error('DB Down'));
    const consoleSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();

    const event = new OrderCreatedEventV1({
      eventId: 'evt-5',
      orderId: 'o-1',
      businessId: 'b-1',
      deliveryId: null,
      itemSummary: 'test',
      status: OrderStatus.Pending,
      paymentStatus: PaymentStatus.Pending,
      scheduledTime: null,
      createdAt: new Date(),
    });

    await service.handle(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to process event'),
      expect.any(String)
    );
  });

  it('6. should preserve metadata fields correctly (Metadata Preservation)', async () => {
    const event = new OrderCreatedEventV1({
      eventId: 'evt-6',
      orderId: 'o-6',
      businessId: 'b-6',
      deliveryId: null,
      itemSummary: 'test',
      status: OrderStatus.Fulfilled,
      paymentStatus: PaymentStatus.Succeeded,
      totalAmount: 100,
      currency: 'KES',
      scheduledTime: null,
      createdAt: new Date(),
    });

    await service.handle(event);

    expect(mockSearchProvider.index).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          status: OrderStatus.Fulfilled,
          totalAmount: 100,
          currency: 'KES',
        }),
      })
    );
  });

  it('7. should generate consistent titles for entities (Title Generation)', async () => {
    const event = new OrderCreatedEventV1({
      eventId: 'evt-7',
      orderId: 'abcdefgh-1234',
      businessId: 'b-7',
      deliveryId: null,
      itemSummary: 'test',
      status: OrderStatus.Pending,
      paymentStatus: PaymentStatus.Pending,
      scheduledTime: null,
      createdAt: new Date(),
    });

    await service.handle(event);

    expect(mockSearchProvider.index).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Order #ABCDEFGH',
      })
    );
  });

  it('8. should handle null or empty summaries gracefully (Description Sanitization)', async () => {
    const event = new OrderCreatedEventV1({
      eventId: 'evt-8',
      orderId: 'o-8',
      businessId: 'b-8',
      deliveryId: null,
      itemSummary: null,
      status: OrderStatus.Pending,
      paymentStatus: PaymentStatus.Pending,
      scheduledTime: null,
      createdAt: new Date(),
    });

    await service.handle(event);

    expect(mockSearchProvider.index).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'No items listed',
      })
    );
  });

  it('9. should handle rapid event bursts for the same entity (Concurrency)', async () => {
    const event1 = new DeliveryStateTransitionedEventV1({
      eventId: 'evt-9a',
      deliveryId: 'del-burst',
      previousState: DeliveryStatus.Requested,
      newState: DeliveryStatus.PickedUp,
      transitionedAt: new Date(),
    });
    const event2 = new DeliveryStateTransitionedEventV1({
      eventId: 'evt-9b',
      deliveryId: 'del-burst',
      previousState: DeliveryStatus.PickedUp,
      newState: DeliveryStatus.Delivered,
      transitionedAt: new Date(),
    });

    await Promise.all([service.handle(event1), service.handle(event2)]);

    expect(mockSearchProvider.index).toHaveBeenCalledTimes(2);
  });

  it('10. should ignore unknown event types (Schema Evolution)', async () => {
    const unknownEvent = { constructor: { name: 'UnknownEvent' } };

    await service.handle(unknownEvent);

    expect(mockSearchProvider.index).not.toHaveBeenCalled();
  });
});
