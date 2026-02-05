import { NotificationChannel, RecipientType } from '../../dto/notification.enums';
import { CommunicationSubscriber } from '../../subscribers/communication.subscriber';

describe('CommunicationSubscriber - Order/Delivery reactions', () => {
  let subscriber: CommunicationSubscriber;

  const commandBus = {
    execute: jest.fn(),
  };

  const idempotencyService = {
    isProcessed: jest.fn(),
    markAsProcessed: jest.fn(),
    remove: jest.fn(),
  };

  const eventLogger = {
    logReceive: jest.fn(),
    logProcessed: jest.fn(),
    logSkipped: jest.fn(),
    logFailed: jest.fn(),
  };

  const messageBuilder = {
    buildDeliveryMessage: jest.fn(),
  };

  const natsCtx = (subject: string) =>
    ({
      getSubject: () => subject,
    } as any);

  beforeEach(() => {
    jest.clearAllMocks();
    subscriber = new CommunicationSubscriber(
      commandBus as any,
      idempotencyService as any,
      eventLogger as any,
      messageBuilder as any,
    );
  });

  it('should handle OrderCreated event: build message and dispatch SendNotificationCommand', async () => {
    idempotencyService.isProcessed.mockReturnValue(false);
    messageBuilder.buildDeliveryMessage.mockReturnValue('order-message');

    const data = {
      eventId: 'evt-ord-1',
      eventType: 'Order.Order.CreatedV1',
      eventVersion: '1.0.0',
      occurredAt: new Date().toISOString(),
      aggregateId: 'order-1',
      aggregateType: 'Order',
      correlationId: 'corr-1',
      payload: {
        orderId: 'order-1',
        businessId: 'biz-123',
        itemSummary: '2x Burgers',
        scheduledTime: '2024-01-05T12:34:56.000Z',
      },
    };

    await subscriber.handleOrderEvent(data as any, natsCtx('order.events.created-v1'));

    expect(idempotencyService.isProcessed).toHaveBeenCalledWith('evt-ord-1');
    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith('evt-ord-1');

    expect(messageBuilder.buildDeliveryMessage).toHaveBeenCalledWith({
      order: { itemSummary: '2x Burgers' },
      delivery: { scheduledDropoffTime: '2024-01-05T12:34:56.000Z' },
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    const cmd = commandBus.execute.mock.calls[0][0];
    expect(cmd).toMatchObject({
      recipientId: 'biz-123',
      recipientType: RecipientType.BUSINESS,
      channel: NotificationChannel.SMS,
      templateId: 'delivery-update',
      variables: { message: 'order-message' },
      workspaceId: '',
      correlationId: 'corr-1',
      causationId: 'evt-ord-1',
    });
  });

  it('should handle DeliveryScheduled event: build message and dispatch SendNotificationCommand', async () => {
    idempotencyService.isProcessed.mockReturnValue(false);
    messageBuilder.buildDeliveryMessage.mockReturnValue('delivery-scheduled-message');

    const data = {
      eventId: 'evt-del-1',
      eventType: 'Delivery.Delivery.ScheduledV1',
      eventVersion: '1.0.0',
      occurredAt: new Date().toISOString(),
      aggregateId: 'delivery-1',
      aggregateType: 'Delivery',
      correlationId: 'corr-2',
      payload: {
        deliveryId: 'delivery-1',
        businessId: 'biz-456',
        itemSummary: 'Parcel',
        scheduledDropoffTime: '2024-04-04T08:15:00.000Z',
      },
    };

    await subscriber.handleDeliveryEvent(data as any, natsCtx('delivery.events.scheduled-v1'));

    expect(idempotencyService.isProcessed).toHaveBeenCalledWith('evt-del-1');
    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith('evt-del-1');

    expect(messageBuilder.buildDeliveryMessage).toHaveBeenCalledWith({
      order: { itemSummary: 'Parcel' },
      delivery: { scheduledDropoffTime: '2024-04-04T08:15:00.000Z' },
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    const cmd = commandBus.execute.mock.calls[0][0];
    expect(cmd).toMatchObject({
      recipientId: 'biz-456',
      recipientType: RecipientType.BUSINESS,
      channel: NotificationChannel.SMS,
      templateId: 'delivery-update',
      variables: { message: 'delivery-scheduled-message' },
      workspaceId: '',
      correlationId: 'corr-2',
      causationId: 'evt-del-1',
    });
  });

  it('should skip duplicate events via idempotency', async () => {
    idempotencyService.isProcessed.mockReturnValue(true);

    const data = {
      eventId: 'evt-dup-1',
      eventType: 'Order.Order.CreatedV1',
      eventVersion: '1.0.0',
      occurredAt: new Date().toISOString(),
      aggregateId: 'order-dup',
      aggregateType: 'Order',
      payload: {
        businessId: 'biz-dup',
        itemSummary: 'Item',
        scheduledTime: '2024-01-01T00:00:00.000Z',
      },
    };

    await subscriber.handleOrderEvent(data as any, natsCtx('order.events.created-v1'));

    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(idempotencyService.markAsProcessed).not.toHaveBeenCalled();
    expect(messageBuilder.buildDeliveryMessage).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).toHaveBeenCalled();
  });

  it('should log/skip DeliveryAssigned when businessId is missing', async () => {
    idempotencyService.isProcessed.mockReturnValue(false);

    const data = {
      eventId: 'evt-del-assign-1',
      eventType: 'Delivery.Delivery.AssignedV1',
      eventVersion: '1.0.0',
      occurredAt: new Date().toISOString(),
      aggregateId: 'delivery-assign-1',
      aggregateType: 'Delivery',
      payload: {
        // businessId intentionally missing
        itemSummary: 'Food',
      },
    };

    await subscriber.handleDeliveryEvent(data as any, natsCtx('delivery.events.assigned-v1'));

    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(messageBuilder.buildDeliveryMessage).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).toHaveBeenCalled();
    const reason = eventLogger.logSkipped.mock.calls[0][1];
    expect(String(reason).toLowerCase()).toContain('businessid');
  });
});
