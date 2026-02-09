import { Repository } from 'typeorm';
import {
  PayoutRiskService,
  RiskDecision,
  PayoutRiskLevel,
} from '../../services/payout-risk.service';
import { SettlementBatchEntity } from '../../entities/settlement-batch.entity';
import { SettlementStatus, PayoutMethod } from '../../dto/settlement.enums';
import { AccountEntity, AccountStatus, AccountType } from '@api/modules/account';
import { LedgerEntryEntity, LedgerEntryType, LedgerCategory, LedgerReferenceType } from '@api/modules/ledger';

describe('PayoutRiskService', () => {
  let service: PayoutRiskService;
  let mockAccountRepo: jest.Mocked<Repository<AccountEntity>>;
  let mockLedgerRepo: jest.Mocked<Repository<LedgerEntryEntity>>;

  const createBatch = (overrides?: Partial<ReturnType<SettlementBatchEntity['toDomain']>>): SettlementBatchEntity => {
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

    if (overrides) {
      if (overrides.totalEarnings !== undefined) entity.totalEarnings = overrides.totalEarnings.toFixed(2);
      if (overrides.netPayout !== undefined) entity.netPayout = overrides.netPayout.toFixed(2);
      if (overrides.itemCount !== undefined) entity.itemCount = overrides.itemCount;
    }

    return entity;
  };

  const createAccount = (status: AccountStatus): AccountEntity => {
    const entity = new AccountEntity();
    entity.id = 'acc-123';
    entity.externalId = '660e8400-e29b-41d4-a716-446655440001';
    entity.accountType = AccountType.RIDER;
    entity.status = status;
    entity.currency = 'KES';
    entity.metadata = null;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    return entity;
  };

  const createLedgerEntry = (amount: number, daysAgo: number): LedgerEntryEntity => {
    const entry = new LedgerEntryEntity();
    entry.id = `ledger-${Math.random()}`;
    entry.accountId = '660e8400-e29b-41d4-a716-446655440001';
    entry.entryType = LedgerEntryType.CREDIT;
    entry.category = LedgerCategory.RIDER_EARNING;
    entry.amount = amount.toFixed(2);
    entry.currency = 'KES';
    entry.balanceAfter = '500.00';
    entry.referenceType = LedgerReferenceType.PAYMENT;
    entry.referenceId = 'ref-123';
    entry.description = 'Test earning';
    entry.metadata = null;
    entry.createdAt = new Date();
    entry.createdAt.setDate(entry.createdAt.getDate() - daysAgo);
    return entry;
  };

  beforeEach(() => {
    mockAccountRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<AccountEntity>>;

    mockLedgerRepo = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<LedgerEntryEntity>>;
  });

  describe('without optional services', () => {
    beforeEach(() => {
      service = new PayoutRiskService(undefined, undefined);
    });

    it('should perform basic checks without repositories', async () => {
      const batch = createBatch();

      const result = await service.checkPayoutEligibility(batch);

      expect(result.decision).toBe(RiskDecision.APPROVE);
      expect(result.checks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('account status checks', () => {
    beforeEach(() => {
      service = new PayoutRiskService(mockAccountRepo, undefined);
    });

    it('should approve active rider accounts', async () => {
      mockAccountRepo.findOne.mockResolvedValue(createAccount(AccountStatus.ACTIVE));

      const result = await service.checkPayoutEligibility(createBatch());

      const accountCheck = result.checks.find((c) => c.checkName === 'account_status');
      expect(accountCheck?.passed).toBe(true);
      expect(accountCheck?.riskLevel).toBe(PayoutRiskLevel.LOW);
    });

    it('should reject suspended accounts', async () => {
      mockAccountRepo.findOne.mockResolvedValue(createAccount(AccountStatus.SUSPENDED));

      const result = await service.checkPayoutEligibility(createBatch());

      expect(result.decision).toBe(RiskDecision.REJECT);
      const accountCheck = result.checks.find((c) => c.checkName === 'account_status');
      expect(accountCheck?.passed).toBe(false);
      expect(accountCheck?.riskLevel).toBe(PayoutRiskLevel.CRITICAL);
    });

    it('should reject when account not found', async () => {
      mockAccountRepo.findOne.mockResolvedValue(null);

      const result = await service.checkPayoutEligibility(createBatch());

      expect(result.decision).toBe(RiskDecision.REJECT);
    });
  });

  describe('earning pattern checks', () => {
    beforeEach(() => {
      service = new PayoutRiskService(undefined, mockLedgerRepo);
    });

    it('should approve normal earning patterns', async () => {
      const entries = Array.from({ length: 30 }, (_, i) =>
        createLedgerEntry(30, i),
      );
      mockLedgerRepo.find.mockResolvedValue(entries);

      const batch = createBatch({ totalEarnings: 200 });
      const result = await service.checkPayoutEligibility(batch);

      const patternCheck = result.checks.find((c) => c.checkName === 'earning_pattern');
      expect(patternCheck?.passed).toBe(true);
    });

    it('should flag unusually high earnings', async () => {
      const entries = Array.from({ length: 30 }, (_, i) =>
        createLedgerEntry(10, i),
      );
      mockLedgerRepo.find.mockResolvedValue(entries);

      const batch = createBatch({ totalEarnings: 5000 });
      const result = await service.checkPayoutEligibility(batch);

      const patternCheck = result.checks.find((c) => c.checkName === 'earning_pattern');
      expect(patternCheck?.passed).toBe(false);
      expect(patternCheck?.riskLevel).toBe(PayoutRiskLevel.CRITICAL);
    });

    it('should handle insufficient history', async () => {
      mockLedgerRepo.find.mockResolvedValue([createLedgerEntry(100, 1)]);

      const result = await service.checkPayoutEligibility(createBatch());

      const patternCheck = result.checks.find((c) => c.checkName === 'earning_pattern');
      expect(patternCheck?.passed).toBe(true);
      expect(patternCheck?.riskLevel).toBe(PayoutRiskLevel.MEDIUM);
      expect(patternCheck?.reason).toContain('Insufficient earning history');
    });
  });

  describe('payout amount checks', () => {
    beforeEach(() => {
      service = new PayoutRiskService(undefined, undefined);
    });

    it('should approve amounts below threshold', async () => {
      const batch = createBatch({ netPayout: 5000 });

      const result = await service.checkPayoutEligibility(batch);

      const amountCheck = result.checks.find((c) => c.checkName === 'payout_amount');
      expect(amountCheck?.passed).toBe(true);
      expect(amountCheck?.riskLevel).toBe(PayoutRiskLevel.LOW);
    });

    it('should reject amounts above max threshold', async () => {
      const batch = createBatch({ netPayout: 60000 });

      const result = await service.checkPayoutEligibility(batch);

      expect(result.decision).toBe(RiskDecision.REJECT);
      const amountCheck = result.checks.find((c) => c.checkName === 'payout_amount');
      expect(amountCheck?.passed).toBe(false);
      expect(amountCheck?.riskLevel).toBe(PayoutRiskLevel.CRITICAL);
    });
  });

  describe('item count checks', () => {
    beforeEach(() => {
      service = new PayoutRiskService(undefined, undefined);
    });

    it('should approve normal item counts', async () => {
      const batch = createBatch({ itemCount: 20, totalEarnings: 1000 });

      const result = await service.checkPayoutEligibility(batch);

      const itemCheck = result.checks.find((c) => c.checkName === 'item_count');
      expect(itemCheck?.passed).toBe(true);
    });

    it('should reject batches with zero items', async () => {
      const batch = createBatch({ itemCount: 0 });

      const result = await service.checkPayoutEligibility(batch);

      expect(result.decision).toBe(RiskDecision.REJECT);
      const itemCheck = result.checks.find((c) => c.checkName === 'item_count');
      expect(itemCheck?.passed).toBe(false);
      expect(itemCheck?.riskLevel).toBe(PayoutRiskLevel.CRITICAL);
    });

    it('should flag unusually high average per item', async () => {
      const batch = createBatch({ itemCount: 2, totalEarnings: 2000 });

      const result = await service.checkPayoutEligibility(batch);

      const itemCheck = result.checks.find((c) => c.checkName === 'item_count');
      expect(itemCheck?.passed).toBe(false);
      expect(itemCheck?.reason).toContain('unusually high');
    });
  });

  describe('result aggregation', () => {
    beforeEach(() => {
      service = new PayoutRiskService(mockAccountRepo, mockLedgerRepo);
    });

    it('should return APPROVE with LOW risk when all checks pass', async () => {
      mockAccountRepo.findOne.mockResolvedValue(createAccount(AccountStatus.ACTIVE));
      mockLedgerRepo.find.mockResolvedValue(
        Array.from({ length: 30 }, (_, i) => createLedgerEntry(30, i)),
      );

      const batch = createBatch({ netPayout: 800, itemCount: 15, totalEarnings: 900 });
      const result = await service.checkPayoutEligibility(batch);

      expect(result.decision).toBe(RiskDecision.APPROVE);
      expect(result.riskLevel).toBe(PayoutRiskLevel.LOW);
    });

    it('should return HOLD when multiple high risk checks', async () => {
      mockAccountRepo.findOne.mockResolvedValue(createAccount(AccountStatus.ACTIVE));
      mockLedgerRepo.find.mockResolvedValue([createLedgerEntry(10, 1)]);

      const batch = createBatch({ netPayout: 45000, totalEarnings: 50000 });
      const result = await service.checkPayoutEligibility(batch);

      expect(result.decision).toBe(RiskDecision.HOLD);
      expect(result.riskLevel).toBe(PayoutRiskLevel.HIGH);
    });
  });

  describe('configuration', () => {
    beforeEach(() => {
      service = new PayoutRiskService(undefined, undefined);
    });

    it('should update config', () => {
      service.updateConfig({ maxPayoutAmount: 100000 });

      const config = service.getConfig();
      expect(config.maxPayoutAmount).toBe(100000);
    });

    it('should return copy of config', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });
});
