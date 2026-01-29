import { ZodError } from 'zod';

import {
  AddActorToWorkspaceCommand,
  AddActorToWorkspaceCommandSchema,
  AddActorToWorkspaceCommandInput,
} from '../../commands/add-actor-to-workspace.command';
import { MembershipRole } from '../../dto/workspace.enums';

describe('AddActorToWorkspaceCommandSchema', () => {
  const validInput: AddActorToWorkspaceCommandInput = {
    actorId: '123e4567-e89b-12d3-a456-426614174000',
    workspaceId: '123e4567-e89b-12d3-a456-426614174001',
    role: MembershipRole.RIDER,
  };

  describe('actorId validation', () => {
    it('should accept a valid UUID', () => {
      const result = AddActorToWorkspaceCommandSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject missing actorId', () => {
      const input = { ...validInput, actorId: undefined };
      const result = AddActorToWorkspaceCommandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const input = { ...validInput, actorId: 'not-a-uuid' };
      const result = AddActorToWorkspaceCommandSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Actor ID must be a valid UUID');
      }
    });

    it('should reject empty string', () => {
      const input = { ...validInput, actorId: '' };
      const result = AddActorToWorkspaceCommandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('workspaceId validation', () => {
    it('should accept a valid UUID', () => {
      const result = AddActorToWorkspaceCommandSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject missing workspaceId', () => {
      const input = { ...validInput, workspaceId: undefined };
      const result = AddActorToWorkspaceCommandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const input = { ...validInput, workspaceId: 'invalid-uuid' };
      const result = AddActorToWorkspaceCommandSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Workspace ID must be a valid UUID');
      }
    });
  });

  describe('role validation', () => {
    it('should accept all valid MembershipRole values', () => {
      const roles = [
        MembershipRole.RIDER,
        MembershipRole.ADMIN,
        MembershipRole.OPS,
        MembershipRole.BUSINESS_OWNER,
      ];

      roles.forEach((role) => {
        const input = { ...validInput, role };
        const result = AddActorToWorkspaceCommandSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject missing role', () => {
      const input = { ...validInput, role: undefined };
      const result = AddActorToWorkspaceCommandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid role value', () => {
      const input = { ...validInput, role: 'INVALID_ROLE' };
      const result = AddActorToWorkspaceCommandSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Role must be a valid MembershipRole');
      }
    });
  });
});

describe('AddActorToWorkspaceCommand', () => {
  const validInput = {
    actorId: '123e4567-e89b-12d3-a456-426614174000',
    workspaceId: '123e4567-e89b-12d3-a456-426614174001',
    role: MembershipRole.ADMIN,
  };

  describe('constructor', () => {
    it('should create command with valid input', () => {
      const command = new AddActorToWorkspaceCommand(validInput);
      expect(command.actorId).toBe(validInput.actorId);
      expect(command.workspaceId).toBe(validInput.workspaceId);
      expect(command.role).toBe(validInput.role);
    });
  });

  describe('validate', () => {
    it('should return validated input for valid data', () => {
      const result = AddActorToWorkspaceCommand.validate(validInput);
      expect(result.actorId).toBe(validInput.actorId);
      expect(result.workspaceId).toBe(validInput.workspaceId);
      expect(result.role).toBe(validInput.role);
    });

    it('should throw ZodError for invalid input', () => {
      const invalidInput = { ...validInput, actorId: 'not-a-uuid' };
      expect(() => AddActorToWorkspaceCommand.validate(invalidInput)).toThrow(ZodError);
    });
  });

  describe('safeValidate', () => {
    it('should return success result for valid input', () => {
      const result = AddActorToWorkspaceCommand.safeValidate(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actorId).toBe(validInput.actorId);
      }
    });

    it('should return error result for invalid input', () => {
      const invalidInput = { ...validInput, role: 'INVALID' };
      const result = AddActorToWorkspaceCommand.safeValidate(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});
