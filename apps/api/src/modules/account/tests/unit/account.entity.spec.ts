import { AccountType, AccountStatus } from '../../dto/account.enums';
import { AccountEntity } from '../../entities/account.entity';

describe('AccountEntity', () => {
  const domainData = {
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    externalId: '660e8400-e29b-41d4-a716-446655440001',
    accountType: AccountType.BUSINESS,
    status: AccountStatus.ACTIVE,
    currency: 'USD',
    metadata: { industry: 'logistics' },
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
  };

  describe('fromDomain', () => {
    it('should create entity with correct field mappings', () => {
      const entity = AccountEntity.fromDomain(domainData);

      expect(entity.id).toBe(domainData.accountId);
      expect(entity.externalId).toBe(domainData.externalId);
      expect(entity.accountType).toBe(domainData.accountType);
      expect(entity.status).toBe(domainData.status);
      expect(entity.currency).toBe(domainData.currency);
      expect(entity.metadata).toEqual(domainData.metadata);
      expect(entity.createdAt).toBe(domainData.createdAt);
    });

    it('should handle null metadata', () => {
      const dataWithoutMetadata = {
        ...domainData,
        metadata: undefined,
      };

      const entity = AccountEntity.fromDomain(dataWithoutMetadata);

      expect(entity.metadata).toBeNull();
    });

    it('should handle explicit null metadata', () => {
      const dataWithNullMetadata = {
        ...domainData,
        metadata: null,
      };

      const entity = AccountEntity.fromDomain(dataWithNullMetadata);

      expect(entity.metadata).toBeNull();
    });
  });

  describe('toDomain', () => {
    it('should return domain object with correct field mappings', () => {
      const entity = new AccountEntity();
      entity.id = domainData.accountId;
      entity.externalId = domainData.externalId;
      entity.accountType = domainData.accountType;
      entity.status = domainData.status;
      entity.currency = domainData.currency;
      entity.metadata = domainData.metadata;
      entity.createdAt = domainData.createdAt;
      entity.updatedAt = new Date('2024-01-15T12:00:00.000Z');

      const domain = entity.toDomain();

      expect(domain.accountId).toBe(domainData.accountId);
      expect(domain.externalId).toBe(domainData.externalId);
      expect(domain.accountType).toBe(domainData.accountType);
      expect(domain.status).toBe(domainData.status);
      expect(domain.currency).toBe(domainData.currency);
      expect(domain.metadata).toEqual(domainData.metadata);
      expect(domain.createdAt).toBe(domainData.createdAt);
      expect(domain.updatedAt).toEqual(new Date('2024-01-15T12:00:00.000Z'));
    });
  });

  describe('round-trip', () => {
    it('should preserve data when converting fromDomain then toDomain', () => {
      const entity = AccountEntity.fromDomain(domainData);
      entity.updatedAt = domainData.createdAt;

      const domain = entity.toDomain();

      expect(domain.accountId).toBe(domainData.accountId);
      expect(domain.externalId).toBe(domainData.externalId);
      expect(domain.accountType).toBe(domainData.accountType);
      expect(domain.status).toBe(domainData.status);
      expect(domain.currency).toBe(domainData.currency);
      expect(domain.metadata).toEqual(domainData.metadata);
      expect(domain.createdAt).toEqual(domainData.createdAt);
    });
  });
});
