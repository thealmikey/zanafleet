import { ZodError } from 'zod';
import { ProcessPayoutCommand } from '../../commands/process-payout.command';

describe('ProcessPayoutCommand', () => {
  const validInput = {
    batchId: '550e8400-e29b-41d4-a716-446655440000',
    providerId: 'mpesa',
    correlationId: '660e8400-e29b-41d4-a716-446655440001',
  };

  describe('validate', () => {
    it('should pass validation with valid input', () => {
      const result = ProcessPayoutCommand.validate(validInput);

      expect(result).toEqual(validInput);
    });

    it('should pass validation without optional correlationId', () => {
      const inputWithoutCorrelation = {
        batchId: validInput.batchId,
        providerId: validInput.providerId,
      };

      const result = ProcessPayoutCommand.validate(inputWithoutCorrelation);

      expect(result.correlationId).toBeUndefined();
    });

    it('should throw ZodError when batchId is not a valid UUID', () => {
      const invalidInput = {
        ...validInput,
        batchId: 'not-a-uuid',
      };

      expect(() => ProcessPayoutCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when providerId is empty', () => {
      const invalidInput = {
        ...validInput,
        providerId: '',
      };

      expect(() => ProcessPayoutCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when providerId exceeds max length', () => {
      const invalidInput = {
        ...validInput,
        providerId: 'a'.repeat(51),
      };

      expect(() => ProcessPayoutCommand.validate(invalidInput)).toThrow(ZodError);
    });
  });

  describe('safeValidate', () => {
    it('should return success: true for valid input', () => {
      const result = ProcessPayoutCommand.safeValidate(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should return success: false for invalid input', () => {
      const invalidInput = {
        ...validInput,
        batchId: 'invalid',
      };

      const result = ProcessPayoutCommand.safeValidate(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create command instance with all properties', () => {
      const command = new ProcessPayoutCommand(validInput);

      expect(command.batchId).toBe(validInput.batchId);
      expect(command.providerId).toBe(validInput.providerId);
      expect(command.correlationId).toBe(validInput.correlationId);
    });
  });
});
