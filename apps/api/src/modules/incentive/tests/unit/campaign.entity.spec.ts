import { CampaignEntity } from '../../entities/campaign.entity';
import { IncentiveType, CampaignStatus, FundingSource } from '../../dto/incentive.enums';

describe('CampaignEntity', () => {
  const domainData = {
    campaignId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Summer Sale',
    description: '20% off all deliveries',
    incentiveType: IncentiveType.PERCENTAGE_DISCOUNT,
    status: CampaignStatus.ACTIVE,
    fundingSource: FundingSource.PLATFORM,
    sponsorAccountId: null,
    discountValue: 20,
    maxDiscountAmount: 50,
    budgetTotal: 10000,
    budgetUsed: 1500,
    usageLimit: 500,
    usageCount: 75,
    eligibilityRules: { minOrderAmount: 10 },
    validFrom: new Date('2024-06-01T00:00:00.000Z'),
    validUntil: new Date('2024-08-31T23:59:59.000Z'),
    metadata: { source: 'marketing' },
    createdAt: new Date('2024-05-15T10:00:00.000Z'),
  };

  describe('fromDomain', () => {
    it('should create entity with correct field mappings', () => {
      const entity = CampaignEntity.fromDomain(domainData);

      expect(entity.id).toBe(domainData.campaignId);
      expect(entity.name).toBe(domainData.name);
      expect(entity.description).toBe(domainData.description);
      expect(entity.incentiveType).toBe(domainData.incentiveType);
      expect(entity.status).toBe(domainData.status);
      expect(entity.fundingSource).toBe(domainData.fundingSource);
      expect(entity.sponsorAccountId).toBeNull();
      expect(entity.discountValue).toBe('20.00');
      expect(entity.maxDiscountAmount).toBe('50.00');
      expect(entity.budgetTotal).toBe('10000.00');
      expect(entity.budgetUsed).toBe('1500.00');
      expect(entity.usageLimit).toBe(500);
      expect(entity.usageCount).toBe(75);
      expect(entity.eligibilityRules).toEqual(domainData.eligibilityRules);
      expect(entity.validFrom).toBe(domainData.validFrom);
      expect(entity.validUntil).toBe(domainData.validUntil);
    });

    it('should handle sponsor-funded campaign', () => {
      const sponsoredData = {
        ...domainData,
        fundingSource: FundingSource.BUSINESS_SPONSOR,
        sponsorAccountId: '660e8400-e29b-41d4-a716-446655440001',
      };

      const entity = CampaignEntity.fromDomain(sponsoredData);

      expect(entity.fundingSource).toBe(FundingSource.BUSINESS_SPONSOR);
      expect(entity.sponsorAccountId).toBe(sponsoredData.sponsorAccountId);
    });

    it('should handle null optional fields', () => {
      const minimalData = {
        campaignId: domainData.campaignId,
        name: domainData.name,
        incentiveType: domainData.incentiveType,
        status: domainData.status,
        fundingSource: domainData.fundingSource,
        discountValue: 10,
        budgetTotal: 1000,
        validFrom: domainData.validFrom,
        validUntil: domainData.validUntil,
        createdAt: domainData.createdAt,
      };

      const entity = CampaignEntity.fromDomain(minimalData);

      expect(entity.description).toBeNull();
      expect(entity.maxDiscountAmount).toBeNull();
      expect(entity.usageLimit).toBeNull();
      expect(entity.eligibilityRules).toBeNull();
      expect(entity.metadata).toBeNull();
    });
  });

  describe('toDomain', () => {
    it('should return domain object with correct field mappings', () => {
      const entity = new CampaignEntity();
      entity.id = domainData.campaignId;
      entity.name = domainData.name;
      entity.description = domainData.description;
      entity.incentiveType = domainData.incentiveType;
      entity.status = domainData.status;
      entity.fundingSource = domainData.fundingSource;
      entity.sponsorAccountId = null;
      entity.discountValue = '20.00';
      entity.maxDiscountAmount = '50.00';
      entity.budgetTotal = '10000.00';
      entity.budgetUsed = '1500.00';
      entity.usageLimit = 500;
      entity.usageCount = 75;
      entity.eligibilityRules = domainData.eligibilityRules;
      entity.validFrom = domainData.validFrom;
      entity.validUntil = domainData.validUntil;
      entity.metadata = domainData.metadata;
      entity.createdAt = domainData.createdAt;
      entity.updatedAt = new Date('2024-05-20T10:00:00.000Z');

      const domain = entity.toDomain();

      expect(domain.campaignId).toBe(domainData.campaignId);
      expect(domain.name).toBe(domainData.name);
      expect(domain.discountValue).toBe(20);
      expect(domain.maxDiscountAmount).toBe(50);
      expect(domain.budgetTotal).toBe(10000);
      expect(domain.budgetUsed).toBe(1500);
    });
  });

  describe('round-trip', () => {
    it('should preserve data when converting fromDomain then toDomain', () => {
      const entity = CampaignEntity.fromDomain(domainData);
      entity.updatedAt = domainData.createdAt;

      const domain = entity.toDomain();

      expect(domain.campaignId).toBe(domainData.campaignId);
      expect(domain.name).toBe(domainData.name);
      expect(domain.discountValue).toBe(domainData.discountValue);
      expect(domain.budgetTotal).toBe(domainData.budgetTotal);
      expect(domain.budgetUsed).toBe(domainData.budgetUsed);
    });
  });
});
