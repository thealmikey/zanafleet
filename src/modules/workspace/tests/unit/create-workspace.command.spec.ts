import { ZodError } from 'zod';
import {
  CreateWorkspaceCommand,
  CreateWorkspaceCommandSchema,
  CreateWorkspaceCommandInput,
} from '../../commands/create-workspace.command';

describe('CreateWorkspaceCommandSchema', () => {
  const validInput: CreateWorkspaceCommandInput = {
    name: 'Test Workspace',
    orgId: '550e8400-e29b-41d4-a716-446655440000',
    roleTemplates: ['660e8400-e29b-41d4-a716-446655440001'],
  };

  describe('valid input', () => {
    it('should pass validation with all fields', () => {
      const result = CreateWorkspaceCommandSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Workspace');
        expect(result.data.orgId).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(result.data.roleTemplates).toEqual(['660e8400-e29b-41d4-a716-446655440001']);
      }
    });

    it('should trim whitespace from name', () => {
      const input = { ...validInput, name: '  Trimmed Name  ' };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Trimmed Name');
      }
    });

    it('should accept empty roleTemplates array', () => {
      const input = { ...validInput, roleTemplates: [] };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.roleTemplates).toEqual([]);
      }
    });

    it('should default roleTemplates to empty array when omitted', () => {
      const input = { name: 'Test Workspace', orgId: validInput.orgId };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.roleTemplates).toEqual([]);
      }
    });

    it('should accept multiple valid role template UUIDs', () => {
      const input = {
        ...validInput,
        roleTemplates: [
          '660e8400-e29b-41d4-a716-446655440001',
          '770e8400-e29b-41d4-a716-446655440002',
          '880e8400-e29b-41d4-a716-446655440003',
        ],
      };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.roleTemplates).toHaveLength(3);
      }
    });
  });

  describe('missing name', () => {
    it('should fail when name is missing', () => {
      const input = { orgId: validInput.orgId };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('should fail when name is empty string', () => {
      const input = { ...validInput, name: '' };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Workspace name is required');
      }
    });

    it('should fail when name is only whitespace', () => {
      const input = { ...validInput, name: '   ' };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Workspace name is required');
      }
    });

    it('should fail when name exceeds 255 characters', () => {
      const input = { ...validInput, name: 'a'.repeat(256) };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('must not exceed 255 characters');
      }
    });
  });

  describe('invalid orgId', () => {
    it('should fail when orgId is missing', () => {
      const input = { name: 'Test Workspace' };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('orgId');
      }
    });

    it('should fail when orgId is not a valid UUID', () => {
      const input = { ...validInput, orgId: 'not-a-uuid' };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('must be a valid UUID');
      }
    });

    it('should fail when orgId is empty string', () => {
      const input = { ...validInput, orgId: '' };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('must be a valid UUID');
      }
    });

    it('should fail when orgId is a number', () => {
      const input = { ...validInput, orgId: 12345 };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('invalid roleTemplates', () => {
    it('should fail when roleTemplates contains non-UUID string', () => {
      const input = { ...validInput, roleTemplates: ['invalid-uuid'] };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('must be a valid UUID');
      }
    });

    it('should fail when roleTemplates contains empty string', () => {
      const input = { ...validInput, roleTemplates: [''] };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('must be a valid UUID');
      }
    });

    it('should fail when roleTemplates contains mixed valid and invalid UUIDs', () => {
      const input = {
        ...validInput,
        roleTemplates: ['660e8400-e29b-41d4-a716-446655440001', 'not-valid'],
      };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should fail when roleTemplates is not an array', () => {
      const input = { ...validInput, roleTemplates: 'not-an-array' };
      const result = CreateWorkspaceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

describe('CreateWorkspaceCommand', () => {
  const validInput: CreateWorkspaceCommandInput = {
    name: 'Test Workspace',
    orgId: '550e8400-e29b-41d4-a716-446655440000',
    roleTemplates: ['660e8400-e29b-41d4-a716-446655440001'],
  };

  describe('constructor', () => {
    it('should create command with all properties', () => {
      const command = new CreateWorkspaceCommand(validInput);

      expect(command.name).toBe('Test Workspace');
      expect(command.orgId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(command.roleTemplates).toEqual(['660e8400-e29b-41d4-a716-446655440001']);
    });

    it('should default roleTemplates to empty array when undefined', () => {
      const input = { name: 'Test', orgId: validInput.orgId, roleTemplates: undefined };
      const command = new CreateWorkspaceCommand(input as unknown as CreateWorkspaceCommandInput);

      expect(command.roleTemplates).toEqual([]);
    });
  });

  describe('validate', () => {
    it('should return validated input for valid data', () => {
      const result = CreateWorkspaceCommand.validate(validInput);

      expect(result.name).toBe('Test Workspace');
      expect(result.orgId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.roleTemplates).toEqual(['660e8400-e29b-41d4-a716-446655440001']);
    });

    it('should throw ZodError for invalid data', () => {
      const invalidInput = { name: '', orgId: 'invalid' };

      expect(() => CreateWorkspaceCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError with correct issues for missing fields', () => {
      try {
        CreateWorkspaceCommand.validate({});
        fail('Expected ZodError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        const paths = zodError.issues.map((issue) => issue.path[0]);
        expect(paths).toContain('name');
        expect(paths).toContain('orgId');
      }
    });
  });

  describe('safeValidate', () => {
    it('should return success result for valid input', () => {
      const result = CreateWorkspaceCommand.safeValidate(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Workspace');
      }
    });

    it('should return error result for invalid input without throwing', () => {
      const result = CreateWorkspaceCommand.safeValidate({ name: '' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should return error result for completely invalid input', () => {
      const result = CreateWorkspaceCommand.safeValidate(null);

      expect(result.success).toBe(false);
    });

    it('should return error result for undefined input', () => {
      const result = CreateWorkspaceCommand.safeValidate(undefined);

      expect(result.success).toBe(false);
    });
  });
});
