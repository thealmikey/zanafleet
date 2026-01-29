import { ZodError } from 'zod';

import {
  CreateEvidenceCommand,
  CreateEvidenceCommandSchema,
  CreateEvidenceCommandInput,
} from '../../commands/create-evidence.command';
import { EvidenceType, SubjectType, EvidenceSource } from '../../dto/evidence.enums';

describe('CreateEvidenceCommandSchema', () => {
  const validInput: CreateEvidenceCommandInput = {
    type: EvidenceType.CUSTOMER_FEEDBACK,
    actorId: '123e4567-e89b-12d3-a456-426614174000',
    workspaceId: '123e4567-e89b-12d3-a456-426614174001',
    subjectType: SubjectType.RIDER,
    subjectId: '123e4567-e89b-12d3-a456-426614174002',
    payload: { rating: 5, comment: 'Great service!' },
    source: EvidenceSource.API,
    commandId: '123e4567-e89b-12d3-a456-426614174003',
  };

  describe('valid input', () => {
    it('should pass validation with all fields', () => {
      const result = CreateEvidenceCommandSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(EvidenceType.CUSTOMER_FEEDBACK);
        expect(result.data.actorId).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.data.payload).toEqual({ rating: 5, comment: 'Great service!' });
      }
    });

    it('should accept empty payload object', () => {
      const input = { ...validInput, payload: {} };
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept nested payload object', () => {
      const input = {
        ...validInput,
        payload: {
          nested: {
            deep: {
              value: 123,
            },
          },
          array: [1, 2, 3],
        },
      };
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('type validation', () => {
    it('should accept all valid EvidenceType values', () => {
      const types = [
        EvidenceType.CUSTOMER_FEEDBACK,
        EvidenceType.SACCO_VISIT,
        EvidenceType.OPS_ISSUE,
      ];

      types.forEach((type) => {
        const input = { ...validInput, type };
        const result = CreateEvidenceCommandSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject missing type', () => {
      const { type: _type, ...input } = validInput;
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid type value', () => {
      const input = { ...validInput, type: 'INVALID_TYPE' };
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Evidence type must be a valid EvidenceType');
      }
    });
  });

  describe('actorId validation', () => {
    it('should accept a valid UUID', () => {
      const result = CreateEvidenceCommandSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject missing actorId', () => {
      const { actorId: _actorId, ...input } = validInput;
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const input = { ...validInput, actorId: 'not-a-uuid' };
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Actor ID must be a valid UUID');
      }
    });

    it('should reject empty string', () => {
      const input = { ...validInput, actorId: '' };
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('workspaceId validation', () => {
    it('should accept a valid UUID', () => {
      const result = CreateEvidenceCommandSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject missing workspaceId', () => {
      const { workspaceId: _workspaceId, ...input } = validInput;
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const input = { ...validInput, workspaceId: 'invalid-uuid' };
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Workspace ID must be a valid UUID');
      }
    });
  });

  describe('subjectType validation', () => {
    it('should accept all valid SubjectType values', () => {
      const types = [SubjectType.RIDER, SubjectType.BUSINESS, SubjectType.SACCO];

      types.forEach((subjectType) => {
        const input = { ...validInput, subjectType };
        const result = CreateEvidenceCommandSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject missing subjectType', () => {
      const { subjectType: _subjectType, ...input } = validInput;
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid subjectType value', () => {
      const input = { ...validInput, subjectType: 'INVALID_SUBJECT' };
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Subject type must be a valid SubjectType');
      }
    });
  });

  describe('subjectId validation', () => {
    it('should accept a valid UUID', () => {
      const result = CreateEvidenceCommandSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject missing subjectId', () => {
      const { subjectId: _subjectId, ...input } = validInput;
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const input = { ...validInput, subjectId: 'not-valid' };
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Subject ID must be a valid UUID');
      }
    });
  });

  describe('payload validation', () => {
    it('should accept valid object payload', () => {
      const result = CreateEvidenceCommandSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject missing payload', () => {
      const { payload: _payload, ...input } = validInput;
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject non-object payload', () => {
      const input = { ...validInput, payload: 'not-an-object' };
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject array as payload', () => {
      const input = { ...validInput, payload: [1, 2, 3] };
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('source validation', () => {
    it('should accept all valid EvidenceSource values', () => {
      const sources = [EvidenceSource.API, EvidenceSource.SMS, EvidenceSource.OPS_APP];

      sources.forEach((source) => {
        const input = { ...validInput, source };
        const result = CreateEvidenceCommandSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject missing source', () => {
      const { source: _source, ...input } = validInput;
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid source value', () => {
      const input = { ...validInput, source: 'INVALID_SOURCE' };
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Source must be a valid EvidenceSource');
      }
    });
  });

  describe('commandId validation', () => {
    it('should accept a valid UUID', () => {
      const result = CreateEvidenceCommandSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject missing commandId', () => {
      const { commandId: _commandId, ...input } = validInput;
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const input = { ...validInput, commandId: 'not-a-uuid' };
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Command ID must be a valid UUID');
      }
    });

    it('should reject empty string', () => {
      const input = { ...validInput, commandId: '' };
      const result = CreateEvidenceCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

describe('CreateEvidenceCommand', () => {
  const validInput: CreateEvidenceCommandInput = {
    type: EvidenceType.SACCO_VISIT,
    actorId: '123e4567-e89b-12d3-a456-426614174000',
    workspaceId: '123e4567-e89b-12d3-a456-426614174001',
    subjectType: SubjectType.SACCO,
    subjectId: '123e4567-e89b-12d3-a456-426614174002',
    payload: { visitDate: '2024-01-15', notes: 'Routine check' },
    source: EvidenceSource.OPS_APP,
    commandId: '123e4567-e89b-12d3-a456-426614174003',
  };

  describe('constructor', () => {
    it('should create command with all properties', () => {
      const command = new CreateEvidenceCommand(validInput);

      expect(command.type).toBe(EvidenceType.SACCO_VISIT);
      expect(command.actorId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(command.workspaceId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(command.subjectType).toBe(SubjectType.SACCO);
      expect(command.subjectId).toBe('123e4567-e89b-12d3-a456-426614174002');
      expect(command.payload).toEqual({ visitDate: '2024-01-15', notes: 'Routine check' });
      expect(command.source).toBe(EvidenceSource.OPS_APP);
      expect(command.commandId).toBe('123e4567-e89b-12d3-a456-426614174003');
    });
  });

  describe('validate', () => {
    it('should return validated input for valid data', () => {
      const result = CreateEvidenceCommand.validate(validInput);

      expect(result.type).toBe(EvidenceType.SACCO_VISIT);
      expect(result.actorId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.commandId).toBe('123e4567-e89b-12d3-a456-426614174003');
    });

    it('should throw ZodError for invalid data', () => {
      const invalidInput = { ...validInput, actorId: 'invalid' };

      expect(() => CreateEvidenceCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError with correct issues for missing fields', () => {
      try {
        CreateEvidenceCommand.validate({});
        fail('Expected ZodError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        const paths = zodError.issues.map((issue) => issue.path[0]);
        expect(paths).toContain('type');
        expect(paths).toContain('actorId');
        expect(paths).toContain('workspaceId');
        expect(paths).toContain('subjectType');
        expect(paths).toContain('subjectId');
        expect(paths).toContain('payload');
        expect(paths).toContain('source');
        expect(paths).toContain('commandId');
      }
    });
  });

  describe('safeValidate', () => {
    it('should return success result for valid input', () => {
      const result = CreateEvidenceCommand.safeValidate(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(EvidenceType.SACCO_VISIT);
      }
    });

    it('should return error result for invalid input without throwing', () => {
      const result = CreateEvidenceCommand.safeValidate({ type: 'INVALID' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should return error result for null input', () => {
      const result = CreateEvidenceCommand.safeValidate(null);

      expect(result.success).toBe(false);
    });

    it('should return error result for undefined input', () => {
      const result = CreateEvidenceCommand.safeValidate(undefined);

      expect(result.success).toBe(false);
    });
  });
});
