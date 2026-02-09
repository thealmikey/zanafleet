import { ZodError } from 'zod';

import { ApplyIncentiveCommand } from '../../commands/apply-incentive.command';

describe('ApplyIncentiveCommand', () => {
  const validInput = {
    campaignId: '550e8400-e29b-41d4-a716-446655440000',
    invoiceId: '660e8400-e29b-41d4-a716-446655440001',
    beneficiaryAccountId: '770e8400-e29b-41d4-a716-446655440002',
    baseAmount: 100,
    currency: 'USD',
    deliveryId: '880e8400-e29b-41d4-a716-446655440003',
    correlationId: '990e8400-e29b-41d4-a716-446655440004',
  };

  describe('validate', () => {
    it('should pass validation with valid input', () => {
      const result = ApplyIncentiveCommand.validate(validInput);

      expect(result).toEqual(validInput);
    });

    it('should pass validation without optional fields', () => {
      const minimalInput = {
        campaignId: validInput.campaignId,
        invoiceId: validInput.invoiceId,
        beneficiaryAccountId: validInput.beneficiaryAccountId,
        baseAmount: 50,
        currency: 'KES',
      };

      const result = ApplyIncentiveCommand.validate(minimalInput);

      expect(result.deliveryId).toBeUndefined();
      expect(result.correlationId).toBeUndefined();
    });

    it('should throw ZodError when campaignId is not a valid UUID', () => {
      const invalidInput = {
        ...validInput,
        campaignId: 'not-a-uuid',
      };

      expect(() => ApplyIncentiveCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when baseAmount is not positive', () => {
      const invalidInput = {
        ...validInput,
        baseAmount: 0,
      };

      expect(() => ApplyIncentiveCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when currency is not exactly 3 characters', () => {
      const invalidInput = {
        ...validInput,
        currency: 'US',
      };

      expect(() => ApplyIncentiveCommand.validate(invalidInput)).toThrow(ZodError);
    });
  });

  describe('safeValidate', () => {
    it('should return success: true for valid input', () => {
      const result = ApplyIncentiveCommand.safeValidate(validInput);

      expect(result.success).toBe(true);
    });

    it('should return success: false for invalid input', () => {
      const invalidInput = {
        ...validInput,
        invoiceId: 'invalid',
      };

      const result = ApplyIncentiveCommand.safeValidate(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create command instance with all properties', () => {
      const command = new ApplyIncentiveCommand(validInput);

      expect(command.campaignId).toBe(validInput.campaignId);
      expect(command.invoiceId).toBe(validInput.invoiceId);
      expect(command.beneficiaryAccountId).toBe(validInput.beneficiaryAccountId);
      expect(command.baseAmount).toBe(validInput.baseAmount);
      expect(command.currency).toBe(validInput.currency);
      expect(command.deliveryId).toBe(validInput.deliveryId);
    });
  });
});
