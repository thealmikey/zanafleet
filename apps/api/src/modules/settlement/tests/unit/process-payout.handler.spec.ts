import { EventBus, CommandBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProcessPayoutCommandHandler } from '../../handlers/process-payout.handler';
import { ProcessPayoutCommand } from '../../commands/process-payout.command';
import { SettlementBatchEntity } from '../../entities/settlement-batch.entity';
import { PayoutInitiatedEventV1 } from '../../events/payout-initiated.event';
import { PayoutCompletedEventV1 } from '../../events/payout-completed.event';
import { PayoutFailedEventV1 } from '../../events/payout-failed.event';
import { SettlementStatus, PayoutMethod } from '../../dto/settlement.enums';
import { PaymentProviderRegistry, PaymentProvider, PaymentStatus } from '@api/modules/payment';
import { RecordLedgerEntryCommand } from '@api/modules/ledger';
import { EventBusService } from '@api/core/event-bus';

describe('ProcessPayoutCommandHandler', () => {
  let handler: ProcessPayoutCommandHandler;
  let mockBatchRepo: jest.Mocked<Repository<SettlementBatchEntity>>;
  let mockProviderRegistry: jest.Mocked<PaymentProviderRegistry>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockCommandBus: jest.Mocked<CommandBus>;
  let mockEventBusService: jest.Mocked<EventBusService>;
  let mockProvider: jest.Mocked<PaymentProvider>;

  const existingBatch = (): SettlementBatchEntity => {
    const entity = new SettlementBatchEntity();
    entity.id = '550e8400-e29b-41d4-a716-446655440000';
    entity.riderAccountId = '660e8400-e29b-41d4-a716-446655440001';
    entity.status = SettlementStatus.PENDING;
    entity.totalEarnings = '1000.00';
    entity.platformCommission = '150.00';
    entity.netPayout = '850.00';
    entity.currency = 'KES';
    entity.payoutMethod = PayoutMethod.MOBILE_MONEY;
    entity.payoutReference = null;
    entity.periodStart = new Date('2024-01-08T00:00:00.000Z');
    entity.periodEnd = new Date('2024-01-15T00:00:00.000Z');
    entity.itemCount = 15;
    entity.processedAt = null;
    entity.failureReason = null;
    entity.metadata = { commissionRate: 0.15 };
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    return entity;
  };

  const validCommand = new ProcessPayoutCommand({
    batchId: '550e8400-e29b-41d4-a716-446655440000',
    providerId: 'mpesa',
    correlationId: '770e8400-e29b-41d4-a716-446655440002',
  });

  beforeEach(() => {
    mockBatchRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Repository<SettlementBatchEntity>>;

    mockProvider = {
      providerId: 'mpesa',
      displayName: 'M-Pesa',
      supportedCurrencies: ['KES'],
      capabilities: ['MOBILE_MONEY'],
      initiatePayment: jest.fn(),
      capturePayment: jest.fn(),
      refund: jest.fn(),
      verifyWebhook: jest.fn(),
      handleWebhook: jest.fn(),
    } as unknown as jest.Mocked<PaymentProvider>;

    mockProviderRegistry = {
      get: jest.fn().mockReturnValue(mockProvider),
    } as unknown as jest.Mocked<PaymentProviderRegistry>;

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    mockCommandBus = {
      execute: jest.fn().mockResolvedValue(['entry-1', 'entry-2']),
    } as unknown as jest.Mocked<CommandBus>;

    mockEventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBusService>;
  });

  describe('successful payout', () => {
    beforeEach(() => {
      handler = new ProcessPayoutCommandHandler(
        mockBatchRepo,
        mockProviderRegistry,
        mockEventBus,
        mockCommandBus,
        mockEventBusService,
      );

      mockBatchRepo.findOne.mockResolvedValue(existingBatch());
      mockProvider.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'tx-123',
        status: PaymentStatus.SUCCEEDED,
        providerReference: 'mpesa_ref_456',
      });
    });

    it('should call provider with B2C payment data', async () => {
      await handler.execute(validCommand);

      expect(mockProvider.initiatePayment).toHaveBeenCalledTimes(1);
      expect(mockProvider.initiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 850,
          currency: 'KES',
          metadata: expect.objectContaining({
            flowType: 'B2C',
            payoutMethod: PayoutMethod.MOBILE_MONEY,
          }),
        }),
      );
    });

    it('should update batch status to COMPLETED', async () => {
      await handler.execute(validCommand);

      expect(mockBatchRepo.update).toHaveBeenLastCalledWith(
        validCommand.batchId,
        expect.objectContaining({
          status: SettlementStatus.COMPLETED,
          payoutReference: 'mpesa_ref_456',
          processedAt: expect.any(Date),
        }),
      );
    });

    it('should record ledger entries for payout', async () => {
      await handler.execute(validCommand);

      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      const ledgerCommand = mockCommandBus.execute.mock.calls[0][0] as RecordLedgerEntryCommand;
      expect(ledgerCommand.entries.length).toBeGreaterThanOrEqual(2);
    });

    it('should publish PayoutInitiatedEventV1 and PayoutCompletedEventV1', async () => {
      await handler.execute(validCommand);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);

      const initiatedEvent = mockEventBus.publish.mock.calls[0][0] as PayoutInitiatedEventV1;
      expect(initiatedEvent.eventType).toBe('PayoutInitiatedEvent-V1');
      expect(initiatedEvent.amount).toBe(850);

      const completedEvent = mockEventBus.publish.mock.calls[1][0] as PayoutCompletedEventV1;
      expect(completedEvent.eventType).toBe('PayoutCompletedEvent-V1');
      expect(completedEvent.providerReference).toBe('mpesa_ref_456');
    });

    it('should publish to NATS', async () => {
      await handler.execute(validCommand);

      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'settlement.events.payout-initiated-v1',
        expect.any(PayoutInitiatedEventV1),
      );
      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'settlement.events.payout-completed-v1',
        expect.any(PayoutCompletedEventV1),
      );
    });

    it('should return batch ID', async () => {
      const result = await handler.execute(validCommand);

      expect(result).toBe(validCommand.batchId);
    });
  });

  describe('failed payout', () => {
    beforeEach(() => {
      handler = new ProcessPayoutCommandHandler(
        mockBatchRepo,
        mockProviderRegistry,
        mockEventBus,
        mockCommandBus,
        mockEventBusService,
      );

      mockBatchRepo.findOne.mockResolvedValue(existingBatch());
      mockProvider.initiatePayment.mockResolvedValue({
        success: false,
        transactionId: 'tx-123',
        status: PaymentStatus.FAILED,
        errorCode: 'INSUFFICIENT_BALANCE',
        errorMessage: 'Disbursement account has insufficient funds',
      });
    });

    it('should update batch status to FAILED with failure reason', async () => {
      await handler.execute(validCommand);

      expect(mockBatchRepo.update).toHaveBeenLastCalledWith(
        validCommand.batchId,
        expect.objectContaining({
          status: SettlementStatus.FAILED,
          failureReason: 'Disbursement account has insufficient funds',
        }),
      );
    });

    it('should NOT record ledger entries on failure', async () => {
      await handler.execute(validCommand);

      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should publish PayoutFailedEventV1', async () => {
      await handler.execute(validCommand);

      const events = mockEventBus.publish.mock.calls.map((call) => call[0]);
      const failedEvent = events.find(
        (e) => (e as PayoutFailedEventV1).eventType === 'PayoutFailedEvent-V1',
      ) as PayoutFailedEventV1;

      expect(failedEvent).toBeDefined();
      expect(failedEvent.errorCode).toBe('INSUFFICIENT_BALANCE');
      expect(failedEvent.errorMessage).toBe('Disbursement account has insufficient funds');
    });

    it('should preserve earnings data (batch not deleted)', async () => {
      await handler.execute(validCommand);

      const updateCalls = mockBatchRepo.update.mock.calls;
      const failedUpdate = updateCalls.find(
        (call) => (call[1] as Partial<SettlementBatchEntity>).status === SettlementStatus.FAILED,
      );

      expect(failedUpdate).toBeDefined();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      handler = new ProcessPayoutCommandHandler(
        mockBatchRepo,
        mockProviderRegistry,
        mockEventBus,
        mockCommandBus,
        undefined,
      );
    });

    it('should throw NotFoundException when batch does not exist', async () => {
      mockBatchRepo.findOne.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
    });

    it('should throw error when batch is not in PENDING status', async () => {
      const processingBatch = existingBatch();
      processingBatch.status = SettlementStatus.PROCESSING;
      mockBatchRepo.findOne.mockResolvedValue(processingBatch);

      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Settlement batch is not in PENDING status',
      );
    });

    it('should throw error when batch is already COMPLETED', async () => {
      const completedBatch = existingBatch();
      completedBatch.status = SettlementStatus.COMPLETED;
      mockBatchRepo.findOne.mockResolvedValue(completedBatch);

      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Settlement batch is not in PENDING status',
      );
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      mockBatchRepo.findOne.mockResolvedValue(existingBatch());
      mockProviderRegistry.get.mockReturnValue(undefined);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
    });
  });

  describe('status transitions', () => {
    beforeEach(() => {
      handler = new ProcessPayoutCommandHandler(
        mockBatchRepo,
        mockProviderRegistry,
        mockEventBus,
        mockCommandBus,
        undefined,
      );

      mockBatchRepo.findOne.mockResolvedValue(existingBatch());
    });

    it('should transition to PROCESSING before calling provider', async () => {
      mockProvider.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'tx-123',
        status: PaymentStatus.SUCCEEDED,
      });

      await handler.execute(validCommand);

      const updateCalls = mockBatchRepo.update.mock.calls;
      expect(updateCalls[0]).toEqual([
        validCommand.batchId,
        { status: SettlementStatus.PROCESSING },
      ]);
    });
  });
});
