import { Repository, SelectQueryBuilder } from 'typeorm';

import { LedgerEntryType, LedgerCategory, LedgerReferenceType } from '../../dto/ledger.enums';
import { LedgerEntryEntity } from '../../entities/ledger-entry.entity';
import { LedgerService } from '../../services/ledger.service';

describe('LedgerService', () => {
  let service: LedgerService;
  let mockRepository: jest.Mocked<Repository<LedgerEntryEntity>>;

  const mockEntry = (): LedgerEntryEntity => {
    const entry = new LedgerEntryEntity();
    entry.id = '550e8400-e29b-41d4-a716-446655440000';
    entry.accountId = '660e8400-e29b-41d4-a716-446655440001';
    entry.entryType = LedgerEntryType.CREDIT;
    entry.category = LedgerCategory.RIDER_EARNING;
    entry.amount = '100.00';
    entry.currency = 'USD';
    entry.balanceAfter = '500.00';
    entry.referenceType = LedgerReferenceType.PAYMENT;
    entry.referenceId = '770e8400-e29b-41d4-a716-446655440002';
    entry.description = 'Test entry';
    entry.metadata = null;
    entry.createdAt = new Date('2024-01-15T10:00:00.000Z');
    return entry;
  };

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<LedgerEntryEntity>>;

    service = new LedgerService(mockRepository);
  });

  describe('getBalance', () => {
    it('should return balance from last entry', async () => {
      const entry = mockEntry();
      mockRepository.findOne.mockResolvedValue(entry);

      const result = await service.getBalance('660e8400-e29b-41d4-a716-446655440001');

      expect(result).toEqual({
        accountId: '660e8400-e29b-41d4-a716-446655440001',
        balance: 500,
        currency: 'USD',
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { accountId: '660e8400-e29b-41d4-a716-446655440001' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return null when no entries exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getBalance('660e8400-e29b-41d4-a716-446655440001');

      expect(result).toBeNull();
    });
  });

  describe('getEntriesByAccount', () => {
    it('should return entries for account', async () => {
      const entry = mockEntry();
      mockRepository.find.mockResolvedValue([entry]);

      const result = await service.getEntriesByAccount('660e8400-e29b-41d4-a716-446655440001');

      expect(result).toHaveLength(1);
      expect(result[0].ledgerEntryId).toBe(entry.id);
      expect(result[0].amount).toBe(100);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { accountId: '660e8400-e29b-41d4-a716-446655440001' },
        order: { createdAt: 'DESC' },
        take: undefined,
        skip: undefined,
      });
    });

    it('should apply pagination options', async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.getEntriesByAccount('660e8400-e29b-41d4-a716-446655440001', {
        limit: 10,
        offset: 20,
      });

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { accountId: '660e8400-e29b-41d4-a716-446655440001' },
        order: { createdAt: 'DESC' },
        take: 10,
        skip: 20,
      });
    });
  });

  describe('getEntriesByReference', () => {
    it('should return entries for reference', async () => {
      const entry = mockEntry();
      mockRepository.find.mockResolvedValue([entry]);

      const result = await service.getEntriesByReference(
        LedgerReferenceType.PAYMENT,
        '770e8400-e29b-41d4-a716-446655440002'
      );

      expect(result).toHaveLength(1);
      expect(result[0].referenceId).toBe('770e8400-e29b-41d4-a716-446655440002');
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          referenceType: LedgerReferenceType.PAYMENT,
          referenceId: '770e8400-e29b-41d4-a716-446655440002',
        },
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('verifyDoubleEntryBalance', () => {
    it('should return balanced when debits equal credits', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { entryType: LedgerEntryType.DEBIT, total: '1000.00' },
          { entryType: LedgerEntryType.CREDIT, total: '1000.00' },
        ]),
      } as unknown as SelectQueryBuilder<LedgerEntryEntity>;

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.verifyDoubleEntryBalance();

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebit).toBe(1000);
      expect(result.totalCredit).toBe(1000);
    });

    it('should return unbalanced when debits do not equal credits', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { entryType: LedgerEntryType.DEBIT, total: '1000.00' },
          { entryType: LedgerEntryType.CREDIT, total: '900.00' },
        ]),
      } as unknown as SelectQueryBuilder<LedgerEntryEntity>;

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.verifyDoubleEntryBalance();

      expect(result.isBalanced).toBe(false);
      expect(result.totalDebit).toBe(1000);
      expect(result.totalCredit).toBe(900);
    });

    it('should handle empty ledger', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      } as unknown as SelectQueryBuilder<LedgerEntryEntity>;

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.verifyDoubleEntryBalance();

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebit).toBe(0);
      expect(result.totalCredit).toBe(0);
    });
  });
});
