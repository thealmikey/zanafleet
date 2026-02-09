import { LedgerEntryType, LedgerCategory, LedgerReferenceType } from '../../dto/ledger.enums';
import { LedgerEntryEntity } from '../../entities/ledger-entry.entity';

describe('LedgerEntryEntity', () => {
  const domainData = {
    ledgerEntryId: '550e8400-e29b-41d4-a716-446655440000',
    accountId: '660e8400-e29b-41d4-a716-446655440001',
    entryType: LedgerEntryType.CREDIT,
    category: LedgerCategory.RIDER_EARNING,
    amount: 150.5,
    currency: 'USD',
    balanceAfter: 1500.75,
    referenceType: LedgerReferenceType.PAYMENT,
    referenceId: '770e8400-e29b-41d4-a716-446655440002',
    description: 'Delivery payment',
    metadata: { deliveryId: 'del-123' },
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
  };

  describe('fromDomain', () => {
    it('should create entity with correct field mappings', () => {
      const entity = LedgerEntryEntity.fromDomain(domainData);

      expect(entity.id).toBe(domainData.ledgerEntryId);
      expect(entity.accountId).toBe(domainData.accountId);
      expect(entity.entryType).toBe(domainData.entryType);
      expect(entity.category).toBe(domainData.category);
      expect(entity.amount).toBe('150.50');
      expect(entity.currency).toBe(domainData.currency);
      expect(entity.balanceAfter).toBe('1500.75');
      expect(entity.referenceType).toBe(domainData.referenceType);
      expect(entity.referenceId).toBe(domainData.referenceId);
      expect(entity.description).toBe(domainData.description);
      expect(entity.metadata).toEqual(domainData.metadata);
      expect(entity.createdAt).toBe(domainData.createdAt);
    });

    it('should handle null description', () => {
      const dataWithoutDescription = {
        ...domainData,
        description: undefined,
      };

      const entity = LedgerEntryEntity.fromDomain(dataWithoutDescription);

      expect(entity.description).toBeNull();
    });

    it('should handle null metadata', () => {
      const dataWithoutMetadata = {
        ...domainData,
        metadata: undefined,
      };

      const entity = LedgerEntryEntity.fromDomain(dataWithoutMetadata);

      expect(entity.metadata).toBeNull();
    });

    it('should format decimal amounts with 2 decimal places', () => {
      const dataWithWholeNumber = {
        ...domainData,
        amount: 100,
        balanceAfter: 1000,
      };

      const entity = LedgerEntryEntity.fromDomain(dataWithWholeNumber);

      expect(entity.amount).toBe('100.00');
      expect(entity.balanceAfter).toBe('1000.00');
    });
  });

  describe('toDomain', () => {
    it('should return domain object with correct field mappings', () => {
      const entity = new LedgerEntryEntity();
      entity.id = domainData.ledgerEntryId;
      entity.accountId = domainData.accountId;
      entity.entryType = domainData.entryType;
      entity.category = domainData.category;
      entity.amount = '150.50';
      entity.currency = domainData.currency;
      entity.balanceAfter = '1500.75';
      entity.referenceType = domainData.referenceType;
      entity.referenceId = domainData.referenceId;
      entity.description = domainData.description;
      entity.metadata = domainData.metadata;
      entity.createdAt = domainData.createdAt;

      const domain = entity.toDomain();

      expect(domain.ledgerEntryId).toBe(domainData.ledgerEntryId);
      expect(domain.accountId).toBe(domainData.accountId);
      expect(domain.entryType).toBe(domainData.entryType);
      expect(domain.category).toBe(domainData.category);
      expect(domain.amount).toBe(150.5);
      expect(domain.currency).toBe(domainData.currency);
      expect(domain.balanceAfter).toBe(1500.75);
      expect(domain.referenceType).toBe(domainData.referenceType);
      expect(domain.referenceId).toBe(domainData.referenceId);
      expect(domain.description).toBe(domainData.description);
      expect(domain.metadata).toEqual(domainData.metadata);
      expect(domain.createdAt).toBe(domainData.createdAt);
    });

    it('should parse string decimals to numbers', () => {
      const entity = new LedgerEntryEntity();
      entity.id = domainData.ledgerEntryId;
      entity.accountId = domainData.accountId;
      entity.entryType = domainData.entryType;
      entity.category = domainData.category;
      entity.amount = '99.99';
      entity.currency = 'USD';
      entity.balanceAfter = '999.99';
      entity.referenceType = domainData.referenceType;
      entity.referenceId = domainData.referenceId;
      entity.description = null;
      entity.metadata = null;
      entity.createdAt = domainData.createdAt;

      const domain = entity.toDomain();

      expect(domain.amount).toBe(99.99);
      expect(domain.balanceAfter).toBe(999.99);
    });
  });

  describe('round-trip', () => {
    it('should preserve data when converting fromDomain then toDomain', () => {
      const entity = LedgerEntryEntity.fromDomain(domainData);
      const domain = entity.toDomain();

      expect(domain.ledgerEntryId).toBe(domainData.ledgerEntryId);
      expect(domain.accountId).toBe(domainData.accountId);
      expect(domain.entryType).toBe(domainData.entryType);
      expect(domain.category).toBe(domainData.category);
      expect(domain.amount).toBe(domainData.amount);
      expect(domain.currency).toBe(domainData.currency);
      expect(domain.balanceAfter).toBe(domainData.balanceAfter);
      expect(domain.referenceType).toBe(domainData.referenceType);
      expect(domain.referenceId).toBe(domainData.referenceId);
      expect(domain.description).toBe(domainData.description);
      expect(domain.metadata).toEqual(domainData.metadata);
    });
  });
});
