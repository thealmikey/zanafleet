import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommandBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { PaymentIntentStatus, PaymentFlowType, PaymentMethod } from '../dto/payment.enums';
import { PaymentIntentEntity } from '../entities/payment-intent.entity';
import { PaymentTransactionEntity } from '../entities/payment-transaction.entity';
import { PaymentStatus, ProviderCapability } from '../providers/dto/payment-provider.types';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { PaymentProviderRegistry } from '../providers/payment-provider-registry.service';
import { FraudCheckService, FraudDecision, RiskLevel } from '../services/fraud-check.service';
import {
  PaymentFlowOrchestrator,
  PaymentInitiationInput,
} from './payment-flow.orchestrator';

describe('PaymentFlowOrchestrator', () => {
  let orchestrator: PaymentFlowOrchestrator;
  let providerRegistry: jest.Mocked<PaymentProviderRegistry>;
  let fraudCheckService: jest.Mocked<FraudCheckService>;
  let eventBus: jest.Mocked<EventBusService>;
  let intentRepository: jest.Mocked<Repository<PaymentIntentEntity>>;
  let transactionRepository: jest.Mocked<Repository<PaymentTransactionEntity>>;

  const mockProvider: jest.Mocked<PaymentProvider> = {
    providerId: 'test-provider',
    displayName: 'Test Provider',
    supportedCurrencies: ['USD', 'EUR', 'KES'],
    capabilities: ['CARD', 'MOBILE_MONEY'] as ProviderCapability[],
    initiatePayment: jest.fn(),
    capturePayment: jest.fn(),
    refund: jest.fn(),
    verifyWebhook: jest.fn(),
    handleWebhook: jest.fn(),
  };

  const createMockFraudCheckResult = (overrides: Partial<{
    decision: FraudDecision;
    riskLevel: RiskLevel;
    blockReason?: string;
  }> = {}) => ({
    decision: FraudDecision.ALLOW,
    riskLevel: RiskLevel.LOW,
    checks: [],
    policyEvaluated: false,
    evaluatedAt: new Date(),
    ...overrides,
  });

  const createMockInput = (overrides: Partial<PaymentInitiationInput> = {}): PaymentInitiationInput => ({
    payerAccountId: 'payer-123',
    payeeAccountId: 'payee-456',
    amount: 100,
    currency: 'USD',
    paymentMethod: PaymentMethod.CARD,
    flowType: PaymentFlowType.C2B,
    ...overrides,
  });

  beforeEach(async () => {
    const mockIntentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockTransactionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentFlowOrchestrator,
        {
          provide: getRepositoryToken(PaymentIntentEntity),
          useValue: mockIntentRepo,
        },
        {
          provide: getRepositoryToken(PaymentTransactionEntity),
          useValue: mockTransactionRepo,
        },
        {
          provide: PaymentProviderRegistry,
          useValue: {
            get: jest.fn(),
            getDefault: jest.fn(),
            getByCapability: jest.fn(),
          },
        },
        {
          provide: FraudCheckService,
          useValue: {
            checkPaymentIntent: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: {
            publish: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    orchestrator = module.get<PaymentFlowOrchestrator>(PaymentFlowOrchestrator);
    providerRegistry = module.get(PaymentProviderRegistry);
    fraudCheckService = module.get(FraudCheckService);
    eventBus = module.get(EventBusService);
    intentRepository = module.get(getRepositoryToken(PaymentIntentEntity));
    transactionRepository = module.get(getRepositoryToken(PaymentTransactionEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiatePayment', () => {
    beforeEach(() => {
      intentRepository.create.mockImplementation((data) => data as PaymentIntentEntity);
      intentRepository.save.mockImplementation(async (entity) => entity as PaymentIntentEntity);
      transactionRepository.create.mockImplementation((data) => data as PaymentTransactionEntity);
      transactionRepository.save.mockResolvedValue({} as PaymentTransactionEntity);
    });

    it('should successfully initiate a payment with preferred provider', async () => {
      providerRegistry.get.mockReturnValue(mockProvider);
      fraudCheckService.checkPaymentIntent.mockResolvedValue(createMockFraudCheckResult());
      mockProvider.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-123',
        status: PaymentStatus.SUCCEEDED,
        providerReference: 'ref-123',
      });

      const input = createMockInput({ preferredProviderId: 'test-provider' });
      const result = await orchestrator.initiatePayment(input);

      expect(result.success).toBe(true);
      expect(result.status).toBe(PaymentIntentStatus.SUCCEEDED);
      expect(result.transactionId).toBe('txn-123');
      expect(result.providerId).toBe('test-provider');
      expect(providerRegistry.get).toHaveBeenCalledWith('test-provider');
    });

    it('should fall back to capability-based provider selection', async () => {
      providerRegistry.get.mockReturnValue(undefined);
      providerRegistry.getByCapability.mockReturnValue([mockProvider]);
      fraudCheckService.checkPaymentIntent.mockResolvedValue(createMockFraudCheckResult());
      mockProvider.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-456',
        status: PaymentStatus.SUCCEEDED,
        providerReference: 'ref-456',
      });

      const input = createMockInput({ preferredProviderId: 'non-existent' });
      const result = await orchestrator.initiatePayment(input);

      expect(result.success).toBe(true);
      expect(providerRegistry.getByCapability).toHaveBeenCalledWith('CARD');
    });

    it('should fall back to default provider when no capability match', async () => {
      providerRegistry.get.mockReturnValue(undefined);
      providerRegistry.getByCapability.mockReturnValue([]);
      providerRegistry.getDefault.mockReturnValue(mockProvider);
      fraudCheckService.checkPaymentIntent.mockResolvedValue(createMockFraudCheckResult());
      mockProvider.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-789',
        status: PaymentStatus.SUCCEEDED,
        providerReference: 'ref-789',
      });

      const input = createMockInput();
      const result = await orchestrator.initiatePayment(input);

      expect(result.success).toBe(true);
      expect(providerRegistry.getDefault).toHaveBeenCalled();
    });

    it('should fail when no provider is available', async () => {
      providerRegistry.get.mockReturnValue(undefined);
      providerRegistry.getByCapability.mockReturnValue([]);
      providerRegistry.getDefault.mockReturnValue(undefined);

      const input = createMockInput();
      const result = await orchestrator.initiatePayment(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No suitable payment provider');
    });

    it('should block payment when fraud check returns BLOCK decision', async () => {
      providerRegistry.get.mockReturnValue(mockProvider);
      fraudCheckService.checkPaymentIntent.mockResolvedValue(createMockFraudCheckResult({
        decision: FraudDecision.BLOCK,
        riskLevel: RiskLevel.CRITICAL,
        blockReason: 'Suspicious activity detected',
      }));

      const input = createMockInput({ preferredProviderId: 'test-provider' });
      const result = await orchestrator.initiatePayment(input);

      expect(result.success).toBe(false);
      expect(result.status).toBe(PaymentIntentStatus.FAILED);
      expect(result.error).toContain('fraud check');
      expect(mockProvider.initiatePayment).not.toHaveBeenCalled();
    });

    it('should proceed with warning when fraud check returns REVIEW decision', async () => {
      providerRegistry.get.mockReturnValue(mockProvider);
      fraudCheckService.checkPaymentIntent.mockResolvedValue(createMockFraudCheckResult({
        decision: FraudDecision.REVIEW,
        riskLevel: RiskLevel.MEDIUM,
      }));
      mockProvider.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-review',
        status: PaymentStatus.SUCCEEDED,
        providerReference: 'ref-review',
      });

      const input = createMockInput({ preferredProviderId: 'test-provider' });
      const result = await orchestrator.initiatePayment(input);

      expect(result.success).toBe(true);
      expect(mockProvider.initiatePayment).toHaveBeenCalled();
    });

    it('should emit Payment.Intent.CreatedV1 event on intent creation', async () => {
      providerRegistry.get.mockReturnValue(mockProvider);
      fraudCheckService.checkPaymentIntent.mockResolvedValue(createMockFraudCheckResult());
      mockProvider.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-event',
        status: PaymentStatus.SUCCEEDED,
        providerReference: 'ref-event',
      });

      const input = createMockInput({ preferredProviderId: 'test-provider' });
      await orchestrator.initiatePayment(input);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          eventType: 'Payment.Intent.CreatedV1',
        }),
      );
    });

    it('should emit Payment.Intent.SucceededV1 event on success', async () => {
      providerRegistry.get.mockReturnValue(mockProvider);
      fraudCheckService.checkPaymentIntent.mockResolvedValue(createMockFraudCheckResult());
      mockProvider.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-success',
        status: PaymentStatus.SUCCEEDED,
        providerReference: 'ref-success',
      });

      const input = createMockInput({ preferredProviderId: 'test-provider' });
      await orchestrator.initiatePayment(input);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          eventType: 'Payment.Intent.SucceededV1',
        }),
      );
    });

    it('should emit Payment.Intent.FailedV1 event on failure', async () => {
      providerRegistry.get.mockReturnValue(mockProvider);
      fraudCheckService.checkPaymentIntent.mockResolvedValue(createMockFraudCheckResult());
      mockProvider.initiatePayment.mockResolvedValue({
        success: false,
        transactionId: '',
        status: PaymentStatus.FAILED,
      });

      const input = createMockInput({ preferredProviderId: 'test-provider' });
      await orchestrator.initiatePayment(input);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          eventType: 'Payment.Intent.FailedV1',
        }),
      );
    });
  });

  describe('retry logic', () => {
    beforeEach(() => {
      intentRepository.create.mockImplementation((data) => data as PaymentIntentEntity);
      intentRepository.save.mockImplementation(async (entity) => entity as PaymentIntentEntity);
      transactionRepository.create.mockImplementation((data) => data as PaymentTransactionEntity);
      transactionRepository.save.mockResolvedValue({} as PaymentTransactionEntity);
    });

    it('should retry on transient failures with exponential backoff', async () => {
      providerRegistry.get.mockReturnValue(mockProvider);
      fraudCheckService.checkPaymentIntent.mockResolvedValue(createMockFraudCheckResult());

      mockProvider.initiatePayment
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce({
          success: true,
          transactionId: 'txn-retry',
          status: PaymentStatus.SUCCEEDED,
          providerReference: 'ref-retry',
        });

      const input = createMockInput({ preferredProviderId: 'test-provider' });
      const result = await orchestrator.initiatePayment(input, {
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
      });

      expect(result.success).toBe(true);
      expect(mockProvider.initiatePayment).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exceeded', async () => {
      providerRegistry.get.mockReturnValue(mockProvider);
      fraudCheckService.checkPaymentIntent.mockResolvedValue(createMockFraudCheckResult());

      mockProvider.initiatePayment.mockRejectedValue(new Error('Persistent error'));

      const input = createMockInput({ preferredProviderId: 'test-provider' });
      const result = await orchestrator.initiatePayment(input, {
        maxRetries: 2,
        baseDelayMs: 10,
        maxDelayMs: 50,
      });

      expect(result.success).toBe(false);
      expect(result.retriesRemaining).toBe(0);
      expect(mockProvider.initiatePayment).toHaveBeenCalledTimes(2);
    });

    it('should track retry state for failed payments', async () => {
      providerRegistry.get.mockReturnValue(mockProvider);
      fraudCheckService.checkPaymentIntent.mockResolvedValue(createMockFraudCheckResult());
      mockProvider.initiatePayment.mockRejectedValue(new Error('Persistent error'));

      const input = createMockInput({ preferredProviderId: 'test-provider' });
      const result = await orchestrator.initiatePayment(input, {
        maxRetries: 2,
        baseDelayMs: 10,
        maxDelayMs: 50,
      });

      const retryState = orchestrator.getRetryState(result.intentId);

      expect(retryState).toBeDefined();
      expect(retryState?.attempts).toBe(2);
    });
  });

  describe('retryFailedPayment', () => {
    it('should retry a failed payment intent', async () => {
      const existingIntent = {
        id: 'intent-123',
        payerAccountId: 'payer-123',
        payeeAccountId: 'payee-456',
        amount: 100,
        currency: 'USD',
        status: PaymentIntentStatus.FAILED,
        flowType: PaymentFlowType.C2B,
        paymentMethod: PaymentMethod.CARD,
        providerId: 'test-provider',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as PaymentIntentEntity;

      intentRepository.findOne.mockResolvedValue(existingIntent);
      providerRegistry.get.mockReturnValue(mockProvider);
      mockProvider.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-retry',
        status: PaymentStatus.SUCCEEDED,
        providerReference: 'ref-retry',
      });
      transactionRepository.create.mockImplementation((data) => data as PaymentTransactionEntity);
      transactionRepository.save.mockResolvedValue({} as PaymentTransactionEntity);

      const result = await orchestrator.retryFailedPayment('intent-123');

      expect(result.success).toBe(true);
      expect(result.intentId).toBe('intent-123');
    });

    it('should fail if intent not found', async () => {
      intentRepository.findOne.mockResolvedValue(null);

      const result = await orchestrator.retryFailedPayment('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail if intent is not in FAILED status', async () => {
      const existingIntent = {
        id: 'intent-123',
        status: PaymentIntentStatus.SUCCEEDED,
      } as PaymentIntentEntity;

      intentRepository.findOne.mockResolvedValue(existingIntent);

      const result = await orchestrator.retryFailedPayment('intent-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot retry payment');
    });
  });

  describe('capturePayment', () => {
    it('should successfully capture a payment', async () => {
      const existingTransaction = {
        id: 'txn-123',
        providerId: 'test-provider',
        intentId: 'intent-123',
        amount: 100,
        currency: 'USD',
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as PaymentTransactionEntity;

      transactionRepository.findOne.mockResolvedValue(existingTransaction);
      providerRegistry.get.mockReturnValue(mockProvider);
      mockProvider.capturePayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-123',
        status: PaymentStatus.SUCCEEDED,
      });

      const result = await orchestrator.capturePayment('txn-123');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn-123');
      expect(result.capturedAt).toBeDefined();
    });

    it('should fail if transaction not found', async () => {
      transactionRepository.findOne.mockResolvedValue(null);

      const result = await orchestrator.capturePayment('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail if provider not found', async () => {
      const existingTransaction = {
        id: 'txn-123',
        providerId: 'unknown-provider',
        intentId: 'intent-123',
        amount: 100,
        currency: 'USD',
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as PaymentTransactionEntity;

      transactionRepository.findOne.mockResolvedValue(existingTransaction);
      providerRegistry.get.mockReturnValue(undefined);

      const result = await orchestrator.capturePayment('txn-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Provider');
    });
  });

  describe('handleProviderCallback', () => {
    it('should process valid webhook callback', async () => {
      providerRegistry.get.mockReturnValue(mockProvider);
      mockProvider.verifyWebhook.mockReturnValue(true);
      mockProvider.handleWebhook.mockResolvedValue({
        acknowledged: true,
        eventType: 'payment.completed',
        transactionId: 'txn-123',
        status: PaymentStatus.SUCCEEDED,
      });

      const existingTransaction = {
        id: 'txn-123',
        intentId: 'intent-123',
        providerId: 'test-provider',
        amount: 100,
        currency: 'USD',
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as PaymentTransactionEntity;
      transactionRepository.findOne.mockResolvedValue(existingTransaction);

      await orchestrator.handleProviderCallback('test-provider', { type: 'event' }, 'sig-123');

      expect(mockProvider.verifyWebhook).toHaveBeenCalled();
      expect(mockProvider.handleWebhook).toHaveBeenCalled();
    });

    it('should reject callback from unknown provider', async () => {
      providerRegistry.get.mockReturnValue(undefined);

      await orchestrator.handleProviderCallback('unknown', { type: 'event' });

      expect(mockProvider.handleWebhook).not.toHaveBeenCalled();
    });

    it('should reject callback with invalid signature', async () => {
      providerRegistry.get.mockReturnValue(mockProvider);
      mockProvider.verifyWebhook.mockReturnValue(false);

      await orchestrator.handleProviderCallback('test-provider', { type: 'event' }, 'bad-sig');

      expect(mockProvider.handleWebhook).not.toHaveBeenCalled();
    });
  });

  describe('provider selection', () => {
    it('should reject provider that does not support currency', async () => {
      const unsupportedProvider: PaymentProvider = {
        ...mockProvider,
        supportedCurrencies: ['EUR'],
      };

      providerRegistry.get.mockReturnValue(unsupportedProvider);
      providerRegistry.getByCapability.mockReturnValue([]);
      providerRegistry.getDefault.mockReturnValue(undefined);

      const input = createMockInput({
        preferredProviderId: 'test-provider',
        currency: 'USD',
      });
      const result = await orchestrator.initiatePayment(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No suitable payment provider');
    });

    it('should map payment methods to capabilities correctly', async () => {
      providerRegistry.get.mockReturnValue(undefined);
      providerRegistry.getByCapability.mockReturnValue([mockProvider]);
      providerRegistry.getDefault.mockReturnValue(undefined);
      fraudCheckService.checkPaymentIntent.mockResolvedValue(createMockFraudCheckResult());
      mockProvider.initiatePayment.mockResolvedValue({
        success: true,
        transactionId: 'txn-mm',
        status: PaymentStatus.SUCCEEDED,
        providerReference: 'ref-mm',
      });
      intentRepository.create.mockImplementation((data) => data as PaymentIntentEntity);
      intentRepository.save.mockImplementation(async (entity) => entity as PaymentIntentEntity);
      transactionRepository.create.mockImplementation((data) => data as PaymentTransactionEntity);
      transactionRepository.save.mockResolvedValue({} as PaymentTransactionEntity);

      const input = createMockInput({ paymentMethod: PaymentMethod.MOBILE_MONEY });
      await orchestrator.initiatePayment(input);

      expect(providerRegistry.getByCapability).toHaveBeenCalledWith('MOBILE_MONEY');
    });
  });
});
