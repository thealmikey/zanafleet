import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { PolicyEffect } from '@zanafleet/contracts';

import { EventBusService } from '../../../../core/event-bus/event-bus.service';
import { PolicyEvaluationEngineService } from '../../../policy/services/policy-evaluation-engine.service';
import { RecordLedgerEntryCommand } from '../../commands/record-ledger-entry.command';
import {
  DeliveryType,
  LedgerEntryType,
  LedgerCategory,
  LedgerReferenceType,
  AccountType,
} from '../../dto/ledger.enums';
import {
  RevenueDistributionInput,
  SplitContext,
} from '../../dto/revenue-distribution.types';
import { LedgerService } from '../../services/ledger.service';
import { RevenueDistributionEngine } from '../../services/revenue-distribution.engine';

describe('RevenueDistributionEngine', () => {
  let engine: RevenueDistributionEngine;
  let ledgerService: jest.Mocked<LedgerService>;
  let commandBus: jest.Mocked<CommandBus>;
  let eventBusService: jest.Mocked<EventBusService>;
  let policyEngine: jest.Mocked<PolicyEvaluationEngineService>;

  const createMockInput = (
    overrides: Partial<RevenueDistributionInput> = {},
  ): RevenueDistributionInput => ({
    deliveryId: 'delivery-123',
    totalAmount: 1000,
    currency: 'KES',
    deliveryType: DeliveryType.STANDARD,
    platformAccountId: 'platform-acc-001',
    riderAccountId: 'rider-acc-001',
    saccoAccountId: 'sacco-acc-001',
    ...overrides,
  });

  beforeEach(async () => {
    const mockLedgerService = {
      getBalance: jest.fn(),
      getEntriesByAccount: jest.fn(),
      getEntriesByReference: jest.fn(),
      verifyDoubleEntryBalance: jest.fn(),
    };

    const mockCommandBus = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const mockEventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const mockPolicyEngine = {
      evaluate: jest.fn().mockResolvedValue({
        finalDecision: {
          effect: PolicyEffect.ALLOW,
          policyId: 'default-policy',
          policyName: 'Default Policy',
          reason: 'Default allow',
        },
        policyOutputs: null,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueDistributionEngine,
        { provide: LedgerService, useValue: mockLedgerService },
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: EventBusService, useValue: mockEventBusService },
        { provide: PolicyEvaluationEngineService, useValue: mockPolicyEngine },
      ],
    }).compile();

    engine = module.get<RevenueDistributionEngine>(RevenueDistributionEngine);
    ledgerService = module.get(LedgerService);
    commandBus = module.get(CommandBus);
    eventBusService = module.get(EventBusService);
    policyEngine = module.get(PolicyEvaluationEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateSplits', () => {
    it('should calculate standard delivery splits correctly', () => {
      const context: SplitContext = {
        deliveryType: DeliveryType.STANDARD,
        saccoId: 'sacco-001',
      };

      const splits = engine.calculateSplits(1000, context);

      expect(splits.platformAmount).toBe(150);
      expect(splits.saccoAmount).toBe(50);
      expect(splits.riderAmount).toBe(800);
      expect(splits.campaignSubsidyAmount).toBe(0);
      expect(splits.totalDistributed).toBe(1000);
    });

    it('should calculate express delivery splits with higher platform fee', () => {
      const context: SplitContext = {
        deliveryType: DeliveryType.EXPRESS,
        saccoId: 'sacco-001',
      };

      const splits = engine.calculateSplits(1000, context);

      expect(splits.platformAmount).toBe(180);
      expect(splits.saccoAmount).toBe(50);
      expect(splits.riderAmount).toBe(770);
      expect(splits.appliedRates.platformRate).toBe(0.18);
    });

    it('should calculate bulk delivery splits with lower platform fee', () => {
      const context: SplitContext = {
        deliveryType: DeliveryType.BULK,
        saccoId: 'sacco-001',
      };

      const splits = engine.calculateSplits(1000, context);

      expect(splits.platformAmount).toBe(100);
      expect(splits.riderAmount).toBe(850);
      expect(splits.appliedRates.platformRate).toBe(0.10);
    });

    it('should exclude sacco amount when no saccoId provided', () => {
      const context: SplitContext = {
        deliveryType: DeliveryType.STANDARD,
      };

      const splits = engine.calculateSplits(1000, context);

      expect(splits.saccoAmount).toBe(0);
      expect(splits.platformAmount).toBe(150);
      expect(splits.riderAmount).toBe(850);
    });

    it('should apply campaign subsidy to rider amount', () => {
      const context: SplitContext = {
        deliveryType: DeliveryType.STANDARD,
        saccoId: 'sacco-001',
        campaignSubsidyAmount: 100,
      };

      const splits = engine.calculateSplits(1000, context);

      expect(splits.riderAmount).toBe(900);
      expect(splits.campaignSubsidyAmount).toBe(100);
      expect(splits.totalDistributed).toBe(1100);
    });

    it('should apply custom rates when provided', () => {
      const context: SplitContext = {
        deliveryType: DeliveryType.STANDARD,
        saccoId: 'sacco-001',
        customRates: {
          platformRate: 0.10,
          saccoRate: 0.08,
          riderRate: 0.82,
        },
      };

      const splits = engine.calculateSplits(1000, context);

      expect(splits.platformAmount).toBe(100);
      expect(splits.saccoAmount).toBe(80);
      expect(splits.riderAmount).toBe(820);
    });

    it('should normalize custom rates that do not sum to 1.0', () => {
      const context: SplitContext = {
        deliveryType: DeliveryType.STANDARD,
        saccoId: 'sacco-001',
        customRates: {
          platformRate: 0.20,
          saccoRate: 0.10,
          riderRate: 0.90,
        },
      };

      const splits = engine.calculateSplits(1000, context);

      const total = splits.platformAmount + splits.saccoAmount + splits.riderAmount;
      expect(Math.abs(total - 1000)).toBeLessThan(0.02);
    });

    it('should handle fractional amounts with proper rounding', () => {
      const context: SplitContext = {
        deliveryType: DeliveryType.STANDARD,
        saccoId: 'sacco-001',
      };

      const splits = engine.calculateSplits(999.99, context);

      expect(Number.isInteger(splits.platformAmount * 100)).toBe(true);
      expect(Number.isInteger(splits.saccoAmount * 100)).toBe(true);
      expect(Number.isInteger(splits.riderAmount * 100)).toBe(true);
    });
  });

  describe('distributeDeliveryRevenue', () => {
    beforeEach(() => {
      ledgerService.getBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        balance: 5000,
        currency: 'KES',
      });
    });

    it('should successfully distribute revenue for standard delivery', async () => {
      const input = createMockInput();

      const result = await engine.distributeDeliveryRevenue(input);

      expect(result.success).toBe(true);
      expect(result.deliveryId).toBe('delivery-123');
      expect(result.splits.platformAmount).toBe(150);
      expect(result.splits.saccoAmount).toBe(50);
      expect(result.splits.riderAmount).toBe(800);
      expect(result.distributionId).toBeDefined();
    });

    it('should execute multi-leg ledger transfers', async () => {
      const input = createMockInput();

      await engine.distributeDeliveryRevenue(input);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(RecordLedgerEntryCommand),
      );

      const command = commandBus.execute.mock.calls[0][0] as RecordLedgerEntryCommand;
      expect(command.entries.length).toBeGreaterThanOrEqual(4);
      
      const platformCredit = command.entries.find(
        (e) => e.accountId === 'platform-acc-001' && e.entryType === LedgerEntryType.CREDIT,
      );
      expect(platformCredit).toBeDefined();
      expect(platformCredit?.category).toBe(LedgerCategory.PLATFORM_FEE);

      const riderCredit = command.entries.find(
        (e) => e.accountId === 'rider-acc-001' && e.entryType === LedgerEntryType.CREDIT,
      );
      expect(riderCredit).toBeDefined();
      expect(riderCredit?.category).toBe(LedgerCategory.RIDER_EARNING);

      const saccoCredit = command.entries.find(
        (e) => e.accountId === 'sacco-acc-001' && e.entryType === LedgerEntryType.CREDIT,
      );
      expect(saccoCredit).toBeDefined();
      expect(saccoCredit?.category).toBe(LedgerCategory.SACCO_COMMISSION);
    });

    it('should emit Ledger.Revenue.DistributedV1 event', async () => {
      const input = createMockInput();

      await engine.distributeDeliveryRevenue(input);

      expect(eventBusService.publish).toHaveBeenCalledWith(
        'ledger.events.revenue-distributed-v1',
        expect.objectContaining({
          eventType: 'Ledger.Revenue.DistributedV1',
          payload: expect.objectContaining({
            deliveryId: 'delivery-123',
            totalAmount: 1000,
          }),
        }),
      );
    });

    it('should emit Ledger.Earnings.AccruedV1 events for each credit entry', async () => {
      const input = createMockInput();

      await engine.distributeDeliveryRevenue(input);

      const earningsEventCalls = eventBusService.publish.mock.calls.filter(
        (call) => call[0] === 'ledger.events.earnings-accrued-v1',
      );

      expect(earningsEventCalls.length).toBe(3);
    });

    it('should handle campaign-subsidized delivery', async () => {
      const input = createMockInput({
        campaignAccountId: 'campaign-acc-001',
        campaignSubsidyAmount: 200,
      });

      const result = await engine.distributeDeliveryRevenue(input);

      expect(result.success).toBe(true);
      expect(result.splits.campaignSubsidyAmount).toBe(200);
      expect(result.splits.riderAmount).toBe(1000);

      const command = commandBus.execute.mock.calls[0][0] as RecordLedgerEntryCommand;
      const campaignDebit = command.entries.find(
        (e) => e.accountId === 'campaign-acc-001' && e.entryType === LedgerEntryType.DEBIT,
      );
      expect(campaignDebit).toBeDefined();
      expect(campaignDebit?.category).toBe(LedgerCategory.CAMPAIGN_SUBSIDY);
      expect(campaignDebit?.amount).toBe(200);
    });

    it('should integrate with policy engine for custom split rules', async () => {
      policyEngine.evaluate.mockResolvedValue({
        finalDecision: {
          effect: PolicyEffect.ALLOW,
          policyId: 'custom-split-policy',
          policyName: 'Custom Split Policy',
          reason: 'Policy allows custom split rules',
        },
        policyOutputs: {
          platformRate: 0.12,
          saccoRate: 0.03,
          riderRate: 0.85,
        },
        matchedPolicies: [],
        processingTimeMs: 5,
        evaluatedAt: new Date(),
      } as any);

      const input = createMockInput();

      const result = await engine.distributeDeliveryRevenue(input);

      expect(result.success).toBe(true);
      expect(policyEngine.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: 'REVENUE_DISTRIBUTION',
          resourceType: 'delivery',
          resourceId: 'delivery-123',
        }),
      );
    });

    it('should return failure result when ledger command fails', async () => {
      commandBus.execute.mockRejectedValue(new Error('Ledger write failed'));

      const input = createMockInput();

      const result = await engine.distributeDeliveryRevenue(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Ledger write failed');
    });

    it('should handle delivery without sacco', async () => {
      const input = createMockInput({
        saccoAccountId: undefined,
      });

      const result = await engine.distributeDeliveryRevenue(input);

      expect(result.success).toBe(true);
      expect(result.splits.saccoAmount).toBe(0);

      const command = commandBus.execute.mock.calls[0][0] as RecordLedgerEntryCommand;
      const saccoEntry = command.entries.find((e) => e.category === LedgerCategory.SACCO_COMMISSION);
      expect(saccoEntry).toBeUndefined();
    });
  });

  describe('getEarnedBalance', () => {
    it('should calculate total earned balance from credit entries', async () => {
      ledgerService.getBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        balance: 5000,
        currency: 'KES',
      });

      ledgerService.getEntriesByAccount.mockResolvedValue([
        {
          ledgerEntryId: 'entry-1',
          accountId: 'rider-acc-001',
          entryType: LedgerEntryType.CREDIT,
          category: LedgerCategory.RIDER_EARNING,
          amount: 800,
          currency: 'KES',
          balanceAfter: 800,
          referenceType: LedgerReferenceType.DELIVERY,
          referenceId: 'del-1',
          description: null,
          createdAt: new Date(),
        },
        {
          ledgerEntryId: 'entry-2',
          accountId: 'rider-acc-001',
          entryType: LedgerEntryType.CREDIT,
          category: LedgerCategory.RIDER_EARNING,
          amount: 1200,
          currency: 'KES',
          balanceAfter: 2000,
          referenceType: LedgerReferenceType.DELIVERY,
          referenceId: 'del-2',
          description: null,
          createdAt: new Date(),
        },
        {
          ledgerEntryId: 'entry-3',
          accountId: 'rider-acc-001',
          entryType: LedgerEntryType.DEBIT,
          category: LedgerCategory.PAYOUT,
          amount: 500,
          currency: 'KES',
          balanceAfter: 1500,
          referenceType: LedgerReferenceType.SETTLEMENT,
          referenceId: 'set-1',
          description: null,
          createdAt: new Date(),
        },
      ]);

      const balance = await engine.getEarnedBalance('rider-acc-001');

      expect(balance.totalEarned).toBe(2000);
      expect(balance.accountType).toBe(AccountType.RIDER);
      expect(balance.currency).toBe('KES');
    });

    it('should return zero earned balance for account with no earnings', async () => {
      ledgerService.getBalance.mockResolvedValue({
        accountId: 'new-acc-001',
        balance: 0,
        currency: 'KES',
      });
      ledgerService.getEntriesByAccount.mockResolvedValue([]);

      const balance = await engine.getEarnedBalance('new-acc-001');

      expect(balance.totalEarned).toBe(0);
    });
  });

  describe('getPayableBalance', () => {
    it('should calculate payable balance correctly', async () => {
      ledgerService.getBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        balance: 1500,
        currency: 'KES',
      });

      ledgerService.getEntriesByAccount.mockResolvedValue([
        {
          ledgerEntryId: 'entry-1',
          accountId: 'rider-acc-001',
          entryType: LedgerEntryType.CREDIT,
          category: LedgerCategory.RIDER_EARNING,
          amount: 2000,
          currency: 'KES',
          balanceAfter: 2000,
          referenceType: LedgerReferenceType.DELIVERY,
          referenceId: 'del-1',
          description: null,
          createdAt: new Date(),
        },
        {
          ledgerEntryId: 'entry-2',
          accountId: 'rider-acc-001',
          entryType: LedgerEntryType.DEBIT,
          category: LedgerCategory.PAYOUT,
          amount: 500,
          currency: 'KES',
          balanceAfter: 1500,
          referenceType: LedgerReferenceType.SETTLEMENT,
          referenceId: 'set-1',
          description: null,
          createdAt: new Date(),
        },
      ]);

      const balance = await engine.getPayableBalance('rider-acc-001');

      expect(balance.totalPayable).toBe(2000);
      expect(balance.totalPaid).toBe(500);
      expect(balance.pendingAmount).toBe(1500);
    });

    it('should not return negative pending amount', async () => {
      ledgerService.getBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        balance: 0,
        currency: 'KES',
      });

      ledgerService.getEntriesByAccount.mockResolvedValue([
        {
          ledgerEntryId: 'entry-1',
          accountId: 'rider-acc-001',
          entryType: LedgerEntryType.CREDIT,
          category: LedgerCategory.RIDER_EARNING,
          amount: 1000,
          currency: 'KES',
          balanceAfter: 1000,
          referenceType: LedgerReferenceType.DELIVERY,
          referenceId: 'del-1',
          description: null,
          createdAt: new Date(),
        },
        {
          ledgerEntryId: 'entry-2',
          accountId: 'rider-acc-001',
          entryType: LedgerEntryType.DEBIT,
          category: LedgerCategory.PAYOUT,
          amount: 1500,
          currency: 'KES',
          balanceAfter: -500,
          referenceType: LedgerReferenceType.SETTLEMENT,
          referenceId: 'set-1',
          description: null,
          createdAt: new Date(),
        },
      ]);

      const balance = await engine.getPayableBalance('rider-acc-001');

      expect(balance.pendingAmount).toBe(0);
    });
  });

  describe('policy integration', () => {
    it('should apply policy-defined rate overrides', async () => {
      policyEngine.evaluate.mockResolvedValue({
        finalDecision: {
          effect: PolicyEffect.ALLOW,
          policyId: 'custom-sacco-policy',
          policyName: 'Custom Sacco Policy',
          reason: 'Policy matched for premium sacco tier',
        },
        policyOutputs: {
          platformRate: 0.20,
          saccoRate: 0.10,
          riderRate: 0.70,
        },
        matchedPolicies: [{ policyId: 'custom-sacco-policy' }],
        processingTimeMs: 10,
        evaluatedAt: new Date(),
      } as any);

      ledgerService.getBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        balance: 5000,
        currency: 'KES',
      });

      const input = createMockInput({
        metadata: { saccoTier: 'premium' },
      });

      const result = await engine.distributeDeliveryRevenue(input);

      expect(result.success).toBe(true);
      expect(policyEngine.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            saccoTier: 'premium',
          }),
        }),
      );
    });

    it('should fall back to default splits when policy engine fails', async () => {
      policyEngine.evaluate.mockRejectedValue(new Error('Policy service unavailable'));

      ledgerService.getBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        balance: 5000,
        currency: 'KES',
      });

      const input = createMockInput();

      const result = await engine.distributeDeliveryRevenue(input);

      expect(result.success).toBe(true);
      expect(result.splits.platformAmount).toBe(150);
      expect(result.splits.riderAmount).toBe(800);
    });

    it('should proceed without policy when engine is not available', async () => {
      const moduleWithoutPolicy = await Test.createTestingModule({
        providers: [
          RevenueDistributionEngine,
          { provide: LedgerService, useValue: ledgerService },
          { provide: CommandBus, useValue: commandBus },
          { provide: EventBusService, useValue: eventBusService },
        ],
      }).compile();

      const engineWithoutPolicy = moduleWithoutPolicy.get<RevenueDistributionEngine>(
        RevenueDistributionEngine,
      );

      ledgerService.getBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        balance: 5000,
        currency: 'KES',
      });

      const input = createMockInput();

      const result = await engineWithoutPolicy.distributeDeliveryRevenue(input);

      expect(result.success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle zero amount distribution', async () => {
      const input = createMockInput({ totalAmount: 0 });

      const result = await engine.distributeDeliveryRevenue(input);

      expect(result.success).toBe(true);
      expect(result.splits.totalDistributed).toBe(0);
    });

    it('should handle very small amounts with proper precision', async () => {
      ledgerService.getBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        balance: 100,
        currency: 'KES',
      });

      const input = createMockInput({ totalAmount: 1.23 });

      const result = await engine.distributeDeliveryRevenue(input);

      expect(result.success).toBe(true);
      expect(result.splits.platformAmount).toBeCloseTo(0.18, 2);
    });

    it('should handle very large amounts', async () => {
      ledgerService.getBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        balance: 10000000,
        currency: 'KES',
      });

      const input = createMockInput({ totalAmount: 1000000 });

      const result = await engine.distributeDeliveryRevenue(input);

      expect(result.success).toBe(true);
      expect(result.splits.totalDistributed).toBe(1000000);
    });

    it('should include correlation ID in events when provided', async () => {
      ledgerService.getBalance.mockResolvedValue({
        accountId: 'rider-acc-001',
        balance: 5000,
        currency: 'KES',
      });

      const input = createMockInput({ correlationId: 'corr-123-456' });

      await engine.distributeDeliveryRevenue(input);

      expect(eventBusService.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          correlationId: 'corr-123-456',
        }),
      );
    });
  });
});
