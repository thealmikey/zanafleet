import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EventBusService } from '../../../../core/event-bus/event-bus.service';
import { AccountEntity, AccountStatus } from '../../../account';
import { AccountType } from '../../../ledger/dto/ledger.enums';
import { RevenueDistributionEngine } from '../../../ledger/services/revenue-distribution.engine';
import {
  PaymentStatus,
  ProviderCapability,
  PaymentIntentData,
  PaymentInitiationResult,
  PaymentCaptureResult,
  RefundResult,
  WebhookProcessingResult,
} from '../../../payment/providers/dto/payment-provider.types';
import { PaymentProvider } from '../../../payment/providers/payment-provider.interface';
import { PaymentProviderRegistry } from '../../../payment/providers/payment-provider-registry.service';
import { SettlementStatus, PayoutMethod } from '../../dto/settlement.enums';
import { SettlementBatchEntity } from '../../entities/settlement-batch.entity';
import {
  PayoutRiskService,
  RiskDecision,
  PayoutRiskLevel,
} from '../../services/payout-risk.service';
import { SettlementSchedulerService } from '../../services/settlement-scheduler.service';
import {
  PayoutOrchestrator,
  PayoutStatus,
} from '../../coordinators/payout.orchestrator';

class MockPaymentProvider implements PaymentProvider {
  constructor(
    public readonly providerId: string,
    public readonly displayName: string,
    public readonly supportedCurrencies: string[],
    public readonly capabilities: ProviderCapability[],
  ) {}

  async initiatePayment(_intent: PaymentIntentData): Promise<PaymentInitiationResult> {
    return {
      success: true,
      transactionId: 'txn-123',
      status: PaymentStatus.SUCCEEDED,
      providerReference: 'ref-123',
    };
  }

  async capturePayment(transactionId: string): Promise<PaymentCaptureResult> {
    return { success: true, transactionId, status: PaymentStatus.SUCCEEDED };
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    return {
      success: true,
      refundId: 'refund-123',
      transactionId,
      amount,
      status: PaymentStatus.SUCCEEDED,
    };
  }

  verifyWebhook(_payload: unknown, _signature: string): boolean {
    return true;
  }

  async handleWebhook(_payload: unknown): Promise<WebhookProcessingResult> {
    return { acknowledged: true, eventType: 'test' };
  }
}

