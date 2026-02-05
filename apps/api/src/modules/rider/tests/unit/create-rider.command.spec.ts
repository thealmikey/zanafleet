import { VehicleType } from '@zanafleet/contracts';
import { ZodError } from 'zod';

import { CreateRiderCommand } from '../../commands/create-rider.command';

describe('CreateRiderCommand', () => {
  const validLocation = {
    latitude: -1.29,
    longitude: 36.82,
    humanReadableName: 'Nairobi',
    administrativeArea: 'Nairobi',
    country: 'Kenya',
  };

  describe('validate', () => {
    it('should validate a valid command input with location object', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: validLocation,
        vehicleType: VehicleType.Bike,
        saccoId: null,
        email: 'john@example.com',
      };

      const result = CreateRiderCommand.validate(input);

      expect(result).toEqual(input);
    });

    it('should trim whitespace from fullName', () => {
      const input = {
        fullName: '  John Kamau  ',
        nationalId: '12345678',
        phone: '+254712345678',
        location: validLocation,
        vehicleType: VehicleType.Bike,
      };

      const result = CreateRiderCommand.validate(input);

      expect(result.fullName).toBe('John Kamau');
    });

    it('should reject invalid email', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: validLocation,
        vehicleType: VehicleType.Bike,
        email: 'invalid-email',
      };

      expect(() => CreateRiderCommand.validate(input)).toThrow(ZodError);
    });

    it('should reject invalid phone format', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: 'invalid@phone',
        location: validLocation,
        vehicleType: VehicleType.Bike,
      };

      expect(() => CreateRiderCommand.validate(input)).toThrow(ZodError);
    });

    it('should reject invalid vehicleType', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: validLocation,
        vehicleType: 'InvalidVehicle',
      };

      expect(() => CreateRiderCommand.validate(input)).toThrow(ZodError);
    });

    it('should reject invalid UUID for saccoId', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: validLocation,
        vehicleType: VehicleType.Bike,
        saccoId: 'not-a-uuid',
      };

      expect(() => CreateRiderCommand.validate(input)).toThrow(ZodError);
    });

    it('should reject location with invalid latitude', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: { ...validLocation, latitude: 95 },
        vehicleType: VehicleType.Bike,
      };

      expect(() => CreateRiderCommand.validate(input)).toThrow(ZodError);
    });

    it('should reject location with invalid longitude', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: { ...validLocation, longitude: 200 },
        vehicleType: VehicleType.Bike,
      };

      expect(() => CreateRiderCommand.validate(input)).toThrow(ZodError);
    });

    it('should reject location with missing required fields', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: { latitude: -1.29, longitude: 36.82 },
        vehicleType: VehicleType.Bike,
      };

      expect(() => CreateRiderCommand.validate(input)).toThrow(ZodError);
    });

    it('should allow null saccoId', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: validLocation,
        vehicleType: VehicleType.Bike,
        saccoId: null,
      };

      const result = CreateRiderCommand.validate(input);

      expect(result.saccoId).toBeNull();
    });

    it('should allow undefined location', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        vehicleType: VehicleType.Bike,
        location: undefined,
      };

      const result = CreateRiderCommand.validate(input);

      expect(result.location).toBeUndefined();
    });

    it('should allow null location', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        vehicleType: VehicleType.Bike,
        location: null,
      };

      const result = CreateRiderCommand.validate(input);

      expect(result.location).toBeNull();
    });
  });

  describe('safeValidate', () => {
    it('should return success result for valid input', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: validLocation,
        vehicleType: VehicleType.Bike,
      };

      const result = CreateRiderCommand.safeValidate(input);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
    });

    it('should return error result for invalid input', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: 'invalid',
        location: validLocation,
        vehicleType: VehicleType.Bike,
      };

      const result = CreateRiderCommand.safeValidate(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('constructor', () => {
    it('should create a command instance with normalized values', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: validLocation,
        vehicleType: VehicleType.Bike,
        saccoId: null,
        email: 'JOHN@EXAMPLE.COM',
      };

      const validatedInput = CreateRiderCommand.validate(input);
      const command = new CreateRiderCommand(validatedInput);

      expect(command.fullName).toBe('John Kamau');
      expect(command.phone).toBe('+254712345678');
      expect(command.email).toBe('john@example.com');
      expect(command.saccoId).toBeNull();
      expect(command.location).toEqual(validLocation);
    });

    it('should default null values correctly', () => {
      const input = {
        fullName: 'John Kamau',
        nationalId: '12345678',
        phone: '+254712345678',
        location: validLocation,
        vehicleType: VehicleType.Bike,
      };

      const command = new CreateRiderCommand(input);

      expect(command.saccoId).toBeNull();
      expect(command.email).toBeNull();
      expect(command.location).toEqual(validLocation);
    });
  });
});
