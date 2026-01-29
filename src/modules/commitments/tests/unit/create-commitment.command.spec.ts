import { ZodError } from 'zod';

import {
  CreateCommitmentCommand,
  CreateCommitmentCommandSchema,
  CreateCommitmentCommandInput,
} from '../../commands/create-commitment.command';
import { CommitmentStatus, CommitmentType } from '../../dto/commitment.enums';

describe('CreateCommitmentCommandSchema', () => {
  const validInput: CreateCommitmentCommandInput = {
    actorId: '550e8400-e29b-41d4-a716-446655440000',
    workspaceId: '550e8400-e29b-41d4-a716-446655440001',
    type: CommitmentType.DELIVERY,
    status: CommitmentStatus.PENDING,
    description: 'Deliver package by end of day',
    dueAt: new Date('2024-12-31T23:59:59Z'),
  };

  describe('valid input', () => {
    it('should pass validation with all fields', () => {
      const result = CreateCommitmentCommandSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actorId).toBe(validInput.actorId);
        expect(result.data.workspaceId).toBe(validInput.workspaceId);
        expect(result.data.type).toBe(CommitmentType.DELIVERY);
        expect(result.data.status).toBe(CommitmentStatus.PENDING);
        expect(result.data.description).toBe('Deliver package by end of day');
      }
    });

    it('should default status to PENDING when omitted', () => {
      const input = {
        actorId: validInput.actorId,
        workspaceId: validInput.workspaceId,
        type: CommitmentType.PAYMENT,
        description: 'Make payment',
        dueAt: new Date(),
      };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(CommitmentStatus.PENDING);
      }
    });

    it('should trim whitespace from description', () => {
      const input = { ...validInput, description: '  Trimmed description  ' };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('Trimmed description');
      }
    });

    it('should coerce string date to Date object', () => {
      const input = { ...validInput, dueAt: '2024-12-31T23:59:59Z' };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dueAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('actorId validation', () => {
    it('should reject missing actorId', () => {
      const input = { ...validInput, actorId: undefined };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const input = { ...validInput, actorId: 'not-a-uuid' };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Actor ID must be a valid UUID');
      }
    });

    it('should reject empty string', () => {
      const input = { ...validInput, actorId: '' };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('workspaceId validation', () => {
    it('should reject missing workspaceId', () => {
      const input = { ...validInput, workspaceId: undefined };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const input = { ...validInput, workspaceId: 'invalid-uuid' };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Workspace ID must be a valid UUID');
      }
    });
  });

  describe('type validation', () => {
    it('should accept all valid CommitmentType values', () => {
      const types = [
        CommitmentType.DELIVERY,
        CommitmentType.PAYMENT,
        CommitmentType.SERVICE,
        CommitmentType.AVAILABILITY,
      ];

      types.forEach((type) => {
        const input = { ...validInput, type };
        const result = CreateCommitmentCommandSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject missing type', () => {
      const input = { ...validInput, type: undefined };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid type value', () => {
      const input = { ...validInput, type: 'INVALID_TYPE' };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Commitment type must be a valid CommitmentType');
      }
    });
  });

  describe('status validation', () => {
    it('should accept all valid CommitmentStatus values', () => {
      const statuses = [
        CommitmentStatus.PENDING,
        CommitmentStatus.FULFILLED,
        CommitmentStatus.BREACHED,
        CommitmentStatus.CANCELLED,
      ];

      statuses.forEach((status) => {
        const input = { ...validInput, status };
        const result = CreateCommitmentCommandSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status value', () => {
      const input = { ...validInput, status: 'INVALID_STATUS' };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('description validation', () => {
    it('should reject missing description', () => {
      const input = { ...validInput, description: undefined };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject empty description', () => {
      const input = { ...validInput, description: '' };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Description is required');
      }
    });

    it('should reject whitespace-only description', () => {
      const input = { ...validInput, description: '   ' };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject description exceeding 1000 characters', () => {
      const input = { ...validInput, description: 'a'.repeat(1001) };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('must not exceed 1000 characters');
      }
    });

    it('should accept description at max length', () => {
      const input = { ...validInput, description: 'a'.repeat(1000) };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('dueAt validation', () => {
    it('should reject missing dueAt', () => {
      const input = { ...validInput, dueAt: undefined };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid date string', () => {
      const input = { ...validInput, dueAt: 'not-a-date' };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Due date must be a valid date');
      }
    });

    it('should accept valid ISO date string', () => {
      const input = { ...validInput, dueAt: '2024-06-15T12:00:00.000Z' };
      const result = CreateCommitmentCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dueAt).toBeInstanceOf(Date);
      }
    });
  });
});

describe('CreateCommitmentCommand', () => {
  const validInput = {
    actorId: '550e8400-e29b-41d4-a716-446655440000',
    workspaceId: '550e8400-e29b-41d4-a716-446655440001',
    type: CommitmentType.SERVICE,
    status: CommitmentStatus.PENDING,
    description: 'Provide customer support',
    dueAt: new Date('2024-12-31'),
  };

  describe('constructor', () => {
    it('should create command with all properties', () => {
      const command = new CreateCommitmentCommand(validInput);

      expect(command.actorId).toBe(validInput.actorId);
      expect(command.workspaceId).toBe(validInput.workspaceId);
      expect(command.type).toBe(CommitmentType.SERVICE);
      expect(command.status).toBe(CommitmentStatus.PENDING);
      expect(command.description).toBe('Provide customer support');
      expect(command.dueAt).toEqual(validInput.dueAt);
    });

    it('should default status to PENDING when undefined', () => {
      const input = { ...validInput, status: undefined };
      const command = new CreateCommitmentCommand(input as unknown as CreateCommitmentCommandInput);

      expect(command.status).toBe(CommitmentStatus.PENDING);
    });

    it('should convert string date to Date object', () => {
      const input = { ...validInput, dueAt: '2024-12-31T23:59:59Z' };
      const command = new CreateCommitmentCommand(input as unknown as CreateCommitmentCommandInput);

      expect(command.dueAt).toBeInstanceOf(Date);
    });
  });

  describe('validate', () => {
    it('should return validated input for valid data', () => {
      const result = CreateCommitmentCommand.validate(validInput);

      expect(result.actorId).toBe(validInput.actorId);
      expect(result.workspaceId).toBe(validInput.workspaceId);
      expect(result.type).toBe(CommitmentType.SERVICE);
    });

    it('should throw ZodError for invalid data', () => {
      const invalidInput = { actorId: 'invalid', workspaceId: 'invalid' };

      expect(() => CreateCommitmentCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError with correct issues for missing fields', () => {
      try {
        CreateCommitmentCommand.validate({});
        fail('Expected ZodError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        const paths = zodError.issues.map((issue) => issue.path[0]);
        expect(paths).toContain('actorId');
        expect(paths).toContain('workspaceId');
        expect(paths).toContain('type');
        expect(paths).toContain('description');
        expect(paths).toContain('dueAt');
      }
    });
  });

  describe('safeValidate', () => {
    it('should return success result for valid input', () => {
      const result = CreateCommitmentCommand.safeValidate(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actorId).toBe(validInput.actorId);
      }
    });

    it('should return error result for invalid input without throwing', () => {
      const result = CreateCommitmentCommand.safeValidate({ description: '' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should return error result for null input', () => {
      const result = CreateCommitmentCommand.safeValidate(null);

      expect(result.success).toBe(false);
    });

    it('should return error result for undefined input', () => {
      const result = CreateCommitmentCommand.safeValidate(undefined);

      expect(result.success).toBe(false);
    });
  });
});
