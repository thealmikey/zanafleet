import { EventBusService } from '@api/core/event-bus';
import { RecordLedgerEntryCommand } from '@api/modules/ledger';
import { NotFoundException } from '@nestjs/common';
import { EventBus, CommandBus } from '@nestjs/cqrs';
import { DataSource, Repository } from 'typeorm';

import { ProcessPaymentCommand } from '../../commands/process-payment.command';
import { PaymentIntentStatus, PaymentFlowType, PaymentMethod } from '../../dto/payment.enums';
import { PaymentIntentEntity } from '../../entities/payment-intent.entity';
import { PaymentTransactionEntity } from '../../entities/payment-transaction.entity';
import { PaymentCompletedEventV1 } from '../../events/payment-completed.event';
import { PaymentFailedEventV1 } from '../../events/payment-failed.event';
import { ProcessPaymentCommandHandler } from '../../handlers/process-payment.handler';
import { PaymentStatus } from '../../providers/dto/payment-provider.types';
import { PaymentProviderRegistry } from '../../providers/payment-provider-registry.service';
import { PaymentProvider } from '../../providers/payment-provider.interface';
import {
  FraudCheckService,
  FraudDecision,
  RiskLevel,
  FraudCheckResult,
} from '../../services/fraud-check.service';

describe('ProcessPaymentCommandHandler', () => {
  let handler: ProcessPaymentCommandHandler;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockProviderRegistry: jest.Mocked<PaymentProviderRegistry>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockCommandBus: jest.Mocked<CommandBus>;
  let mockEventBusService: jest.Mocked<EventBusService>;
  let mockFraudCheckService: jest.Mocked<FraudCheckService>;
  let mockIntentRepo: jest.Mocked<Repository<PaymentIntentEntity>>;
  let mockTransactionRepo: jest.Mocked<Repository<PaymentTransactionEntity>>;
  let mockProvider: jest.Mocked<PaymentProvider>;

  const existingIntent = (): PaymentIntentEntity => {
    const entity = new PaymentIntentEntity();
    entity.id = '550e8400-e29b-41d4-a716-446655440000';
    entity.payerAccountId = '660e8400-e29b-41d4-a716-446655440001';
    entity.payeeAccountId = '770e8400-e29b-41d4-a716-446655440002';
    entity.flowType = PaymentFlowType.C2B;
    entity.amount = '100.00';
    entity.currency = 'USD';
    entity.status = PaymentIntentStatus.CREATED;
    entity.paymentMethod = PaymentMethod.CARD;
    entity.providerId = 'stripe';
    entity.invoiceId = null;
    entity.idempotencyKey = 'idem-key-123';
    entity.metadata = null;
    entity.expiresAt = null;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    return entity;
  };

  const validCommand = new ProcessPaymentCommand({
    paymentIntentId: '550e8400-e29b-41d4-a716-446655440000',
    correlationId: '880e8400-e29b-41d4-a716-446655440003',
  });

  beforeEach(() => {
    mockIntentRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Repository<PaymentIntentEntity>>;

    mockTransactionRepo = {
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Repository<PaymentTransactionEntity>>;

    mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === PaymentIntentEntity) return mockIntentRepo;
        if (entity === PaymentTransactionEntity) return mockTransactionRepo;
        return undefined;
      }),
    } as unknown as jest.Mocked<DataSource>;

    mockProvider = {
      providerId: 'stripe',
      displayName: 'Stripe',
      supportedCurrencies: ['USD'],
      capabilities: ['CARD'],
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

    mockFraudCheckService = {
      checkPaymentIntent: jest.fn().mockResolvedValue({
        decision: FraudDecision.ALLOW,
        riskLevel: RiskLevel.LOW,
        checks: [],
        policyEvaluated: false,
        evaluatedAt: new Date(),
      } as FraudCheckResult),
    } as unknown as jest.Mocked<FraudCheckService>;
  });

  describe('successful payment', () => {
    beforeEach(() => {
      handler = new ProcessPaymentCommandHandler(
        mockDataSource,
        mockProviderRegistry,
        mockEventBus,
        mockCommandBus,
        mockEventBusService,
        mockFraudCheckService
      );

      mockIntentRepo.findOne.mockResolvedValue(existingIntent());
      mockProvider.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'provider-tx-id',
        status: PaymentStatus.SUCCEEDED,
        providerReference: 'pi_123456789',
      });
    });

    it('should call provider initiatePayment', async () => {
      await handler.execute(validCommand);

      expect(mockProvider.initiatePayment).toHaveBeenCalledTimes(1);
      expect(mockProvider.initiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100,
          currency: 'USD',
          idempotencyKey: 'idem-key-123',
        })
      );
    });

    it('should create transaction record', async () => {
      await handler.execute(validCommand);

      expect(mockTransactionRepo.save).toHaveBeenCalledTimes(1);
      const savedTransaction = mockTransactionRepo.save.mock
        .calls[0][0] as PaymentTransactionEntity;
      expect(savedTransaction.paymentIntentId).toBe(validCommand.paymentIntentId);
      expect(savedTransaction.providerId).toBe('stripe');
      expect(savedTransaction.status).toBe(PaymentStatus.SUCCEEDED);
    });

    it('should update intent status to SUCCEEDED', async () => {
      await handler.execute(validCommand);

      expect(mockIntentRepo.update).toHaveBeenCalledWith(validCommand.paymentIntentId, {
        status: PaymentIntentStatus.SUCCEEDED,
      });
    });

    it('should record ledger entries (debit payer, credit payee)', async () => {
      await handler.execute(validCommand);

      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      const ledgerCommand = mockCommandBus.execute.mock.calls[0][0] as RecordLedgerEntryCommand;
      expect(ledgerCommand.entries).toHaveLength(2);

      const debitEntry = ledgerCommand.entries.find((e) => e.entryType === 'DEBIT');
      const creditEntry = ledgerCommand.entries.find((e) => e.entryType === 'CREDIT');

      expect(debitEntry?.accountId).toBe('660e8400-e29b-41d4-a716-446655440001');
      expect(creditEntry?.accountId).toBe('770e8400-e29b-41d4-a716-446655440002');
      expect(debitEntry?.amount).toBe(100);
      expect(creditEntry?.amount).toBe(100);
    });

    it('should publish PaymentCompletedEventV1', async () => {
      await handler.execute(validCommand);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as PaymentCompletedEventV1;
      expect(publishedEvent.eventType).toBe('PaymentCompletedEvent-V1');
      expect(publishedEvent.paymentIntentId).toBe(validCommand.paymentIntentId);
    });

    it('should publish to NATS', async () => {
      await handler.execute(validCommand);

      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'payment.events.completed-v1',
        expect.any(PaymentCompletedEventV1)
      );
    });

    it('should return transaction ID', async () => {
      const result = await handler.execute(validCommand);

      expect(result).toBeDefined();
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('failed payment', () => {
    beforeEach(() => {
      handler = new ProcessPaymentCommandHandler(
        mockDataSource,
        mockProviderRegistry,
        mockEventBus,
        mockCommandBus,
        mockEventBusService,
        mockFraudCheckService
      );

      mockIntentRepo.findOne.mockResolvedValue(existingIntent());
      mockProvider.initiatePayment.mockResolvedValue({
        success: false,
        transactionId: 'provider-tx-id',
        status: PaymentStatus.FAILED,
        errorCode: 'card_declined',
        errorMessage: 'Your card was declined',
      });
    });

    it('should update intent status to FAILED', async () => {
      await handler.execute(validCommand);

      expect(mockIntentRepo.update).toHaveBeenLastCalledWith(validCommand.paymentIntentId, {
        status: PaymentIntentStatus.FAILED,
      });
    });

    it('should NOT record ledger entries', async () => {
      await handler.execute(validCommand);

      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should publish PaymentFailedEventV1', async () => {
      await handler.execute(validCommand);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as PaymentFailedEventV1;
      expect(publishedEvent.eventType).toBe('PaymentFailedEvent-V1');
      expect(publishedEvent.errorCode).toBe('card_declined');
      expect(publishedEvent.errorMessage).toBe('Your card was declined');
    });

    it('should still create transaction record', async () => {
      await handler.execute(validCommand);

      expect(mockTransactionRepo.save).toHaveBeenCalledTimes(1);
      const savedTransaction = mockTransactionRepo.save.mock
        .calls[0][0] as PaymentTransactionEntity;
      expect(savedTransaction.status).toBe(PaymentStatus.FAILED);
      expect(savedTransaction.errorCode).toBe('card_declined');
    });
  });

  describe('fraud check integration', () => {
    beforeEach(() => {
      handler = new ProcessPaymentCommandHandler(
        mockDataSource,
        mockProviderRegistry,
        mockEventBus,
        mockCommandBus,
        mockEventBusService,
        mockFraudCheckService
      );

      mockIntentRepo.findOne.mockResolvedValue(existingIntent());
      mockProvider.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'tx-id',
        status: PaymentStatus.SUCCEEDED,
      });
    });

    it('should block payment when fraud check returns BLOCK', async () => {
      mockFraudCheckService.checkPaymentIntent.mockResolvedValue({
        decision: FraudDecision.BLOCK,
        riskLevel: RiskLevel.CRITICAL,
        checks: [],
        policyEvaluated: true,
        evaluatedAt: new Date(),
        blockReason: 'Velocity limit exceeded',
      });

      const result = await handler.execute(validCommand);

      expect(result).toBeDefined();
      expect(mockProvider.initiatePayment).not.toHaveBeenCalled();
      expect(mockIntentRepo.update).toHaveBeenCalledWith(validCommand.paymentIntentId, {
        status: PaymentIntentStatus.FAILED,
      });

      const failedEvent = mockEventBus.publish.mock.calls[0][0] as PaymentFailedEventV1;
      expect(failedEvent.errorCode).toBe('FRAUD_CHECK_BLOCKED');
      expect(failedEvent.errorMessage).toBe('Velocity limit exceeded');
    });

    it('should proceed when fraud check returns ALLOW', async () => {
      mockFraudCheckService.checkPaymentIntent.mockResolvedValue({
        decision: FraudDecision.ALLOW,
        riskLevel: RiskLevel.LOW,
        checks: [],
        policyEvaluated: true,
        evaluatedAt: new Date(),
      });

      await handler.execute(validCommand);

      expect(mockProvider.initiatePayment).toHaveBeenCalled();
    });

    it('should proceed when fraud check returns REVIEW', async () => {
      mockFraudCheckService.checkPaymentIntent.mockResolvedValue({
        decision: FraudDecision.REVIEW,
        riskLevel: RiskLevel.HIGH,
        checks: [],
        policyEvaluated: true,
        evaluatedAt: new Date(),
      });

      await handler.execute(validCommand);

      expect(mockProvider.initiatePayment).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      handler = new ProcessPaymentCommandHandler(
        mockDataSource,
        mockProviderRegistry,
        mockEventBus,
        mockCommandBus,
        undefined,
        undefined
      );
    });

    it('should throw NotFoundException when intent does not exist', async () => {
      mockIntentRepo.findOne.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
    });

    it('should throw error when intent is not in CREATED status', async () => {
      const processingIntent = existingIntent();
      processingIntent.status = PaymentIntentStatus.PROCESSING;
      mockIntentRepo.findOne.mockResolvedValue(processingIntent);

      await expect(handler.execute(validCommand)).rejects.toThrow(
        'Payment intent is not in CREATED status'
      );
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      mockIntentRepo.findOne.mockResolvedValue(existingIntent());
      mockProviderRegistry.get.mockReturnValue(undefined);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
    });
  });

  describe('status transitions', () => {
    beforeEach(() => {
      handler = new ProcessPaymentCommandHandler(
        mockDataSource,
        mockProviderRegistry,
        mockEventBus,
        mockCommandBus,
        undefined,
        undefined
      );

      mockIntentRepo.findOne.mockResolvedValue(existingIntent());
    });

    it('should transition to PROCESSING before calling provider', async () => {
      mockProvider.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'tx-id',
        status: PaymentStatus.SUCCEEDED,
      });

      await handler.execute(validCommand);

      const updateCalls = mockIntentRepo.update.mock.calls;
      expect(updateCalls[0]).toEqual([
        validCommand.paymentIntentId,
        { status: PaymentIntentStatus.PROCESSING },
      ]);
    });
  });
});
