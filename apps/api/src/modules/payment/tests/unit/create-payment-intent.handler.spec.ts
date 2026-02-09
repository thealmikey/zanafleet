import { EventBusService } from '@api/core/event-bus';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { CreatePaymentIntentCommand } from '../../commands/create-payment-intent.command';
import { PaymentIntentStatus, PaymentFlowType, PaymentMethod } from '../../dto/payment.enums';
import { PaymentIntentEntity } from '../../entities/payment-intent.entity';
import { PaymentIntentCreatedEventV1 } from '../../events/payment-intent-created.event';
import { CreatePaymentIntentCommandHandler } from '../../handlers/create-payment-intent.handler';

describe('CreatePaymentIntentCommandHandler', () => {
  let handler: CreatePaymentIntentCommandHandler;
  let mockRepository: jest.Mocked<Repository<PaymentIntentEntity>>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockEventBusService: jest.Mocked<EventBusService>;

  const validCommand = new CreatePaymentIntentCommand({
    payerAccountId: '550e8400-e29b-41d4-a716-446655440000',
    payeeAccountId: '660e8400-e29b-41d4-a716-446655440001',
    flowType: PaymentFlowType.C2B,
    amount: 100,
    currency: 'USD',
    paymentMethod: PaymentMethod.CARD,
    providerId: 'stripe',
    idempotencyKey: 'idem-key-123',
    metadata: { orderId: 'order-456' },
  });

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Repository<PaymentIntentEntity>>;

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    mockEventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBusService>;
  });

  describe('idempotency', () => {
    beforeEach(() => {
      handler = new CreatePaymentIntentCommandHandler(
        mockRepository,
        mockEventBus,
        mockEventBusService,
      );
    });

    it('should return existing intent when idempotencyKey matches', async () => {
      const existingEntity = new PaymentIntentEntity();
      existingEntity.id = 'existing-intent-id';
      existingEntity.idempotencyKey = validCommand.idempotencyKey;

      mockRepository.findOne.mockResolvedValue(existingEntity);

      const result = await handler.execute(validCommand);

      expect(result.paymentIntentId).toBe('existing-intent-id');
      expect(result.isNew).toBe(false);
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should create new intent when idempotencyKey does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await handler.execute(validCommand);

      expect(result.isNew).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe('without EventBusService', () => {
    beforeEach(() => {
      handler = new CreatePaymentIntentCommandHandler(mockRepository, mockEventBus, undefined);
    });

    it('should save entity to repository', async () => {
      await handler.execute(validCommand);

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      const savedEntity = mockRepository.save.mock.calls[0][0] as PaymentIntentEntity;
      expect(savedEntity.payerAccountId).toBe(validCommand.payerAccountId);
      expect(savedEntity.payeeAccountId).toBe(validCommand.payeeAccountId);
      expect(savedEntity.status).toBe(PaymentIntentStatus.CREATED);
      expect(savedEntity.amount).toBe('100.00');
      expect(savedEntity.idempotencyKey).toBe(validCommand.idempotencyKey);
    });

    it('should publish PaymentIntentCreatedEventV1 to event bus', async () => {
      await handler.execute(validCommand);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as PaymentIntentCreatedEventV1;
      expect(publishedEvent.eventType).toBe('PaymentIntentCreatedEvent-V1');
      expect(publishedEvent.payerAccountId).toBe(validCommand.payerAccountId);
      expect(publishedEvent.payeeAccountId).toBe(validCommand.payeeAccountId);
      expect(publishedEvent.status).toBe(PaymentIntentStatus.CREATED);
      expect(publishedEvent.idempotencyKey).toBe(validCommand.idempotencyKey);
    });

    it('should return the generated paymentIntentId with isNew true', async () => {
      const result = await handler.execute(validCommand);

      expect(result.paymentIntentId).toBeDefined();
      expect(result.isNew).toBe(true);
      expect(result.paymentIntentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should not publish to NATS when eventBusService is not available', async () => {
      await handler.execute(validCommand);

      expect(mockEventBusService.publish).not.toHaveBeenCalled();
    });
  });

  describe('with EventBusService', () => {
    beforeEach(() => {
      handler = new CreatePaymentIntentCommandHandler(
        mockRepository,
        mockEventBus,
        mockEventBusService,
      );
    });

    it('should publish to NATS when eventBusService is available', async () => {
      await handler.execute(validCommand);

      expect(mockEventBusService.publish).toHaveBeenCalledTimes(1);
      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'payment.events.intent-created-v1',
        expect.any(PaymentIntentCreatedEventV1),
      );
    });

    it('should handle NATS publish failure gracefully', async () => {
      mockEventBusService.publish.mockRejectedValue(new Error('NATS connection failed'));

      const result = await handler.execute(validCommand);

      expect(result.isNew).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('event data integrity', () => {
    beforeEach(() => {
      handler = new CreatePaymentIntentCommandHandler(mockRepository, mockEventBus, undefined);
    });

    it('should generate matching paymentIntentId for entity and event', async () => {
      await handler.execute(validCommand);

      const savedEntity = mockRepository.save.mock.calls[0][0] as PaymentIntentEntity;
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as PaymentIntentCreatedEventV1;

      expect(savedEntity.id).toBe(publishedEvent.paymentIntentId);
      expect(publishedEvent.aggregateId).toBe(publishedEvent.paymentIntentId);
    });
  });
});
