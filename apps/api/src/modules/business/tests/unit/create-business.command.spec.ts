import { ZodError } from 'zod';

import { BusinessType } from '@zanafleet/contracts';
import { CreateBusinessCommand } from '../../commands/create-business.command';

describe('CreateBusinessCommand', () => {
  describe('validate', () => {
    it('should validate a valid command input', () => {
      const input = {
        businessName: 'Nairobi Supermarket Ltd',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        businessType: BusinessType.Retail,
        email: 'info@business.com',
      };

      const result = CreateBusinessCommand.validate(input);

      expect(result).toEqual(input);
    });

    it('should trim whitespace from businessName', () => {
      const input = {
        businessName: '  Nairobi Supermarket  ',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        businessType: BusinessType.Retail,
      };

      const result = CreateBusinessCommand.validate(input);

      expect(result.businessName).toBe('Nairobi Supermarket');
    });

    it('should lowercase email', () => {
      const input = {
        businessName: 'Test Business',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        businessType: BusinessType.Restaurant,
        email: 'INFO@BUSINESS.COM',
      };

      const result = CreateBusinessCommand.validate(input);

      expect(result.email).toBe('info@business.com');
    });

    it('should reject invalid email', () => {
      const input = {
        businessName: 'Test Business',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        businessType: BusinessType.Retail,
        email: 'invalid-email',
      };

      expect(() => CreateBusinessCommand.validate(input)).toThrow(ZodError);
    });

    it('should reject invalid phone format', () => {
      const input = {
        businessName: 'Test Business',
        phone: 'invalid@phone',
        location: 'Nairobi, Kenya',
        businessType: BusinessType.Retail,
      };

      expect(() => CreateBusinessCommand.validate(input)).toThrow(ZodError);
    });

    it('should reject invalid businessType', () => {
      const input = {
        businessName: 'Test Business',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        businessType: 'InvalidType',
      };

      expect(() => CreateBusinessCommand.validate(input)).toThrow(ZodError);
    });

    it('should reject missing businessName', () => {
      const input = {
        businessName: '',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        businessType: BusinessType.Retail,
      };

      expect(() => CreateBusinessCommand.validate(input)).toThrow(ZodError);
    });

    it('should reject phone shorter than 5 characters', () => {
      const input = {
        businessName: 'Test Business',
        phone: '+254',
        location: 'Nairobi, Kenya',
        businessType: BusinessType.Retail,
      };

      expect(() => CreateBusinessCommand.validate(input)).toThrow(ZodError);
    });

    it('should reject missing location', () => {
      const input = {
        businessName: 'Test Business',
        phone: '+254712345678',
        location: '',
        businessType: BusinessType.Retail,
      };

      expect(() => CreateBusinessCommand.validate(input)).toThrow(ZodError);
    });

    it('should allow null email', () => {
      const input = {
        businessName: 'Test Business',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        businessType: BusinessType.Retail,
        email: null,
      };

      const result = CreateBusinessCommand.validate(input);

      expect(result.email).toBeNull();
    });

    it('should allow undefined email', () => {
      const input = {
        businessName: 'Test Business',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        businessType: BusinessType.Retail,
      };

      const result = CreateBusinessCommand.validate(input);

      expect(result.email).toBeUndefined();
    });

    it('should validate all BusinessType enum values', () => {
      const businessTypes = Object.values(BusinessType);

      businessTypes.forEach((type) => {
        const input = {
          businessName: 'Test Business',
          phone: '+254712345678',
          location: 'Nairobi, Kenya',
          businessType: type,
        };

        const result = CreateBusinessCommand.validate(input);
        expect(result.businessType).toBe(type);
      });
    });
  });

  describe('safeValidate', () => {
    it('should return success result for valid input', () => {
      const input = {
        businessName: 'Test Business',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        businessType: BusinessType.Retail,
      };

      const result = CreateBusinessCommand.safeValidate(input);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
    });

    it('should return error result for invalid input', () => {
      const input = {
        businessName: 'Test Business',
        phone: 'invalid',
        location: 'Nairobi, Kenya',
        businessType: BusinessType.Retail,
      };

      const result = CreateBusinessCommand.safeValidate(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('constructor', () => {
    it('should create a command instance with normalized values', () => {
      const input = {
        businessName: 'Test Business',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        businessType: BusinessType.Logistics,
        email: 'INFO@BUSINESS.COM',
      };

      const validatedInput = CreateBusinessCommand.validate(input);
      const command = new CreateBusinessCommand(validatedInput);

      expect(command.businessName).toBe('Test Business');
      expect(command.phone).toBe('+254712345678');
      expect(command.email).toBe('info@business.com');
      expect(command.businessType).toBe(BusinessType.Logistics);
    });

    it('should default null values correctly', () => {
      const input = {
        businessName: 'Test Business',
        phone: '+254712345678',
        location: 'Nairobi, Kenya',
        businessType: BusinessType.Retail,
      };

      const command = new CreateBusinessCommand(input);

      expect(command.email).toBeNull();
      expect(command.location).toBe('Nairobi, Kenya');
    });
  });
});
