import { EventBusService } from '@api/core/event-bus';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { CreateAccountCommand } from '../../commands/create-account.command';
import { AccountType, AccountStatus } from '../../dto/account.enums';
import { AccountEntity } from '../../entities/account.entity';
import { AccountCreatedEventV1 } from '../../events/account-created.event';
import { CreateAccountCommandHandler } from '../../handlers/create-account.handler';

describe('CreateAccountCommandHandler', () => {
  let handler: CreateAccountCommandHandler;
  let mockRepository: jest.Mocked<Repository<AccountEntity>>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockEventBusService: jest.Mocked<EventBusService>;

  const validCommand = new CreateAccountCommand({
    externalId: '550e8400-e29b-41d4-a716-446655440000',
    accountType: AccountType.BUSINESS,
    currency: 'USD',
    metadata: { source: 'api' },
  });

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Repository<AccountEntity>>;

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    mockEventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBusService>;
  });

  describe('without EventBusService', () => {
    beforeEach(() => {
      handler = new CreateAccountCommandHandler(mockRepository, mockEventBus, undefined);
    });

    it('should save entity to repository', async () => {
      await handler.execute(validCommand);

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      const savedEntity = mockRepository.save.mock.calls[0][0] as AccountEntity;
      expect(savedEntity.externalId).toBe(validCommand.externalId);
      expect(savedEntity.accountType).toBe(validCommand.accountType);
      expect(savedEntity.status).toBe(AccountStatus.ACTIVE);
      expect(savedEntity.currency).toBe(validCommand.currency);
      expect(savedEntity.metadata).toEqual(validCommand.metadata);
    });

    it('should publish AccountCreatedEventV1 to event bus', async () => {
      await handler.execute(validCommand);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as AccountCreatedEventV1;
      expect(publishedEvent.eventType).toBe('AccountCreatedEvent-V1');
      expect(publishedEvent.externalId).toBe(validCommand.externalId);
      expect(publishedEvent.accountType).toBe(validCommand.accountType);
      expect(publishedEvent.status).toBe(AccountStatus.ACTIVE);
      expect(publishedEvent.currency).toBe(validCommand.currency);
    });

    it('should return the generated accountId', async () => {
      const result = await handler.execute(validCommand);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(
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
      handler = new CreateAccountCommandHandler(mockRepository, mockEventBus, mockEventBusService);
    });

    it('should publish to NATS when eventBusService is available', async () => {
      await handler.execute(validCommand);

      expect(mockEventBusService.publish).toHaveBeenCalledTimes(1);
      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'account.events.created-v1',
        expect.any(AccountCreatedEventV1),
      );
    });

    it('should handle NATS publish failure gracefully', async () => {
      mockEventBusService.publish.mockRejectedValue(new Error('NATS connection failed'));

      const result = await handler.execute(validCommand);

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('event data integrity', () => {
    beforeEach(() => {
      handler = new CreateAccountCommandHandler(mockRepository, mockEventBus, undefined);
    });

    it('should generate matching accountId for entity and event', async () => {
      await handler.execute(validCommand);

      const savedEntity = mockRepository.save.mock.calls[0][0] as AccountEntity;
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as AccountCreatedEventV1;

      expect(savedEntity.id).toBe(publishedEvent.accountId);
      expect(publishedEvent.aggregateId).toBe(publishedEvent.accountId);
    });
  });
});
