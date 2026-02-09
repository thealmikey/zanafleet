import { EventBus } from '@nestjs/cqrs';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { CreateSettlementBatchCommandHandler } from '../../handlers/create-settlement-batch.handler';
import { CreateSettlementBatchCommand } from '../../commands/create-settlement-batch.command';
import { SettlementBatchEntity } from '../../entities/settlement-batch.entity';
import { SettlementItemEntity } from '../../entities/settlement-item.entity';
import { SettlementBatchCreatedEventV1 } from '../../events/batch-created.event';
import { SettlementStatus, PayoutMethod } from '../../dto/settlement.enums';
import { LedgerEntryEntity, LedgerCategory, LedgerEntryType, LedgerReferenceType } from '@api/modules/ledger';
import { EventBusService } from '@api/core/event-bus';

describe('CreateSettlementBatchCommandHandler', () => {
  let handler: CreateSettlementBatchCommandHandler;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockEventBusService: jest.Mocked<EventBusService>;
  let mockLedgerRepo: jest.Mocked<Repository<LedgerEntryEntity>>;
  let mockEntityManager: jest.Mocked<EntityManager>;

  const createMockLedgerEntry = (amount: number, deliveryId: string): LedgerEntryEntity => {
    const entry = new LedgerEntryEntity();
    entry.id = `ledger-${deliveryId}`;
    entry.accountId = '660e8400-e29b-41d4-a716-446655440001';
    entry.entryType = LedgerEntryType.CREDIT;
    entry.category = LedgerCategory.RIDER_EARNING;
    entry.amount = amount.toFixed(2);
    entry.currency = 'KES';
    entry.balanceAfter = '500.00';
    entry.referenceType = LedgerReferenceType.PAYMENT;
    entry.referenceId = deliveryId;
    entry.description = 'Delivery earning';
    entry.metadata = { deliveryId };
    entry.createdAt = new Date('2024-01-10T10:00:00.000Z');
    return entry;
  };

  const validCommand = new CreateSettlementBatchCommand({
    riderAccountId: '660e8400-e29b-41d4-a716-446655440001',
    periodStart: new Date('2024-01-08T00:00:00.000Z'),
    periodEnd: new Date('2024-01-15T00:00:00.000Z'),
    payoutMethod: PayoutMethod.MOBILE_MONEY,
    commissionRate: 0.15,
  });

  beforeEach(() => {
    mockLedgerRepo = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<LedgerEntryEntity>>;

    mockEntityManager = {
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EntityManager>;

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockLedgerRepo),
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

  describe('with earnings', () => {
    beforeEach(() => {
      handler = new CreateSettlementBatchCommandHandler(
        mockDataSource,
        mockEventBus,
        mockEventBusService,
      );

      mockLedgerRepo.find.mockResolvedValue([
        createMockLedgerEntry(100, 'delivery-1'),
        createMockLedgerEntry(150, 'delivery-2'),
        createMockLedgerEntry(250, 'delivery-3'),
      ]);
    });

    it('should aggregate earnings and calculate commission correctly', async () => {
      const result = await handler.execute(validCommand);

      expect(result.totalEarnings).toBe(500);
      expect(result.platformCommission).toBe(75);
      expect(result.netPayout).toBe(425);
      expect(result.itemCount).toBe(3);
    });

    it('should create batch and items in a transaction', async () => {
      await handler.execute(validCommand);

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);

      const batchSaveCall = mockEntityManager.save.mock.calls.find(
        (call) => call[0] === SettlementBatchEntity,
      );
      expect(batchSaveCall).toBeDefined();

      const itemsSaveCall = mockEntityManager.save.mock.calls.find(
        (call) => call[0] === SettlementItemEntity,
      );
      expect(itemsSaveCall).toBeDefined();
    });

    it('should create batch with PENDING status', async () => {
      await handler.execute(validCommand);

      const batchSaveCall = mockEntityManager.save.mock.calls.find(
        (call) => call[0] === SettlementBatchEntity,
      );
      const savedBatch = batchSaveCall?.[1] as SettlementBatchEntity;

      expect(savedBatch.status).toBe(SettlementStatus.PENDING);
    });

    it('should create settlement items with correct commission per item', async () => {
      await handler.execute(validCommand);

      const itemsSaveCall = mockEntityManager.save.mock.calls.find(
        (call) => call[0] === SettlementItemEntity,
      );
      const savedItems = itemsSaveCall?.[1] as SettlementItemEntity[];

      expect(savedItems).toHaveLength(3);

      const item1 = savedItems.find((i) => i.earningAmount === '100.00');
      expect(item1?.commissionAmount).toBe('15.00');
      expect(item1?.netAmount).toBe('85.00');

      const item2 = savedItems.find((i) => i.earningAmount === '150.00');
      expect(item2?.commissionAmount).toBe('22.50');
      expect(item2?.netAmount).toBe('127.50');
    });

    it('should publish SettlementBatchCreatedEventV1', async () => {
      await handler.execute(validCommand);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as SettlementBatchCreatedEventV1;
      expect(publishedEvent.eventType).toBe('SettlementBatchCreatedEvent-V1');
      expect(publishedEvent.totalEarnings).toBe(500);
      expect(publishedEvent.platformCommission).toBe(75);
      expect(publishedEvent.netPayout).toBe(425);
      expect(publishedEvent.itemCount).toBe(3);
    });

    it('should publish to NATS when eventBusService is available', async () => {
      await handler.execute(validCommand);

      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'settlement.events.batch-created-v1',
        expect.any(SettlementBatchCreatedEventV1),
      );
    });

    it('should return generated batchId', async () => {
      const result = await handler.execute(validCommand);

      expect(result.batchId).toBeDefined();
      expect(result.batchId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('without earnings', () => {
    beforeEach(() => {
      handler = new CreateSettlementBatchCommandHandler(
        mockDataSource,
        mockEventBus,
        undefined,
      );

      mockLedgerRepo.find.mockResolvedValue([]);
    });

    it('should return zero values when no earnings found', async () => {
      const result = await handler.execute(validCommand);

      expect(result.itemCount).toBe(0);
      expect(result.totalEarnings).toBe(0);
      expect(result.platformCommission).toBe(0);
      expect(result.netPayout).toBe(0);
    });

    it('should not create batch or publish event when no earnings', async () => {
      await handler.execute(validCommand);

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('commission calculation', () => {
    beforeEach(() => {
      handler = new CreateSettlementBatchCommandHandler(
        mockDataSource,
        mockEventBus,
        undefined,
      );
    });

    it('should apply custom commission rate', async () => {
      mockLedgerRepo.find.mockResolvedValue([createMockLedgerEntry(1000, 'delivery-1')]);

      const commandWith20Percent = new CreateSettlementBatchCommand({
        ...validCommand,
        commissionRate: 0.2,
      });

      const result = await handler.execute(commandWith20Percent);

      expect(result.totalEarnings).toBe(1000);
      expect(result.platformCommission).toBe(200);
      expect(result.netPayout).toBe(800);
    });

    it('should handle zero commission rate', async () => {
      mockLedgerRepo.find.mockResolvedValue([createMockLedgerEntry(500, 'delivery-1')]);

      const commandWithZeroCommission = new CreateSettlementBatchCommand({
        ...validCommand,
        commissionRate: 0,
      });

      const result = await handler.execute(commandWithZeroCommission);

      expect(result.platformCommission).toBe(0);
      expect(result.netPayout).toBe(500);
    });
  });
});
