import { ZodError } from 'zod';

import { CreateAccountCommand } from '../../commands/create-account.command';
import { AccountType } from '../../dto/account.enums';

describe('CreateAccountCommand', () => {
  const validInput = {
    externalId: '550e8400-e29b-41d4-a716-446655440000',
    accountType: AccountType.BUSINESS,
    currency: 'USD',
    metadata: { source: 'signup' },
  };

  describe('validate', () => {
    it('should pass validation with valid input', () => {
      const result = CreateAccountCommand.validate(validInput);

      expect(result).toEqual(validInput);
    });

    it('should pass validation without optional metadata', () => {
      const inputWithoutMetadata = {
        externalId: '550e8400-e29b-41d4-a716-446655440000',
        accountType: AccountType.RIDER,
        currency: 'KES',
      };

      const result = CreateAccountCommand.validate(inputWithoutMetadata);

      expect(result).toEqual(inputWithoutMetadata);
    });

    it('should throw ZodError when externalId is missing', () => {
      const invalidInput = {
        accountType: AccountType.BUSINESS,
        currency: 'USD',
      };

      expect(() => CreateAccountCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when externalId is not a valid UUID', () => {
      const invalidInput = {
        ...validInput,
        externalId: 'not-a-uuid',
      };

      expect(() => CreateAccountCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when accountType is invalid', () => {
      const invalidInput = {
        ...validInput,
        accountType: 'INVALID_TYPE',
      };

      expect(() => CreateAccountCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when currency is not exactly 3 characters', () => {
      const invalidInputShort = {
        ...validInput,
        currency: 'US',
      };

      expect(() => CreateAccountCommand.validate(invalidInputShort)).toThrow(ZodError);

      const invalidInputLong = {
        ...validInput,
        currency: 'USDD',
      };

      expect(() => CreateAccountCommand.validate(invalidInputLong)).toThrow(ZodError);
    });
  });

  describe('safeValidate', () => {
    it('should return success: true for valid input', () => {
      const result = CreateAccountCommand.safeValidate(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should return success: false for invalid input', () => {
      const invalidInput = {
        accountType: AccountType.BUSINESS,
        currency: 'USD',
      };

      const result = CreateAccountCommand.safeValidate(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create command instance with all properties', () => {
      const command = new CreateAccountCommand(validInput);

      expect(command.externalId).toBe(validInput.externalId);
      expect(command.accountType).toBe(validInput.accountType);
      expect(command.currency).toBe(validInput.currency);
      expect(command.metadata).toEqual(validInput.metadata);
    });
  });
});
