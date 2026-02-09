import { EventBusService } from '@api/core/event-bus';
import { EventBus } from '@nestjs/cqrs';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { RecordLedgerEntryCommand } from '../../commands/record-ledger-entry.command';
import { LedgerEntryType, LedgerCategory, LedgerReferenceType } from '../../dto/ledger.enums';
import { LedgerEntryEntity } from '../../entities/ledger-entry.entity';
import { LedgerEntryRecordedEventV1 } from '../../events/ledger-entry-recorded.event';
import { RecordLedgerEntryCommandHandler } from '../../handlers/record-ledger-entry.handler';

describe('RecordLedgerEntryCommandHandler', () => {
  let handler: RecordLedgerEntryCommandHandler;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockEventBusService: jest.Mocked<EventBusService>;
  let mockRepository: jest.Mocked<Repository<LedgerEntryEntity>>;
  let mockEntityManager: jest.Mocked<EntityManager>;

  const validCommand = new RecordLedgerEntryCommand({
    referenceType: LedgerReferenceType.PAYMENT,
    referenceId: '550e8400-e29b-41d4-a716-446655440000',
    entries: [
      {
        accountId: '660e8400-e29b-41d4-a716-446655440001',
        entryType: LedgerEntryType.DEBIT,
        category: LedgerCategory.DELIVERY_FEE,
        amount: 100,
        currency: 'USD',
        description: 'Customer payment',
      },
      {
        accountId: '770e8400-e29b-41d4-a716-446655440002',
        entryType: LedgerEntryType.CREDIT,
        category: LedgerCategory.RIDER_EARNING,
        amount: 100,
        currency: 'USD',
        description: 'Rider earning',
      },
    ],
  });

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Repository<LedgerEntryEntity>>;

    mockEntityManager = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as unknown as jest.Mocked<EntityManager>;

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockEntityManager);
      }),
    } as unknown as jest.Mocked<DataSource>;

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    mockEventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBusService>;
  });

  describe('without EventBusService', () => {
    beforeEach(() => {
      handler = new RecordLedgerEntryCommandHandler(mockDataSource, mockEventBus, undefined);
    });

    it('should save all entries within a transaction', async () => {
      await handler.execute(validCommand);

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should calculate correct balanceAfter for new accounts', async () => {
      await handler.execute(validCommand);

      const savedEntities = mockRepository.save.mock.calls.map((call) => call[0]) as LedgerEntryEntity[];
      
      const debitEntry = savedEntities.find((e) => e.entryType === LedgerEntryType.DEBIT);
      const creditEntry = savedEntities.find((e) => e.entryType === LedgerEntryType.CREDIT);

      expect(debitEntry?.balanceAfter).toBe('-100.00');
      expect(creditEntry?.balanceAfter).toBe('100.00');
    });

    it('should calculate correct balanceAfter for existing accounts', async () => {
      const existingEntry = new LedgerEntryEntity();
      existingEntry.balanceAfter = '500.00';
      
      mockRepository.findOne.mockResolvedValueOnce(existingEntry);
      mockRepository.findOne.mockResolvedValueOnce(null);

      await handler.execute(validCommand);

      const savedEntities = mockRepository.save.mock.calls.map((call) => call[0]) as LedgerEntryEntity[];
      const debitEntry = savedEntities.find((e) => e.entryType === LedgerEntryType.DEBIT);

      expect(debitEntry?.balanceAfter).toBe('400.00');
    });

    it('should publish LedgerEntryRecordedEventV1 to event bus', async () => {
      await handler.execute(validCommand);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as LedgerEntryRecordedEventV1;
      expect(publishedEvent.eventType).toBe('LedgerEntryRecordedEvent-V1');
      expect(publishedEvent.referenceType).toBe(validCommand.referenceType);
      expect(publishedEvent.referenceId).toBe(validCommand.referenceId);
      expect(publishedEvent.entries).toHaveLength(2);
      expect(publishedEvent.totalAmount).toBe(100);
    });

    it('should return array of generated entry IDs', async () => {
      const result = await handler.execute(validCommand);

      expect(result).toHaveLength(2);
      result.forEach((id) => {
        expect(id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      });
    });

    it('should not publish to NATS when eventBusService is not available', async () => {
      await handler.execute(validCommand);

      expect(mockEventBusService.publish).not.toHaveBeenCalled();
    });
  });

  describe('with EventBusService', () => {
    beforeEach(() => {
      handler = new RecordLedgerEntryCommandHandler(
        mockDataSource,
        mockEventBus,
        mockEventBusService,
      );
    });

    it('should publish to NATS when eventBusService is available', async () => {
      await handler.execute(validCommand);

      expect(mockEventBusService.publish).toHaveBeenCalledTimes(1);
      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'ledger.events.entry-recorded-v1',
        expect.any(LedgerEntryRecordedEventV1),
      );
    });

    it('should handle NATS publish failure gracefully', async () => {
      mockEventBusService.publish.mockRejectedValue(new Error('NATS connection failed'));

      const result = await handler.execute(validCommand);

      expect(result).toHaveLength(2);
      expect(mockRepository.save).toHaveBeenCalledTimes(2);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('double-entry bookkeeping', () => {
    beforeEach(() => {
      handler = new RecordLedgerEntryCommandHandler(mockDataSource, mockEventBus, undefined);
    });

    it('should ensure sum of debits equals sum of credits in event', async () => {
      const multiEntryCommand = new RecordLedgerEntryCommand({
        referenceType: LedgerReferenceType.PAYMENT,
        referenceId: '550e8400-e29b-41d4-a716-446655440000',
        entries: [
          {
            accountId: '660e8400-e29b-41d4-a716-446655440001',
            entryType: LedgerEntryType.DEBIT,
            category: LedgerCategory.DELIVERY_FEE,
            amount: 100,
            currency: 'USD',
          },
          {
            accountId: '770e8400-e29b-41d4-a716-446655440002',
            entryType: LedgerEntryType.CREDIT,
            category: LedgerCategory.RIDER_EARNING,
            amount: 90,
            currency: 'USD',
          },
          {
            accountId: '880e8400-e29b-41d4-a716-446655440003',
            entryType: LedgerEntryType.CREDIT,
            category: LedgerCategory.PLATFORM_FEE,
            amount: 10,
            currency: 'USD',
          },
        ],
      });

      await handler.execute(multiEntryCommand);

      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as LedgerEntryRecordedEventV1;
      expect(publishedEvent.totalAmount).toBe(100);
      expect(publishedEvent.entries).toHaveLength(3);
    });
  });
});
