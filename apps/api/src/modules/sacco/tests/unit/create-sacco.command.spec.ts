import { ZodError } from 'zod';
import { CreateSaccoCommand } from '../../commands/create-sacco.command';

describe('CreateSaccoCommand', () => {
  describe('validation', () => {
    it('should create a valid command with full location object', () => {
      const input = {
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
          country: 'Kenya',
        },
        contactPhone: '+254712345678',
      };

      const validated = CreateSaccoCommand.validate(input);
      expect(validated).toBeDefined();
      expect(validated.name).toBe('Nairobi Taxi Sacco');
      expect(validated.location.latitude).toBe(-1.29);
      expect(validated.location.longitude).toBe(36.82);
    });

    it('should reject missing location latitude', () => {
      const input = {
        name: 'Nairobi Taxi Sacco',
        location: {
          longitude: 36.82,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
        },
        contactPhone: '+254712345678',
      };

      const result = CreateSaccoCommand.safeValidate(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should reject missing location longitude', () => {
      const input = {
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: -1.29,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
        },
        contactPhone: '+254712345678',
      };

      const result = CreateSaccoCommand.safeValidate(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should reject invalid latitude (too high)', () => {
      const input = {
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: 95,
          longitude: 36.82,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
        },
        contactPhone: '+254712345678',
      };

      const result = CreateSaccoCommand.safeValidate(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should reject invalid latitude (too low)', () => {
      const input = {
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: -95,
          longitude: 36.82,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
        },
        contactPhone: '+254712345678',
      };

      const result = CreateSaccoCommand.safeValidate(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should reject invalid longitude (too high)', () => {
      const input = {
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: -1.29,
          longitude: 190,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
        },
        contactPhone: '+254712345678',
      };

      const result = CreateSaccoCommand.safeValidate(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should reject invalid longitude (too low)', () => {
      const input = {
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: -1.29,
          longitude: -190,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
        },
        contactPhone: '+254712345678',
      };

      const result = CreateSaccoCommand.safeValidate(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should accept default country when not provided', () => {
      const input = {
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
        },
        contactPhone: '+254712345678',
      };

      const validated = CreateSaccoCommand.validate(input);
      expect(validated.location.country).toBe('Kenya');
    });

    it('should reject missing humanReadableName', () => {
      const input = {
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: -1.29,
          longitude: 36.82,
          administrativeArea: 'Nairobi',
        },
        contactPhone: '+254712345678',
      };

      const result = CreateSaccoCommand.safeValidate(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should reject missing administrativeArea', () => {
      const input = {
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Westlands',
        },
        contactPhone: '+254712345678',
      };

      const result = CreateSaccoCommand.safeValidate(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should reject invalid contact phone with invalid characters', () => {
      const input = {
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
        },
        contactPhone: 'invalid@phone#',
      };

      const result = CreateSaccoCommand.safeValidate(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should reject contact phone too short', () => {
      const input = {
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
        },
        contactPhone: '123',
      };

      const result = CreateSaccoCommand.safeValidate(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should construct command from validated input', () => {
      const input = {
        name: 'Nairobi Taxi Sacco',
        location: {
          latitude: -1.29,
          longitude: 36.82,
          humanReadableName: 'Westlands',
          administrativeArea: 'Nairobi',
          country: 'Kenya',
        },
        contactPhone: '+254712345678',
      };

      const validated = CreateSaccoCommand.validate(input);
      const command = new CreateSaccoCommand(validated);

      expect(command.name).toBe('Nairobi Taxi Sacco');
      expect(command.location.latitude).toBe(-1.29);
      expect(command.location.longitude).toBe(36.82);
      expect(command.location.humanReadableName).toBe('Westlands');
      expect(command.location.administrativeArea).toBe('Nairobi');
      expect(command.location.country).toBe('Kenya');
      expect(command.contactPhone).toBe('+254712345678');
    });
  });
});
