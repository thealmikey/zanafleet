import { ChargeEntity } from '../../entities/charge.entity';
import { ChargeType } from '../../dto/billing.enums';

describe('ChargeEntity', () => {
  const domainData = {
    chargeId: '550e8400-e29b-41d4-a716-446655440000',
    invoiceId: '660e8400-e29b-41d4-a716-446655440001',
    chargeType: ChargeType.BASE_DELIVERY_FEE,
    description: 'Base delivery fee',
    amount: 5.0,
    currency: 'USD',
    quantity: 1,
    unitPrice: 5.0,
    metadata: { source: 'calculator' },
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
  };

  describe('fromDomain', () => {
    it('should create entity with correct field mappings', () => {
      const entity = ChargeEntity.fromDomain(domainData);

      expect(entity.id).toBe(domainData.chargeId);
      expect(entity.invoiceId).toBe(domainData.invoiceId);
      expect(entity.chargeType).toBe(domainData.chargeType);
      expect(entity.description).toBe(domainData.description);
      expect(entity.amount).toBe('5.00');
      expect(entity.currency).toBe(domainData.currency);
      expect(entity.quantity).toBe('1.0000');
      expect(entity.unitPrice).toBe('5.00');
      expect(entity.metadata).toEqual(domainData.metadata);
      expect(entity.createdAt).toBe(domainData.createdAt);
    });

    it('should handle null description', () => {
      const dataWithoutDescription = {
        ...domainData,
        description: undefined,
      };

      const entity = ChargeEntity.fromDomain(dataWithoutDescription);

      expect(entity.description).toBeNull();
    });

    it('should handle null metadata', () => {
      const dataWithoutMetadata = {
        ...domainData,
        metadata: undefined,
      };

      const entity = ChargeEntity.fromDomain(dataWithoutMetadata);

      expect(entity.metadata).toBeNull();
    });

    it('should default quantity to 1', () => {
      const dataWithoutQuantity = {
        ...domainData,
        quantity: undefined,
      };

      const entity = ChargeEntity.fromDomain(dataWithoutQuantity);

      expect(entity.quantity).toBe('1.0000');
    });

    it('should handle negative amounts for discounts', () => {
      const discountData = {
        ...domainData,
        chargeType: ChargeType.DISCOUNT,
        amount: -10.5,
        unitPrice: -10.5,
      };

      const entity = ChargeEntity.fromDomain(discountData);

      expect(entity.amount).toBe('-10.50');
    });
  });

  describe('toDomain', () => {
    it('should return domain object with correct field mappings', () => {
      const entity = new ChargeEntity();
      entity.id = domainData.chargeId;
      entity.invoiceId = domainData.invoiceId;
      entity.chargeType = domainData.chargeType;
      entity.description = domainData.description;
      entity.amount = '5.00';
      entity.currency = domainData.currency;
      entity.quantity = '1.0000';
      entity.unitPrice = '5.00';
      entity.metadata = domainData.metadata;
      entity.createdAt = domainData.createdAt;

      const domain = entity.toDomain();

      expect(domain.chargeId).toBe(domainData.chargeId);
      expect(domain.invoiceId).toBe(domainData.invoiceId);
      expect(domain.chargeType).toBe(domainData.chargeType);
      expect(domain.description).toBe(domainData.description);
      expect(domain.amount).toBe(5.0);
      expect(domain.currency).toBe(domainData.currency);
      expect(domain.quantity).toBe(1.0);
      expect(domain.unitPrice).toBe(5.0);
      expect(domain.metadata).toEqual(domainData.metadata);
    });
  });

  describe('round-trip', () => {
    it('should preserve data when converting fromDomain then toDomain', () => {
      const entity = ChargeEntity.fromDomain(domainData);
      const domain = entity.toDomain();

      expect(domain.chargeId).toBe(domainData.chargeId);
      expect(domain.invoiceId).toBe(domainData.invoiceId);
      expect(domain.chargeType).toBe(domainData.chargeType);
      expect(domain.amount).toBe(domainData.amount);
      expect(domain.quantity).toBe(domainData.quantity);
      expect(domain.unitPrice).toBe(domainData.unitPrice);
    });
  });
});
