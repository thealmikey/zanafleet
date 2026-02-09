import { ZodError } from 'zod';

import { CreateCampaignCommand } from '../../commands/create-campaign.command';
import { IncentiveType, FundingSource } from '../../dto/incentive.enums';

describe('CreateCampaignCommand', () => {
  const validInput = {
    name: 'Summer Sale',
    description: '20% off all deliveries',
    incentiveType: IncentiveType.PERCENTAGE_DISCOUNT,
    fundingSource: FundingSource.PLATFORM,
    discountValue: 20,
    maxDiscountAmount: 50,
    budgetTotal: 10000,
    usageLimit: 500,
    eligibilityRules: { minOrderAmount: 10 },
    validFrom: new Date('2024-06-01T00:00:00.000Z'),
    validUntil: new Date('2024-08-31T23:59:59.000Z'),
    metadata: { source: 'marketing' },
  };

  describe('validate', () => {
    it('should pass validation with valid input', () => {
      const result = CreateCampaignCommand.validate(validInput);

      expect(result.name).toBe(validInput.name);
      expect(result.incentiveType).toBe(validInput.incentiveType);
    });

    it('should pass validation without optional fields', () => {
      const minimalInput = {
        name: 'Basic Campaign',
        incentiveType: IncentiveType.FIXED_DISCOUNT,
        fundingSource: FundingSource.PLATFORM,
        discountValue: 5,
        budgetTotal: 1000,
        validFrom: new Date('2024-06-01T00:00:00.000Z'),
        validUntil: new Date('2024-06-30T23:59:59.000Z'),
      };

      const result = CreateCampaignCommand.validate(minimalInput);

      expect(result.description).toBeUndefined();
      expect(result.maxDiscountAmount).toBeUndefined();
      expect(result.usageLimit).toBeUndefined();
    });

    it('should throw ZodError when validUntil is before validFrom', () => {
      const invalidInput = {
        ...validInput,
        validFrom: new Date('2024-08-01T00:00:00.000Z'),
        validUntil: new Date('2024-06-01T00:00:00.000Z'),
      };

      expect(() => CreateCampaignCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when sponsor funding source without sponsorAccountId', () => {
      const invalidInput = {
        ...validInput,
        fundingSource: FundingSource.BUSINESS_SPONSOR,
      };

      expect(() => CreateCampaignCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should pass validation with sponsor funding and sponsorAccountId', () => {
      const sponsoredInput = {
        ...validInput,
        fundingSource: FundingSource.BUSINESS_SPONSOR,
        sponsorAccountId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = CreateCampaignCommand.validate(sponsoredInput);

      expect(result.fundingSource).toBe(FundingSource.BUSINESS_SPONSOR);
      expect(result.sponsorAccountId).toBe(sponsoredInput.sponsorAccountId);
    });

    it('should throw ZodError when name is empty', () => {
      const invalidInput = {
        ...validInput,
        name: '',
      };

      expect(() => CreateCampaignCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when discountValue is not positive', () => {
      const invalidInput = {
        ...validInput,
        discountValue: 0,
      };

      expect(() => CreateCampaignCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when budgetTotal is not positive', () => {
      const invalidInput = {
        ...validInput,
        budgetTotal: -100,
      };

      expect(() => CreateCampaignCommand.validate(invalidInput)).toThrow(ZodError);
    });
  });

  describe('safeValidate', () => {
    it('should return success: true for valid input', () => {
      const result = CreateCampaignCommand.safeValidate(validInput);

      expect(result.success).toBe(true);
    });

    it('should return success: false for invalid input', () => {
      const invalidInput = {
        ...validInput,
        validUntil: new Date('2024-01-01T00:00:00.000Z'),
      };

      const result = CreateCampaignCommand.safeValidate(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create command instance with all properties', () => {
      const command = new CreateCampaignCommand(validInput);

      expect(command.name).toBe(validInput.name);
      expect(command.description).toBe(validInput.description);
      expect(command.incentiveType).toBe(validInput.incentiveType);
      expect(command.fundingSource).toBe(validInput.fundingSource);
      expect(command.discountValue).toBe(validInput.discountValue);
      expect(command.budgetTotal).toBe(validInput.budgetTotal);
    });
  });
});