describe('PayoutOrchestrator', () => {
  let orchestrator: PayoutOrchestrator;
  let batchRepository: jest.Mocked<Repository<SettlementBatchEntity>>;
  let accountRepository: jest.Mocked<Repository<AccountEntity>>;
  let payoutRiskService: jest.Mocked<PayoutRiskService>;
  let revenueEngine: jest.Mocked<RevenueDistributionEngine>;
  let providerRegistry: jest.Mocked<PaymentProviderRegistry>;
  let schedulerService: jest.Mocked<SettlementSchedulerService>;
  let eventBusService: jest.Mocked<EventBusService>;

  const mockProvider = new MockPaymentProvider(
    'test-provider',
    'Test Provider',
    ['KES', 'USD'],
    ['MOBILE_MONEY', 'BANK_TRANSFER'],
  );

  const createMockBatch = (overrides: Partial<SettlementBatchEntity> = {}): SettlementBatchEntity => {
    const batch = new SettlementBatchEntity();
    batch.id = 'batch-123';
    batch.riderAccountId = 'rider-acc-001';
    batch.status = SettlementStatus.PENDING;
    batch.totalEarnings = '1000.00';
    batch.platformCommission = '150.00';
    batch.netPayout = '850.00';
    batch.currency = 'KES';
    batch.payoutMethod = PayoutMethod.MOBILE_MONEY;
    batch.periodStart = new Date('2024-01-01');
    batch.periodEnd = new Date('2024-01-07');
    batch.itemCount = 5;
    batch.createdAt = new Date();
    batch.updatedAt = new Date();
    Object.assign(batch, overrides);
    return batch;
  };

  const createMockAccount = (overrides: Partial<AccountEntity> = {}): AccountEntity => {
    const account = new AccountEntity();
    account.id = 'rider-acc-001';
    account.externalId = 'ext-001';
    account.accountType = AccountType.RIDER as any;
    account.status = AccountStatus.ACTIVE;
    account.currency = 'KES';
    account.createdAt = new Date();
    account.updatedAt = new Date();
    Object.assign(account, overrides);
    return account;
  };

  beforeEach(async () => {
    const mockBatchRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockAccountRepo = {
      findOne: jest.fn(),
    };

    const mockRiskService = {
      checkPayoutEligibility: jest.fn(),
      getConfig: jest.fn(),
    };

    const mockRevenueEngine = {
      getPayableBalance: jest.fn(),
    };

    const mockProviderRegistry = {
      get: jest.fn(),
      getDefault: jest.fn(),
      getByCapability: jest.fn(),
    };

    const mockSchedulerService = {
      getConfig: jest.fn().mockReturnValue({
        minimumPayoutThreshold: 100,
        defaultCommissionRate: 0.15,
        defaultPayoutMethod: PayoutMethod.MOBILE_MONEY,
        defaultProviderId: 'noop',
      }),
    };

    const mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutOrchestrator,
        { provide: getRepositoryToken(SettlementBatchEntity), useValue: mockBatchRepo },
        { provide: getRepositoryToken(AccountEntity), useValue: mockAccountRepo },
        { provide: PayoutRiskService, useValue: mockRiskService },
        { provide: RevenueDistributionEngine, useValue: mockRevenueEngine },
        { provide: PaymentProviderRegistry, useValue: mockProviderRegistry },
        { provide: SettlementSchedulerService, useValue: mockSchedulerService },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    orchestrator = module.get<PayoutOrchestrator>(PayoutOrchestrator);
    batchRepository = module.get(getRepositoryToken(SettlementBatchEntity));
    accountRepository = module.get(getRepositoryToken(AccountEntity));
    payoutRiskService = module.get(PayoutRiskService);
    revenueEngine = module.get(RevenueDistributionEngine);
    providerRegistry = module.get(PaymentProviderRegistry);
    schedulerService = module.get(SettlementSchedulerService);
    eventBusService = module.get(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiatePayout', () => {
    beforeEach(() => {
      accountRepository.findOne.mockResolvedValue(createMockAccount());
      revenueEngine.getPayableBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        accountType: AccountType.RIDER,
        totalPayable: 1000,
        totalPaid: 150,
        pendingAmount: 850,
        currency: 'KES',
        lastUpdated: new Date(),
      });
      payoutRiskService.checkPayoutEligibility.mockResolvedValue({
        decision: RiskDecision.APPROVE,
        riskLevel: PayoutRiskLevel.LOW,
        checks: [],
        evaluatedAt: new Date(),
      });
      providerRegistry.get.mockReturnValue(mockProvider);
      batchRepository.save.mockImplementation(async (batch) => batch as SettlementBatchEntity);
      batchRepository.update.mockResolvedValue({ affected: 1 } as any);
    });

    it('should successfully initiate a payout', async () => {
      const result = await orchestrator.initiatePayout('rider-acc-001');

      expect(result.success).toBe(true);
      expect(result.status).toBe(PayoutStatus.COMPLETED);
      expect(result.amount).toBe(850);
      expect(result.currency).toBe('KES');
      expect(result.batchId).toBeDefined();
    });

    it('should block payout when KYC verification fails', async () => {
      accountRepository.findOne.mockResolvedValue(
        createMockAccount({ status: AccountStatus.SUSPENDED }),
      );

      const result = await orchestrator.initiatePayout('rider-acc-001');

      expect(result.success).toBe(false);
      expect(result.status).toBe(PayoutStatus.KYC_BLOCKED);
      expect(result.error).toContain('KYC verification failed');
    });

    it('should block payout when account not found', async () => {
      accountRepository.findOne.mockResolvedValue(null);

      const result = await orchestrator.initiatePayout('unknown-account');

      expect(result.success).toBe(false);
      expect(result.status).toBe(PayoutStatus.KYC_BLOCKED);
      expect(result.error).toContain('Account not found');
    });

    it('should skip payout when balance is below threshold', async () => {
      revenueEngine.getPayableBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        accountType: AccountType.RIDER,
        totalPayable: 50,
        totalPaid: 0,
        pendingAmount: 50,
        currency: 'KES',
        lastUpdated: new Date(),
      });

      const result = await orchestrator.initiatePayout('rider-acc-001');

      expect(result.success).toBe(false);
      expect(result.status).toBe(PayoutStatus.INSUFFICIENT_BALANCE);
      expect(result.error).toContain('Insufficient balance');
    });

    it('should block payout when risk check fails', async () => {
      payoutRiskService.checkPayoutEligibility.mockResolvedValue({
        decision: RiskDecision.REJECT,
        riskLevel: PayoutRiskLevel.CRITICAL,
        holdReason: 'Unusual earning pattern detected',
        checks: [],
        evaluatedAt: new Date(),
      });

      const result = await orchestrator.initiatePayout('rider-acc-001');

      expect(result.success).toBe(false);
      expect(result.status).toBe(PayoutStatus.RISK_BLOCKED);
      expect(result.error).toContain('Risk check blocked');
    });

    it('should proceed with warning when risk check returns HOLD', async () => {
      payoutRiskService.checkPayoutEligibility.mockResolvedValue({
        decision: RiskDecision.HOLD,
        riskLevel: PayoutRiskLevel.MEDIUM,
        checks: [],
        evaluatedAt: new Date(),
      });

      const result = await orchestrator.initiatePayout('rider-acc-001');

      expect(result.success).toBe(true);
      expect(result.status).toBe(PayoutStatus.COMPLETED);
    });

    it('should fail when no provider is available', async () => {
      providerRegistry.get.mockReturnValue(undefined);
      providerRegistry.getByCapability.mockReturnValue([]);
      providerRegistry.getDefault.mockReturnValue(undefined);

      const result = await orchestrator.initiatePayout('rider-acc-001');

      expect(result.success).toBe(false);
      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.error).toContain('No suitable payout provider');
    });

    it('should emit Settlement.Payout.InitiatedV1 event', async () => {
      await orchestrator.initiatePayout('rider-acc-001');

      expect(eventBusService.publish).toHaveBeenCalledWith(
        'settlement.events.payout-initiated-v1',
        expect.objectContaining({
          eventType: 'Settlement.Payout.InitiatedV1',
        }),
      );
    });

    it('should emit Settlement.Payout.CompletedV1 event on success', async () => {
      await orchestrator.initiatePayout('rider-acc-001');

      expect(eventBusService.publish).toHaveBeenCalledWith(
        'settlement.events.payout-completed-v1',
        expect.objectContaining({
          eventType: 'Settlement.Payout.CompletedV1',
        }),
      );
    });

    it('should emit Settlement.Payout.FailedV1 event on failure', async () => {
      payoutRiskService.checkPayoutEligibility.mockResolvedValue({
        decision: RiskDecision.REJECT,
        riskLevel: PayoutRiskLevel.CRITICAL,
        holdReason: 'Blocked',
        checks: [],
        evaluatedAt: new Date(),
      });

      await orchestrator.initiatePayout('rider-acc-001');

      expect(eventBusService.publish).toHaveBeenCalledWith(
        'settlement.events.payout-failed-v1',
        expect.objectContaining({
          eventType: 'Settlement.Payout.FailedV1',
        }),
      );
    });

    it('should use preferred provider when specified', async () => {
      const customProvider = new MockPaymentProvider(
        'custom-provider',
        'Custom Provider',
        ['KES'],
        ['MOBILE_MONEY'],
      );
      providerRegistry.get.mockImplementation((id) =>
        id === 'custom-provider' ? customProvider : mockProvider,
      );

      const result = await orchestrator.initiatePayout('rider-acc-001', {
        providerId: 'custom-provider',
      });

      expect(result.success).toBe(true);
      expect(result.providerId).toBe('custom-provider');
    });
  });

  describe('batchPayouts', () => {
    beforeEach(() => {
      accountRepository.findOne.mockResolvedValue(createMockAccount());
      revenueEngine.getPayableBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        accountType: AccountType.RIDER,
        totalPayable: 1000,
        totalPaid: 150,
        pendingAmount: 850,
        currency: 'KES',
        lastUpdated: new Date(),
      });
      payoutRiskService.checkPayoutEligibility.mockResolvedValue({
        decision: RiskDecision.APPROVE,
        riskLevel: PayoutRiskLevel.LOW,
        checks: [],
        evaluatedAt: new Date(),
      });
      providerRegistry.get.mockReturnValue(mockProvider);
      batchRepository.save.mockImplementation(async (batch) => batch as SettlementBatchEntity);
      batchRepository.update.mockResolvedValue({ affected: 1 } as any);
    });

    it('should process multiple payouts successfully', async () => {
      const accountIds = ['rider-acc-001', 'rider-acc-002', 'rider-acc-003'];

      const result = await orchestrator.batchPayouts(accountIds);

      expect(result.totalProcessed).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it('should handle mixed success and failure in batch', async () => {
      const accountIds = ['rider-acc-001', 'rider-acc-002', 'rider-acc-003'];

      accountRepository.findOne.mockImplementation(async (opts) => {
        const id = (opts as any).where?.id;
        if (id === 'rider-acc-002') {
          return createMockAccount({ id, status: AccountStatus.SUSPENDED });
        }
        return createMockAccount({ id });
      });

      const result = await orchestrator.batchPayouts(accountIds);

      expect(result.totalProcessed).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.skippedCount).toBe(1);
      expect(result.failedCount).toBe(0);
    });

    it('should skip accounts with insufficient balance', async () => {
      const accountIds = ['rider-acc-001', 'rider-acc-002'];

      revenueEngine.getPayableBalance.mockImplementation(async (accountId) => {
        if (accountId === 'rider-acc-002') {
          return {
            accountId,
            accountType: AccountType.RIDER,
            totalPayable: 50,
            totalPaid: 0,
            pendingAmount: 50,
            currency: 'KES',
            lastUpdated: new Date(),
          };
        }
        return {
          accountId,
          accountType: AccountType.RIDER,
          totalPayable: 1000,
          totalPaid: 150,
          pendingAmount: 850,
          currency: 'KES',
          lastUpdated: new Date(),
        };
      });

      const result = await orchestrator.batchPayouts(accountIds);

      expect(result.successCount).toBe(1);
      expect(result.skippedCount).toBe(1);
    });
  });

  describe('retryFailedPayout', () => {
    it('should retry a failed payout successfully', async () => {
      const batch = createMockBatch({ status: SettlementStatus.FAILED });
      batchRepository.findOne.mockResolvedValue(batch);
      batchRepository.update.mockResolvedValue({ affected: 1 } as any);
      providerRegistry.get.mockReturnValue(mockProvider);

      // First, create a retry state by simulating a failed payout
      const retryState = {
        payoutId: 'payout-123',
        batchId: batch.id,
        attempts: 1,
        lastAttemptAt: new Date(),
      };
      (orchestrator as any).retryStates.set('payout-123', retryState);

      const result = await orchestrator.retryFailedPayout('payout-123');

      expect(result.success).toBe(true);
      expect(result.status).toBe(PayoutStatus.COMPLETED);
    });

    it('should fail when payout not found', async () => {
      const result = await orchestrator.retryFailedPayout('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No retry state found');
    });

    it('should fail when max retries exceeded', async () => {
      const batch = createMockBatch({ status: SettlementStatus.FAILED });

      const retryState = {
        payoutId: 'payout-123',
        batchId: batch.id,
        attempts: 3,
        lastAttemptAt: new Date(),
      };
      (orchestrator as any).retryStates.set('payout-123', retryState);

      const result = await orchestrator.retryFailedPayout('payout-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum retry attempts exceeded');
      expect(result.retriesRemaining).toBe(0);
    });

    it('should fail when batch is not in FAILED status', async () => {
      const batch = createMockBatch({ status: SettlementStatus.COMPLETED });
      batchRepository.findOne.mockResolvedValue(batch);

      const retryState = {
        payoutId: 'payout-123',
        batchId: batch.id,
        attempts: 1,
        lastAttemptAt: new Date(),
      };
      (orchestrator as any).retryStates.set('payout-123', retryState);

      const result = await orchestrator.retryFailedPayout('payout-123');

      expect(result.success).toBe(false);
      expect(result.status).toBe(PayoutStatus.COMPLETED);
    });
  });

  describe('retry logic with exponential backoff', () => {
    it('should retry on transient failures', async () => {
      accountRepository.findOne.mockResolvedValue(createMockAccount());
      revenueEngine.getPayableBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        accountType: AccountType.RIDER,
        totalPayable: 1000,
        totalPaid: 150,
        pendingAmount: 850,
        currency: 'KES',
        lastUpdated: new Date(),
      });
      payoutRiskService.checkPayoutEligibility.mockResolvedValue({
        decision: RiskDecision.APPROVE,
        riskLevel: PayoutRiskLevel.LOW,
        checks: [],
        evaluatedAt: new Date(),
      });

      const failingProvider = new MockPaymentProvider(
        'failing-provider',
        'Failing Provider',
        ['KES'],
        ['MOBILE_MONEY'],
      );

      let callCount = 0;
      jest.spyOn(failingProvider, 'initiatePayment').mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          return {
            success: false,
            transactionId: '',
            status: PaymentStatus.FAILED,
            errorMessage: 'Transient error',
          };
        }
        return {
          success: true,
          transactionId: 'txn-success',
          status: PaymentStatus.SUCCEEDED,
          providerReference: 'ref-success',
        };
      });

      providerRegistry.get.mockReturnValue(failingProvider);
      batchRepository.save.mockImplementation(async (batch) => batch as SettlementBatchEntity);
      batchRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await orchestrator.initiatePayout('rider-acc-001');

      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
    });

    it('should track retry state for failed payouts', async () => {
      accountRepository.findOne.mockResolvedValue(createMockAccount());
      revenueEngine.getPayableBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        accountType: AccountType.RIDER,
        totalPayable: 1000,
        totalPaid: 150,
        pendingAmount: 850,
        currency: 'KES',
        lastUpdated: new Date(),
      });
      payoutRiskService.checkPayoutEligibility.mockResolvedValue({
        decision: RiskDecision.APPROVE,
        riskLevel: PayoutRiskLevel.LOW,
        checks: [],
        evaluatedAt: new Date(),
      });

      const persistentlyFailingProvider = new MockPaymentProvider(
        'failing-provider',
        'Failing Provider',
        ['KES'],
        ['MOBILE_MONEY'],
      );

      jest.spyOn(persistentlyFailingProvider, 'initiatePayment').mockResolvedValue({
        success: false,
        transactionId: '',
        status: PaymentStatus.FAILED,
        errorMessage: 'Persistent error',
      });

      providerRegistry.get.mockReturnValue(persistentlyFailingProvider);
      batchRepository.save.mockImplementation(async (batch) => batch as SettlementBatchEntity);
      batchRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await orchestrator.initiatePayout('rider-acc-001');

      expect(result.success).toBe(false);
      expect(result.retriesRemaining).toBe(2);

      const retryState = orchestrator.getRetryState(result.payoutId);
      expect(retryState).toBeDefined();
      expect(retryState?.attempts).toBe(1);
    });
  });

  describe('getPayoutStatus', () => {
    it('should return COMPLETED for COMPLETED batch', async () => {
      const batch = createMockBatch({ status: SettlementStatus.COMPLETED });
      batchRepository.findOne.mockResolvedValue(batch);

      const retryState = {
        payoutId: 'payout-123',
        batchId: batch.id,
        attempts: 1,
        lastAttemptAt: new Date(),
      };
      (orchestrator as any).retryStates.set('payout-123', retryState);

      const status = await orchestrator.getPayoutStatus('payout-123');

      expect(status).toBe(PayoutStatus.COMPLETED);
    });

    it('should return PENDING for unknown payout', async () => {
      const status = await orchestrator.getPayoutStatus('unknown-payout');

      expect(status).toBe(PayoutStatus.PENDING);
    });
  });

  describe('cancelPayout', () => {
    it('should cancel a pending payout', async () => {
      const batch = createMockBatch({ status: SettlementStatus.PENDING });
      batchRepository.findOne.mockResolvedValue(batch);
      batchRepository.update.mockResolvedValue({ affected: 1 } as any);

      const retryState = {
        payoutId: 'payout-123',
        batchId: batch.id,
        attempts: 1,
        lastAttemptAt: new Date(),
      };
      (orchestrator as any).retryStates.set('payout-123', retryState);

      await orchestrator.cancelPayout('payout-123', 'User requested cancellation');

      expect(batchRepository.update).toHaveBeenCalledWith(
        batch.id,
        expect.objectContaining({
          status: SettlementStatus.FAILED,
          failureReason: 'User requested cancellation',
        }),
      );
    });

    it('should throw error when payout not found', async () => {
      await expect(
        orchestrator.cancelPayout('non-existent', 'Test cancellation'),
      ).rejects.toThrow('not found');
    });

    it('should throw error when trying to cancel completed payout', async () => {
      const batch = createMockBatch({ status: SettlementStatus.COMPLETED });
      batchRepository.findOne.mockResolvedValue(batch);

      const retryState = {
        payoutId: 'payout-123',
        batchId: batch.id,
        attempts: 1,
        lastAttemptAt: new Date(),
      };
      (orchestrator as any).retryStates.set('payout-123', retryState);

      await expect(
        orchestrator.cancelPayout('payout-123', 'Test cancellation'),
      ).rejects.toThrow('Cannot cancel a completed payout');
    });
  });

  describe('provider selection', () => {
    beforeEach(() => {
      accountRepository.findOne.mockResolvedValue(createMockAccount());
      revenueEngine.getPayableBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        accountType: AccountType.RIDER,
        totalPayable: 1000,
        totalPaid: 150,
        pendingAmount: 850,
        currency: 'KES',
        lastUpdated: new Date(),
      });
      payoutRiskService.checkPayoutEligibility.mockResolvedValue({
        decision: RiskDecision.APPROVE,
        riskLevel: PayoutRiskLevel.LOW,
        checks: [],
        evaluatedAt: new Date(),
      });
      batchRepository.save.mockImplementation(async (batch) => batch as SettlementBatchEntity);
      batchRepository.update.mockResolvedValue({ affected: 1 } as any);
    });

    it('should fall back to capability-based provider selection', async () => {
      providerRegistry.get.mockReturnValue(undefined);
      providerRegistry.getByCapability.mockReturnValue([mockProvider]);

      const result = await orchestrator.initiatePayout('rider-acc-001', {
        payoutMethod: PayoutMethod.MOBILE_MONEY,
      });

      expect(result.success).toBe(true);
      expect(providerRegistry.getByCapability).toHaveBeenCalledWith('MOBILE_MONEY');
    });

    it('should fall back to default provider', async () => {
      providerRegistry.get.mockReturnValue(undefined);
      providerRegistry.getByCapability.mockReturnValue([]);
      providerRegistry.getDefault.mockReturnValue(mockProvider);

      const result = await orchestrator.initiatePayout('rider-acc-001');

      expect(result.success).toBe(true);
      expect(providerRegistry.getDefault).toHaveBeenCalled();
    });

    it('should map BANK_TRANSFER payout method to capability', async () => {
      providerRegistry.get.mockReturnValue(undefined);
      providerRegistry.getByCapability.mockReturnValue([mockProvider]);

      await orchestrator.initiatePayout('rider-acc-001', {
        payoutMethod: PayoutMethod.BANK_TRANSFER,
      });

      expect(providerRegistry.getByCapability).toHaveBeenCalledWith('BANK_TRANSFER');
    });
  });

  describe('configuration', () => {
    it('should allow updating configuration', () => {
      orchestrator.updateConfig({
        minimumPayoutThreshold: 200,
        defaultCurrency: 'USD',
      });

      const config = orchestrator.getConfig();

      expect(config.minimumPayoutThreshold).toBe(200);
      expect(config.defaultCurrency).toBe('USD');
    });

    it('should use scheduler service config for commission rate', () => {
      const schedulerConfig = schedulerService.getConfig();

      expect(schedulerConfig.defaultCommissionRate).toBe(0.15);
    });
  });
});
