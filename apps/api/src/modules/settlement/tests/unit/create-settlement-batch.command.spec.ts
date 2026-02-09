import { ZodError } from 'zod';
import { CreateSettlementBatchCommand } from '../../commands/create-settlement-batch.command';
import { PayoutMethod } from '../../dto/settlement.enums';

describe('CreateSettlementBatchCommand', () => {
  const validInput = {
    riderAccountId: '550e8400-e29b-41d4-a716-446655440000',
    periodStart: new Date('2024-01-08T00:00:00.000Z'),
    periodEnd: new Date('2024-01-15T00:00:00.000Z'),
    payoutMethod: PayoutMethod.MOBILE_MONEY,
    commissionRate: 0.15,
    correlationId: '660e8400-e29b-41d4-a716-446655440001',
  };

  describe('validate', () => {
    it('should pass validation with valid input', () => {
      const result = CreateSettlementBatchCommand.validate(validInput);

      expect(result).toEqual(validInput);
    });

    it('should use default commission rate when not provided', () => {
      const inputWithoutRate = {
        riderAccountId: validInput.riderAccountId,
        periodStart: validInput.periodStart,
        periodEnd: validInput.periodEnd,
        payoutMethod: validInput.payoutMethod,
      };

      const result = CreateSettlementBatchCommand.validate(inputWithoutRate);

      expect(result.commissionRate).toBe(0.15);
    });

    it('should throw ZodError when riderAccountId is not a valid UUID', () => {
      const invalidInput = {
        ...validInput,
        riderAccountId: 'not-a-uuid',
      };

      expect(() => CreateSettlementBatchCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when payoutMethod is invalid', () => {
      const invalidInput = {
        ...validInput,
        payoutMethod: 'INVALID_METHOD',
      };

      expect(() => CreateSettlementBatchCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when commissionRate is greater than 1', () => {
      const invalidInput = {
        ...validInput,
        commissionRate: 1.5,
      };

      expect(() => CreateSettlementBatchCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when commissionRate is negative', () => {
      const invalidInput = {
        ...validInput,
        commissionRate: -0.1,
      };

      expect(() => CreateSettlementBatchCommand.validate(invalidInput)).toThrow(ZodError);
    });
  });

  describe('safeValidate', () => {
    it('should return success: true for valid input', () => {
      const result = CreateSettlementBatchCommand.safeValidate(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.riderAccountId).toBe(validInput.riderAccountId);
      }
    });

    it('should return success: false for invalid input', () => {
      const invalidInput = {
        ...validInput,
        riderAccountId: 'invalid',
      };

      const result = CreateSettlementBatchCommand.safeValidate(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create command instance with all properties', () => {
      const command = new CreateSettlementBatchCommand(validInput);

      expect(command.riderAccountId).toBe(validInput.riderAccountId);
      expect(command.periodStart).toBe(validInput.periodStart);
      expect(command.periodEnd).toBe(validInput.periodEnd);
      expect(command.payoutMethod).toBe(validInput.payoutMethod);
      expect(command.commissionRate).toBe(validInput.commissionRate);
      expect(command.correlationId).toBe(validInput.correlationId);
    });
  });
});
