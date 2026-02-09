import { Repository } from 'typeorm';
import { IncentiveEngineService } from '../../services/incentive-engine.service';
import { IncentiveEligibilityService } from '../../services/incentive-eligibility.service';
import { CampaignEntity } from '../../entities/campaign.entity';
import { IncentiveApplicationEntity } from '../../entities/incentive-application.entity';
import { IncentiveType, CampaignStatus, FundingSource } from '../../dto/incentive.enums';
import { ChargeType } from '@api/modules/billing';

describe('IncentiveEngineService', () => {
  let service: IncentiveEngineService;
  let mockCampaignRepo: jest.Mocked<Repository<CampaignEntity>>;
  let mockApplicationRepo: jest.Mocked<Repository<IncentiveApplicationEntity>>;
  let mockEligibilityService: jest.Mocked<IncentiveEligibilityService>;

  const createCampaign = (overrides?: Partial<ReturnType<CampaignEntity['toDomain']>>): CampaignEntity => {
    const entity = CampaignEntity.fromDomain({
      campaignId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Campaign',
      incentiveType: IncentiveType.PERCENTAGE_DISCOUNT,
      status: CampaignStatus.ACTIVE,
      fundingSource: FundingSource.PLATFORM,
      discountValue: 20,
      budgetTotal: 1000,
      budgetUsed: 100,
      usageCount: 10,
      validFrom: new Date('2024-01-01T00:00:00.000Z'),
      validUntil: new Date('2024-12-31T23:59:59.000Z'),
      createdAt: new Date(),
      ...overrides,
    });
    entity.updatedAt = new Date();
    return entity;
  };

  beforeEach(() => {
    mockCampaignRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Repository<CampaignEntity>>;

    mockApplicationRepo = {
      find: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Repository<IncentiveApplicationEntity>>;

    mockEligibilityService = {
      evaluateEligibility: jest.fn(),
    } as unknown as jest.Mocked<IncentiveEligibilityService>;

    service = new IncentiveEngineService(
      mockCampaignRepo,
      mockApplicationRepo,
      mockEligibilityService,
    );
  });

  describe('calculateDiscountAmount', () => {
    it('should calculate percentage discount correctly', () => {
      const campaign = createCampaign({
        incentiveType: IncentiveType.PERCENTAGE_DISCOUNT,
        discountValue: 20,
      });

      const result = service.calculateDiscountAmount(campaign, 100);

      expect(result).toBe(20);
    });

    it('should calculate fixed discount correctly', () => {
      const campaign = createCampaign({
        incentiveType: IncentiveType.FIXED_DISCOUNT,
        discountValue: 15,
      });

      const result = service.calculateDiscountAmount(campaign, 100);

      expect(result).toBe(15);
    });

    it('should calculate free delivery correctly', () => {
      const campaign = createCampaign({
        incentiveType: IncentiveType.FREE_DELIVERY,
        discountValue: 0,
      });

      const result = service.calculateDiscountAmount(campaign, 25);

      expect(result).toBe(25);
    });

    it('should cap discount at maxDiscountAmount', () => {
      const campaign = createCampaign({
        incentiveType: IncentiveType.PERCENTAGE_DISCOUNT,
        discountValue: 50,
        maxDiscountAmount: 25,
      });

      const result = service.calculateDiscountAmount(campaign, 100);

      expect(result).toBe(25);
    });

    it('should cap discount at remaining budget', () => {
      const campaign = createCampaign({
        incentiveType: IncentiveType.FIXED_DISCOUNT,
        discountValue: 100,
        budgetTotal: 1000,
        budgetUsed: 950,
      });

      const result = service.calculateDiscountAmount(campaign, 100);

      expect(result).toBe(50);
    });
  });

  describe('createIncentiveCharge', () => {
    it('should create negative charge for discount', () => {
      const campaign = createCampaign();
      const applicationId = 'app-123';
      const discountAmount = 20;

      const result = service.createIncentiveCharge(campaign, applicationId, discountAmount, 'USD');

      expect(result.chargeType).toBe(ChargeType.DISCOUNT);
      expect(result.amount).toBe(-20);
      expect(result.unitPrice).toBe(-20);
      expect(result.metadata.campaignId).toBe(campaign.id);
      expect(result.metadata.applicationId).toBe(applicationId);
    });
  });

  describe('applyToInvoice', () => {
    it('should create application and track budget', async () => {
      const campaign = createCampaign();
      mockCampaignRepo.findOne.mockResolvedValue(campaign);

      const result = await service.applyToInvoice(
        campaign.id,
        'invoice-123',
        'charge-123',
        'beneficiary-123',
        20,
        'USD',
      );

      expect(result.applicationId).toBeDefined();
      expect(result.campaignId).toBe(campaign.id);
      expect(result.discountAmount).toBe(20);
      expect(mockApplicationRepo.save).toHaveBeenCalled();
      expect(mockCampaignRepo.update).toHaveBeenCalled();
    });

    it('should throw error when campaign not found', async () => {
      mockCampaignRepo.findOne.mockResolvedValue(null);

      await expect(
        service.applyToInvoice('invalid-id', 'invoice-123', 'charge-123', 'beneficiary-123', 20, 'USD'),
      ).rejects.toThrow('Campaign not found');
    });
  });

  describe('trackBudgetBurn', () => {
    it('should update budget and usage count', async () => {
      const campaign = createCampaign({ budgetUsed: 100, usageCount: 10 });
      mockCampaignRepo.findOne.mockResolvedValue(campaign);

      await service.trackBudgetBurn(campaign.id, 50);

      expect(mockCampaignRepo.update).toHaveBeenCalledWith(
        campaign.id,
        expect.objectContaining({
          budgetUsed: '150.00',
          usageCount: 11,
        }),
      );
    });

    it('should set status to EXHAUSTED when budget depleted', async () => {
      const campaign = createCampaign({ budgetTotal: 1000, budgetUsed: 980, usageCount: 99 });
      mockCampaignRepo.findOne.mockResolvedValue(campaign);

      const result = await service.trackBudgetBurn(campaign.id, 25);

      expect(result).toBe(true);
      expect(mockCampaignRepo.update).toHaveBeenCalledWith(
        campaign.id,
        expect.objectContaining({
          status: CampaignStatus.EXHAUSTED,
        }),
      );
    });

    it('should set status to EXHAUSTED when usage limit reached', async () => {
      const campaign = createCampaign({
        budgetTotal: 10000,
        budgetUsed: 100,
        usageLimit: 10,
        usageCount: 9,
      });
      mockCampaignRepo.findOne.mockResolvedValue(campaign);

      const result = await service.trackBudgetBurn(campaign.id, 10);

      expect(result).toBe(true);
      expect(mockCampaignRepo.update).toHaveBeenCalledWith(
        campaign.id,
        expect.objectContaining({
          status: CampaignStatus.EXHAUSTED,
        }),
      );
    });
  });

  describe('findApplicableIncentives', () => {
    it('should return eligible campaigns with discount amounts', async () => {
      const campaign1 = createCampaign({
        campaignId: 'camp-1',
        discountValue: 20,
      });
      const campaign2 = createCampaign({
        campaignId: 'camp-2',
        discountValue: 10,
      });

      mockCampaignRepo.find.mockResolvedValue([campaign1, campaign2]);
      mockEligibilityService.evaluateEligibility
        .mockReturnValueOnce({ eligible: true, campaign: campaign1 })
        .mockReturnValueOnce({ eligible: true, campaign: campaign2 });

      const result = await service.findApplicableIncentives({
        accountId: 'account-123',
        timestamp: new Date('2024-06-15T12:00:00.000Z'),
        orderAmount: 100,
      });

      expect(result).toHaveLength(2);
      expect(result[0].discountAmount).toBe(20);
      expect(result[1].discountAmount).toBe(10);
    });

    it('should filter out ineligible campaigns', async () => {
      const campaign = createCampaign();
      mockCampaignRepo.find.mockResolvedValue([campaign]);
      mockEligibilityService.evaluateEligibility.mockReturnValue({
        eligible: false,
        reason: 'Not eligible',
      });

      const result = await service.findApplicableIncentives({
        accountId: 'account-123',
        timestamp: new Date('2024-06-15T12:00:00.000Z'),
      });

      expect(result).toHaveLength(0);
    });
  });
});
