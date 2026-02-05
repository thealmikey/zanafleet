/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderStatus } from '@zanafleet/contracts';
import { Repository } from 'typeorm';

import { CreateOrderCommand } from '../../commands/create-order.command';
import { OrderEntity } from '../../entities/order.entity';
import { CreateOrderCommandHandler } from '../../handlers/create-order.handler';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('CreateOrderCommandHandler', () => {
  let handler: CreateOrderCommandHandler;
  let repo: jest.Mocked<Repository<OrderEntity>>;
  let eventBus: { publish: jest.Mock };

  const { v4: uuidv4 } = jest.requireMock('uuid') as { v4: jest.Mock };

  beforeEach(async () => {
    uuidv4.mockReset();
    uuidv4.mockReturnValueOnce('order-123').mockReturnValueOnce('event-123');

    repo = {
      save: jest.fn().mockImplementation(async (entity: OrderEntity) => entity),
    } as unknown as jest.Mocked<Repository<OrderEntity>>;

    eventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderCommandHandler,
        { provide: getRepositoryToken(OrderEntity), useValue: repo },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CreateOrderCommandHandler>(CreateOrderCommandHandler);
  });

  it('should persist order with Pending status and emit OrderCreatedEventV1', async () => {
    const scheduled = new Date('2024-01-05T12:34:56.000Z');
    const command = new CreateOrderCommand({
      businessId: '550e8400-e29b-41d4-a716-446655440010',
      itemSummary: 'Pizza Margherita',
      itemMetadata: { size: 'Large' },
      customerName: 'Alice',
      customerPhone: '+254700000000',
      scheduledTime: scheduled,
    });

    const result = await handler.execute(command);

    // Returns generated orderId
    expect(result).toBe('order-123');

    // Persisted with correct fields
    expect(repo.save).toHaveBeenCalledTimes(1);
    const savedEntity = repo.save.mock.calls[0][0] as OrderEntity;
    expect(savedEntity).toMatchObject({
      id: 'order-123',
      businessId: command.businessId,
      deliveryId: null,
      itemSummary: 'Pizza Margherita',
      itemMetadata: { size: 'Large' },
      customerName: 'Alice',
      customerPhone: '+254700000000',
      scheduledTime: scheduled,
      status: OrderStatus.Pending,
    });

    // Event emitted with correct payload
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = eventBus.publish.mock.calls[0][0] as {
      eventType: string;
      orderId: string;
      businessId: string;
      deliveryId: string | null;
      itemSummary: string | null;
      scheduledTime: Date | null;
      status: OrderStatus;
    };

    expect(publishedEvent.eventType).toBe('Order.Order.CreatedV1');
    expect(publishedEvent.orderId).toBe('order-123');
    expect(publishedEvent.businessId).toBe(command.businessId);
    expect(publishedEvent.deliveryId).toBeNull();
    expect(publishedEvent.itemSummary).toBe('Pizza Margherita');
    expect(publishedEvent.scheduledTime?.toISOString()).toBe(scheduled.toISOString());
    expect(publishedEvent.status).toBe(OrderStatus.Pending);
  });
});
