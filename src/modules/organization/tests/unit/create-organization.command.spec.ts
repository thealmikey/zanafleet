import { CreateOrganizationCommand, CreateOrganizationCommandSchema } from '../../commands/create-organization.command';
import { OrganizationType, OrganizationStatus } from '../../dto/organization.enums';
import { z } from 'zod';

/**
 * Unit Tests: CreateOrganizationCommand Validation
 * 
 * Tests focus on:
 * - Valid command creation
 * - Zod schema validation
 * - Input validation errors
 * - Type safety
 * - Edge cases
 */
describe('CreateOrganizationCommand', () => {
  describe('Command Creation', () => {
    it('should create a valid command with all required fields', () => {
      const input = {
        name: 'Test Organization',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: ['550e8400-e29b-41d4-a716-446655440000'],
      };

      const command = new CreateOrganizationCommand(input);

      expect(command.name).toBe('Test Organization');
      expect(command.type).toBe(OrganizationType.SACCO);
      expect(command.status).toBe(OrganizationStatus.ACTIVE);
      expect(command.linkedWallets).toEqual(['550e8400-e29b-41d4-a716-446655440000']);
    });

    it('should create a valid command with default linkedWallets', () => {
      const input = {
        name: 'Test Organization',
        type: OrganizationType.BUSINESS,
        status: OrganizationStatus.PILOT,
      };

      const validated = CreateOrganizationCommand.validate(input);
      const command = new CreateOrganizationCommand(validated);

      expect(command.linkedWallets).toEqual([]);
    });

    it('should trim whitespace from organization name', () => {
      const input = {
        name: '  Test Organization  ',
        type: OrganizationType.PLATFORM,
        status: OrganizationStatus.ACTIVE,
      };

      const validated = CreateOrganizationCommand.validate(input);
      expect(validated.name).toBe('Test Organization');
    });
  });

  describe('Zod Schema Validation', () => {
    it('should validate correct input', () => {
      const input = {
        name: 'Valid Organization',
        type: 'SACCO',
        status: 'active',
      };

      expect(() => CreateOrganizationCommandSchema.parse(input)).not.toThrow();
    });

    it('should reject empty name', () => {
      const input = {
        name: '',
        type: 'SACCO',
        status: 'active',
      };

      expect(() => CreateOrganizationCommandSchema.parse(input)).toThrow(
        z.ZodError,
      );
    });

    it('should reject name exceeding 255 characters', () => {
      const input = {
        name: 'a'.repeat(256),
        type: 'SACCO',
        status: 'active',
      };

      expect(() => CreateOrganizationCommandSchema.parse(input)).toThrow(
        z.ZodError,
      );
    });

    it('should reject invalid organization type', () => {
      const input = {
        name: 'Test Organization',
        type: 'InvalidType',
        status: 'active',
      };

      expect(() => CreateOrganizationCommandSchema.parse(input)).toThrow(
        z.ZodError,
      );
    });

    it('should reject invalid organization status', () => {
      const input = {
        name: 'Test Organization',
        type: 'SACCO',
        status: 'invalid-status',
      };

      expect(() => CreateOrganizationCommandSchema.parse(input)).toThrow(
        z.ZodError,
      );
    });

    it('should reject invalid wallet UUID', () => {
      const input = {
        name: 'Test Organization',
        type: 'SACCO',
        status: 'active',
        linkedWallets: ['not-a-uuid'],
      };

      expect(() => CreateOrganizationCommandSchema.parse(input)).toThrow(
        z.ZodError,
      );
    });

    it('should accept valid UUID in linkedWallets', () => {
      const input = {
        name: 'Test Organization',
        type: 'SACCO',
        status: 'active',
        linkedWallets: [
          '550e8400-e29b-41d4-a716-446655440000',
          '550e8400-e29b-41d4-a716-446655440001',
        ],
      };

      expect(() => CreateOrganizationCommandSchema.parse(input)).not.toThrow();
    });
  });

  describe('Safe Validation', () => {
    it('should return success result for valid input', () => {
      const input = {
        name: 'Valid Organization',
        type: 'SACCO',
        status: 'active',
      };

      const result = CreateOrganizationCommand.safeValidate(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Valid Organization');
      }
    });

    it('should return error result for invalid input', () => {
      const input = {
        name: '',
        type: 'SACCO',
        status: 'active',
      };

      const result = CreateOrganizationCommand.safeValidate(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('All Organization Types', () => {
    const types = [
      OrganizationType.SACCO,
      OrganizationType.BUSINESS,
      OrganizationType.PLATFORM,
      OrganizationType.INTERNAL,
    ];

    types.forEach((type) => {
      it(`should accept organization type: ${type}`, () => {
        const input = {
          name: 'Test Organization',
          type,
          status: OrganizationStatus.ACTIVE,
        };

        expect(() => CreateOrganizationCommand.validate(input)).not.toThrow();
      });
    });
  });

  describe('All Organization Statuses', () => {
    const statuses = [
      OrganizationStatus.ACTIVE,
      OrganizationStatus.SUSPENDED,
      OrganizationStatus.PILOT,
      OrganizationStatus.LEGACY,
    ];

    statuses.forEach((status) => {
      it(`should accept organization status: ${status}`, () => {
        const input = {
          name: 'Test Organization',
          type: OrganizationType.SACCO,
          status,
        };

        expect(() => CreateOrganizationCommand.validate(input)).not.toThrow();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should accept minimum length name (1 character)', () => {
      const input = {
        name: 'A',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
      };

      expect(() => CreateOrganizationCommand.validate(input)).not.toThrow();
    });

    it('should accept maximum length name (255 characters)', () => {
      const input = {
        name: 'a'.repeat(255),
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
      };

      expect(() => CreateOrganizationCommand.validate(input)).not.toThrow();
    });

    it('should accept empty linkedWallets array', () => {
      const input = {
        name: 'Test Organization',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
      };

      expect(() => CreateOrganizationCommand.validate(input)).not.toThrow();
    });

    it('should accept multiple linkedWallets', () => {
      const input = {
        name: 'Test Organization',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [
          '550e8400-e29b-41d4-a716-446655440000',
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
        ],
      };

      expect(() => CreateOrganizationCommand.validate(input)).not.toThrow();
    });
  });

  describe('createdByActorId Validation', () => {
    it('should accept valid UUID for createdByActorId', () => {
      const input = {
        name: 'Test Organization',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        createdByActorId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const command = new CreateOrganizationCommand(input);

      expect(command.createdByActorId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should reject invalid UUID format for createdByActorId', () => {
      const input = {
        name: 'Test Organization',
        type: 'SACCO',
        status: 'active',
        createdByActorId: 'not-a-valid-uuid',
      };

      expect(() => CreateOrganizationCommandSchema.parse(input)).toThrow(
        z.ZodError,
      );
    });

    it('should work without createdByActorId (backward compatible)', () => {
      const input = {
        name: 'Test Organization',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
      };

      const command = new CreateOrganizationCommand(input);

      expect(command.createdByActorId).toBeUndefined();
      expect(command.name).toBe('Test Organization');
    });

    it('should accept undefined createdByActorId explicitly', () => {
      const input = {
        name: 'Test Organization',
        type: 'SACCO',
        status: 'active',
        createdByActorId: undefined,
      };

      expect(() => CreateOrganizationCommandSchema.parse(input)).not.toThrow();
    });
  });
});
