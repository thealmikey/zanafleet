import { SettlementItemEntity } from '../../entities/settlement-item.entity';

describe('SettlementItemEntity', () => {
  const domainData = {
    itemId: '550e8400-e29b-41d4-a716-446655440000',
    batchId: '660e8400-e29b-41d4-a716-446655440001',
    deliveryId: '770e8400-e29b-41d4-a716-446655440002',
    earningAmount: 100.0,
    commissionAmount: 15.0,
    netAmount: 85.0,
    ledgerEntryId: '880e8400-e29b-41d4-a716-446655440003',
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
  };

  describe('fromDomain', () => {
    it('should create entity with correct field mappings', () => {
      const entity = SettlementItemEntity.fromDomain(domainData);

      expect(entity.id).toBe(domainData.itemId);
      expect(entity.batchId).toBe(domainData.batchId);
      expect(entity.deliveryId).toBe(domainData.deliveryId);
      expect(entity.earningAmount).toBe('100.00');
      expect(entity.commissionAmount).toBe('15.00');
      expect(entity.netAmount).toBe('85.00');
      expect(entity.ledgerEntryId).toBe(domainData.ledgerEntryId);
      expect(entity.createdAt).toBe(domainData.createdAt);
    });

    it('should handle null ledgerEntryId', () => {
      const dataWithoutLedger = {
        ...domainData,
        ledgerEntryId: undefined,
      };

      const entity = SettlementItemEntity.fromDomain(dataWithoutLedger);

      expect(entity.ledgerEntryId).toBeNull();
    });

    it('should format decimal amounts with 2 decimal places', () => {
      const dataWithDecimals = {
        ...domainData,
        earningAmount: 99.999,
        commissionAmount: 14.999,
        netAmount: 85.0,
      };

      const entity = SettlementItemEntity.fromDomain(dataWithDecimals);

      expect(entity.earningAmount).toBe('100.00');
      expect(entity.commissionAmount).toBe('15.00');
    });
  });

  describe('toDomain', () => {
    it('should return domain object with correct field mappings', () => {
      const entity = new SettlementItemEntity();
      entity.id = domainData.itemId;
      entity.batchId = domainData.batchId;
      entity.deliveryId = domainData.deliveryId;
      entity.earningAmount = '100.00';
      entity.commissionAmount = '15.00';
      entity.netAmount = '85.00';
      entity.ledgerEntryId = domainData.ledgerEntryId;
      entity.createdAt = domainData.createdAt;

      const domain = entity.toDomain();

      expect(domain.itemId).toBe(domainData.itemId);
      expect(domain.batchId).toBe(domainData.batchId);
      expect(domain.deliveryId).toBe(domainData.deliveryId);
      expect(domain.earningAmount).toBe(100.0);
      expect(domain.commissionAmount).toBe(15.0);
      expect(domain.netAmount).toBe(85.0);
      expect(domain.ledgerEntryId).toBe(domainData.ledgerEntryId);
    });
  });

  describe('round-trip', () => {
    it('should preserve data when converting fromDomain then toDomain', () => {
      const entity = SettlementItemEntity.fromDomain(domainData);
      const domain = entity.toDomain();

      expect(domain.itemId).toBe(domainData.itemId);
      expect(domain.earningAmount).toBe(domainData.earningAmount);
      expect(domain.commissionAmount).toBe(domainData.commissionAmount);
      expect(domain.netAmount).toBe(domainData.netAmount);
    });
  });
});
