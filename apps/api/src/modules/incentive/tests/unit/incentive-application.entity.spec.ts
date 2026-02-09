import { IncentiveApplicationEntity } from '../../entities/incentive-application.entity';

describe('IncentiveApplicationEntity', () => {
  const domainData = {
    applicationId: '550e8400-e29b-41d4-a716-446655440000',
    campaignId: '660e8400-e29b-41d4-a716-446655440001',
    invoiceId: '770e8400-e29b-41d4-a716-446655440002',
    chargeId: '880e8400-e29b-41d4-a716-446655440003',
    beneficiaryAccountId: '990e8400-e29b-41d4-a716-446655440004',
    discountAmount: 15.5,
    currency: 'USD',
    appliedAt: new Date('2024-01-15T10:00:00.000Z'),
  };

  describe('fromDomain', () => {
    it('should create entity with correct field mappings', () => {
      const entity = IncentiveApplicationEntity.fromDomain(domainData);

      expect(entity.id).toBe(domainData.applicationId);
      expect(entity.campaignId).toBe(domainData.campaignId);
      expect(entity.invoiceId).toBe(domainData.invoiceId);
      expect(entity.chargeId).toBe(domainData.chargeId);
      expect(entity.beneficiaryAccountId).toBe(domainData.beneficiaryAccountId);
      expect(entity.discountAmount).toBe('15.50');
      expect(entity.currency).toBe(domainData.currency);
      expect(entity.appliedAt).toBe(domainData.appliedAt);
    });

    it('should format decimal amounts with 2 decimal places', () => {
      const dataWithWholeNumber = {
        ...domainData,
        discountAmount: 25,
      };

      const entity = IncentiveApplicationEntity.fromDomain(dataWithWholeNumber);

      expect(entity.discountAmount).toBe('25.00');
    });
  });

  describe('toDomain', () => {
    it('should return domain object with correct field mappings', () => {
      const entity = new IncentiveApplicationEntity();
      entity.id = domainData.applicationId;
      entity.campaignId = domainData.campaignId;
      entity.invoiceId = domainData.invoiceId;
      entity.chargeId = domainData.chargeId;
      entity.beneficiaryAccountId = domainData.beneficiaryAccountId;
      entity.discountAmount = '15.50';
      entity.currency = domainData.currency;
      entity.appliedAt = domainData.appliedAt;

      const domain = entity.toDomain();

      expect(domain.applicationId).toBe(domainData.applicationId);
      expect(domain.campaignId).toBe(domainData.campaignId);
      expect(domain.invoiceId).toBe(domainData.invoiceId);
      expect(domain.chargeId).toBe(domainData.chargeId);
      expect(domain.beneficiaryAccountId).toBe(domainData.beneficiaryAccountId);
      expect(domain.discountAmount).toBe(15.5);
      expect(domain.currency).toBe(domainData.currency);
    });
  });

  describe('round-trip', () => {
    it('should preserve data when converting fromDomain then toDomain', () => {
      const entity = IncentiveApplicationEntity.fromDomain(domainData);
      const domain = entity.toDomain();

      expect(domain.applicationId).toBe(domainData.applicationId);
      expect(domain.discountAmount).toBe(domainData.discountAmount);
      expect(domain.campaignId).toBe(domainData.campaignId);
    });
  });
});
