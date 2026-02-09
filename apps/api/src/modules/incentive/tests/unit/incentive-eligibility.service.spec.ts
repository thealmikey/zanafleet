import { IncentiveEligibilityService, EligibilityContext } from '../../services/incentive-eligibility.service';
import { CampaignEntity } from '../../entities/campaign.entity';
import { IncentiveType, CampaignStatus, FundingSource } from '../../dto/incentive.enums';

describe('IncentiveEligibilityService', () => {
  let service: IncentiveEligibilityService;

  const createCampaign = (overrides?: Partial<ReturnType<CampaignEntity['toDomain']>>): CampaignEntity => {
    return CampaignEntity.fromDomain({
      campaignId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Campaign',
      incentiveType: IncentiveType.PERCENTAGE_DISCOUNT,
      status: CampaignStatus.ACTIVE,
      fundingSource: FundingSource.PLATFORM,
      discountValue: 20,
      budgetTotal: 1000,
      budgetUsed: 100,
      usageLimit: 100,
      usageCount: 10,
      validFrom: new Date('2024-01-01T00:00:00.000Z'),
      validUntil: new Date('2024-12-31T23:59:59.000Z'),
      createdAt: new Date(),
      ...overrides,
    });
  };

  const createContext = (overrides?: Partial<EligibilityContext>): EligibilityContext => ({
    accountId: '660e8400-e29b-41d4-a716-446655440001',
    timestamp: new Date('2024-06-15T12:00:00.000Z'),
    ...overrides,
  });

  beforeEach(() => {
    service = new IncentiveEligibilityService();
  });

  describe('evaluateEligibility', () => {
    it('should return eligible for valid active campaign', () => {
      const campaign = createCampaign();
      const context = createContext();

      const result = service.evaluateEligibility(campaign, context);

      expect(result.eligible).toBe(true);
      expect(result.campaign).toBe(campaign);
    });

    it('should return ineligible for non-active campaign', () => {
      const campaign = createCampaign({ status: CampaignStatus.PAUSED });
      const context = createContext();

      const result = service.evaluateEligibility(campaign, context);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('not active');
    });

    it('should return ineligible when outside date range (before)', () => {
      const campaign = createCampaign();
      const context = createContext({
        timestamp: new Date('2023-12-01T00:00:00.000Z'),
      });

      const result = service.evaluateEligibility(campaign, context);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('outside valid date range');
    });

    it('should return ineligible when outside date range (after)', () => {
      const campaign = createCampaign();
      const context = createContext({
        timestamp: new Date('2025-01-01T00:00:00.000Z'),
      });

      const result = service.evaluateEligibility(campaign, context);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('outside valid date range');
    });

    it('should return ineligible when budget exhausted', () => {
      const campaign = createCampaign({ budgetUsed: 1000 });
      const context = createContext();

      const result = service.evaluateEligibility(campaign, context);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('budget is exhausted');
    });

    it('should return ineligible when usage limit reached', () => {
      const campaign = createCampaign({ usageCount: 100 });
      const context = createContext();

      const result = service.evaluateEligibility(campaign, context);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('usage limit reached');
    });
  });

  describe('eligibility rules evaluation', () => {
    it('should check minOrderAmount rule', () => {
      const campaign = createCampaign({
        eligibilityRules: { minOrderAmount: 50 },
      });

      const contextLowAmount = createContext({ orderAmount: 30 });
      const resultLow = service.evaluateEligibility(campaign, contextLowAmount);
      expect(resultLow.eligible).toBe(false);
      expect(resultLow.reason).toContain('below minimum');

      const contextHighAmount = createContext({ orderAmount: 75 });
      const resultHigh = service.evaluateEligibility(campaign, contextHighAmount);
      expect(resultHigh.eligible).toBe(true);
    });

    it('should check maxOrderAmount rule', () => {
      const campaign = createCampaign({
        eligibilityRules: { maxOrderAmount: 100 },
      });

      const contextHighAmount = createContext({ orderAmount: 150 });
      const result = service.evaluateEligibility(campaign, contextHighAmount);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('exceeds maximum');
    });

    it('should check firstOrderOnly rule', () => {
      const campaign = createCampaign({
        eligibilityRules: { firstOrderOnly: true },
      });

      const contextFirstOrder = createContext({ isFirstOrder: true });
      const resultFirst = service.evaluateEligibility(campaign, contextFirstOrder);
      expect(resultFirst.eligible).toBe(true);

      const contextNotFirst = createContext({ isFirstOrder: false });
      const resultNotFirst = service.evaluateEligibility(campaign, contextNotFirst);
      expect(resultNotFirst.eligible).toBe(false);
      expect(resultNotFirst.reason).toContain('first orders only');
    });

    it('should check requiredReferralCode rule', () => {
      const campaign = createCampaign({
        eligibilityRules: { requiredReferralCode: 'SUMMER2024' },
      });

      const contextValidCode = createContext({ referralCode: 'SUMMER2024' });
      const resultValid = service.evaluateEligibility(campaign, contextValidCode);
      expect(resultValid.eligible).toBe(true);

      const contextInvalidCode = createContext({ referralCode: 'WRONG' });
      const resultInvalid = service.evaluateEligibility(campaign, contextInvalidCode);
      expect(resultInvalid.eligible).toBe(false);
    });

    it('should check allowedBusinessIds rule', () => {
      const campaign = createCampaign({
        eligibilityRules: { allowedBusinessIds: ['business-1', 'business-2'] },
      });

      const contextAllowed = createContext({ businessId: 'business-1' });
      const resultAllowed = service.evaluateEligibility(campaign, contextAllowed);
      expect(resultAllowed.eligible).toBe(true);

      const contextNotAllowed = createContext({ businessId: 'business-3' });
      const resultNotAllowed = service.evaluateEligibility(campaign, contextNotAllowed);
      expect(resultNotAllowed.eligible).toBe(false);
    });

    it('should check excludedBusinessIds rule', () => {
      const campaign = createCampaign({
        eligibilityRules: { excludedBusinessIds: ['business-bad'] },
      });

      const contextExcluded = createContext({ businessId: 'business-bad' });
      const result = service.evaluateEligibility(campaign, contextExcluded);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('excluded');
    });

    it('should check dayOfWeek rule', () => {
      const campaign = createCampaign({
        eligibilityRules: { dayOfWeek: [1, 2, 3, 4, 5] },
      });

      const monday = new Date('2024-06-17T12:00:00.000Z');
      const contextWeekday = createContext({ timestamp: monday });
      const resultWeekday = service.evaluateEligibility(campaign, contextWeekday);
      expect(resultWeekday.eligible).toBe(true);

      const saturday = new Date('2024-06-15T12:00:00.000Z');
      const contextWeekend = createContext({ timestamp: saturday });
      const resultWeekend = service.evaluateEligibility(campaign, contextWeekend);
      expect(resultWeekend.eligible).toBe(false);
    });

    it('should check timeRange rule', () => {
      const campaign = createCampaign({
        eligibilityRules: { timeRange: { start: '09:00', end: '17:00' } },
      });

      const contextInRange = createContext({
        timestamp: new Date('2024-06-15T12:00:00.000Z'),
      });
      const resultInRange = service.evaluateEligibility(campaign, contextInRange);
      expect(resultInRange.eligible).toBe(true);

      const contextOutRange = createContext({
        timestamp: new Date('2024-06-15T20:00:00.000Z'),
      });
      const resultOutRange = service.evaluateEligibility(campaign, contextOutRange);
      expect(resultOutRange.eligible).toBe(false);
    });
  });
});
