import { IncentiveType, CampaignStatus, FundingSource } from '../../dto/incentive.enums';

describe('IncentiveEnums', () => {
  describe('IncentiveType', () => {
    it('should have all expected types', () => {
      expect(IncentiveType.PERCENTAGE_DISCOUNT).toBe('PERCENTAGE_DISCOUNT');
      expect(IncentiveType.FIXED_DISCOUNT).toBe('FIXED_DISCOUNT');
      expect(IncentiveType.FREE_DELIVERY).toBe('FREE_DELIVERY');
      expect(IncentiveType.RIDER_BONUS).toBe('RIDER_BONUS');
      expect(IncentiveType.REFERRAL_REWARD).toBe('REFERRAL_REWARD');
    });

    it('should have exactly 5 types', () => {
      const values = Object.values(IncentiveType);
      expect(values).toHaveLength(5);
    });
  });

  describe('CampaignStatus', () => {
    it('should have all expected statuses', () => {
      expect(CampaignStatus.DRAFT).toBe('DRAFT');
      expect(CampaignStatus.ACTIVE).toBe('ACTIVE');
      expect(CampaignStatus.PAUSED).toBe('PAUSED');
      expect(CampaignStatus.EXHAUSTED).toBe('EXHAUSTED');
      expect(CampaignStatus.EXPIRED).toBe('EXPIRED');
    });

    it('should have exactly 5 statuses', () => {
      const values = Object.values(CampaignStatus);
      expect(values).toHaveLength(5);
    });
  });

  describe('FundingSource', () => {
    it('should have all expected sources', () => {
      expect(FundingSource.PLATFORM).toBe('PLATFORM');
      expect(FundingSource.BUSINESS_SPONSOR).toBe('BUSINESS_SPONSOR');
      expect(FundingSource.EXTERNAL_SPONSOR).toBe('EXTERNAL_SPONSOR');
    });

    it('should have exactly 3 sources', () => {
      const values = Object.values(FundingSource);
      expect(values).toHaveLength(3);
    });
  });
});
