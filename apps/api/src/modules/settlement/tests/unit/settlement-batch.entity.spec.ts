import { SettlementStatus, PayoutMethod } from '../../dto/settlement.enums';
import { SettlementBatchEntity } from '../../entities/settlement-batch.entity';

describe('SettlementBatchEntity', () => {
  const domainData = {
    batchId: '550e8400-e29b-41d4-a716-446655440000',
    riderAccountId: '660e8400-e29b-41d4-a716-446655440001',
    status: SettlementStatus.PENDING,
    totalEarnings: 1000.0,
    platformCommission: 150.0,
    netPayout: 850.0,
    currency: 'KES',
    payoutMethod: PayoutMethod.MOBILE_MONEY,
    payoutReference: null,
    periodStart: new Date('2024-01-08T00:00:00.000Z'),
    periodEnd: new Date('2024-01-15T00:00:00.000Z'),
    itemCount: 15,
    processedAt: null,
    failureReason: null,
    metadata: { commissionRate: 0.15 },
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
  };

  describe('fromDomain', () => {
    it('should create entity with correct field mappings', () => {
      const entity = SettlementBatchEntity.fromDomain(domainData);

      expect(entity.id).toBe(domainData.batchId);
      expect(entity.riderAccountId).toBe(domainData.riderAccountId);
      expect(entity.status).toBe(domainData.status);
      expect(entity.totalEarnings).toBe('1000.00');
      expect(entity.platformCommission).toBe('150.00');
      expect(entity.netPayout).toBe('850.00');
      expect(entity.currency).toBe(domainData.currency);
      expect(entity.payoutMethod).toBe(domainData.payoutMethod);
      expect(entity.payoutReference).toBeNull();
      expect(entity.periodStart).toBe(domainData.periodStart);
      expect(entity.periodEnd).toBe(domainData.periodEnd);
      expect(entity.itemCount).toBe(domainData.itemCount);
      expect(entity.processedAt).toBeNull();
      expect(entity.failureReason).toBeNull();
      expect(entity.metadata).toEqual(domainData.metadata);
    });

    it('should handle completed batch with payout reference', () => {
      const completedData = {
        ...domainData,
        status: SettlementStatus.COMPLETED,
        payoutReference: 'mpesa_ref_123',
        processedAt: new Date('2024-01-15T12:00:00.000Z'),
      };

      const entity = SettlementBatchEntity.fromDomain(completedData);

      expect(entity.status).toBe(SettlementStatus.COMPLETED);
      expect(entity.payoutReference).toBe('mpesa_ref_123');
      expect(entity.processedAt).toBe(completedData.processedAt);
    });

    it('should handle failed batch with failure reason', () => {
      const failedData = {
        ...domainData,
        status: SettlementStatus.FAILED,
        failureReason: 'Insufficient funds in disbursement account',
      };

      const entity = SettlementBatchEntity.fromDomain(failedData);

      expect(entity.status).toBe(SettlementStatus.FAILED);
      expect(entity.failureReason).toBe('Insufficient funds in disbursement account');
    });
  });

  describe('toDomain', () => {
    it('should return domain object with correct field mappings', () => {
      const entity = new SettlementBatchEntity();
      entity.id = domainData.batchId;
      entity.riderAccountId = domainData.riderAccountId;
      entity.status = domainData.status;
      entity.totalEarnings = '1000.00';
      entity.platformCommission = '150.00';
      entity.netPayout = '850.00';
      entity.currency = domainData.currency;
      entity.payoutMethod = domainData.payoutMethod;
      entity.payoutReference = null;
      entity.periodStart = domainData.periodStart;
      entity.periodEnd = domainData.periodEnd;
      entity.itemCount = domainData.itemCount;
      entity.processedAt = null;
      entity.failureReason = null;
      entity.metadata = domainData.metadata;
      entity.createdAt = domainData.createdAt;
      entity.updatedAt = new Date('2024-01-15T12:00:00.000Z');

      const domain = entity.toDomain();

      expect(domain.batchId).toBe(domainData.batchId);
      expect(domain.riderAccountId).toBe(domainData.riderAccountId);
      expect(domain.status).toBe(domainData.status);
      expect(domain.totalEarnings).toBe(1000.0);
      expect(domain.platformCommission).toBe(150.0);
      expect(domain.netPayout).toBe(850.0);
      expect(domain.currency).toBe(domainData.currency);
      expect(domain.payoutMethod).toBe(domainData.payoutMethod);
      expect(domain.itemCount).toBe(domainData.itemCount);
    });
  });

  describe('round-trip', () => {
    it('should preserve data when converting fromDomain then toDomain', () => {
      const entity = SettlementBatchEntity.fromDomain(domainData);
      entity.updatedAt = domainData.createdAt;

      const domain = entity.toDomain();

      expect(domain.batchId).toBe(domainData.batchId);
      expect(domain.totalEarnings).toBe(domainData.totalEarnings);
      expect(domain.platformCommission).toBe(domainData.platformCommission);
      expect(domain.netPayout).toBe(domainData.netPayout);
    });
  });
});
