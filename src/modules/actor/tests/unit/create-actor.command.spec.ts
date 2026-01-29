import { ZodError } from 'zod';

import { CreateActorCommand, CreateActorCommandSchema } from '../../commands/create-actor.command';
import { ActorType } from '../../dto/actor.enums';

describe('CreateActorCommand', () => {
  const validWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';
  const validRoleId1 = '660e8400-e29b-41d4-a716-446655440001';
  const validRoleId2 = '770e8400-e29b-41d4-a716-446655440002';
  const validWalletId = '880e8400-e29b-41d4-a716-446655440003';

  describe('CreateActorCommandSchema', () => {
    describe('valid input', () => {
      it('should validate command with all fields', () => {
        const input = {
          type: ActorType.Rider,
          workspaceId: validWorkspaceId,
          roles: [validRoleId1, validRoleId2],
          linkedWallets: [validWalletId],
        };

        const result = CreateActorCommandSchema.parse(input);

        expect(result.type).toBe(ActorType.Rider);
        expect(result.workspaceId).toBe(validWorkspaceId);
        expect(result.roles).toEqual([validRoleId1, validRoleId2]);
        expect(result.linkedWallets).toEqual([validWalletId]);
      });

      it('should validate all ActorType enum values', () => {
        const actorTypes = Object.values(ActorType);

        actorTypes.forEach((actorType) => {
          const input = {
            type: actorType,
            workspaceId: validWorkspaceId,
            roles: [validRoleId1],
          };

          const result = CreateActorCommandSchema.parse(input);
          expect(result.type).toBe(actorType);
        });
      });

      it('should accept empty roles array', () => {
        const input = {
          type: ActorType.Internal,
          workspaceId: validWorkspaceId,
          roles: [],
        };

        const result = CreateActorCommandSchema.parse(input);
        expect(result.roles).toEqual([]);
      });
    });

    describe('invalid ActorType', () => {
      it('should reject invalid ActorType enum values', () => {
        const input = {
          type: 'InvalidType',
          workspaceId: validWorkspaceId,
          roles: [validRoleId1],
        };

        expect(() => CreateActorCommandSchema.parse(input)).toThrow(ZodError);
      });

      it('should provide meaningful error message for invalid ActorType', () => {
        const input = {
          type: 'NotAnActorType',
          workspaceId: validWorkspaceId,
          roles: [validRoleId1],
        };

        const result = CreateActorCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          const typeError = result.error.errors.find((e) => e.path[0] === 'type');
          expect(typeError?.message).toContain('Actor type must be one of');
        }
      });

      it('should reject null ActorType', () => {
        const input = {
          type: null,
          workspaceId: validWorkspaceId,
          roles: [validRoleId1],
        };

        expect(() => CreateActorCommandSchema.parse(input)).toThrow(ZodError);
      });
    });

    describe('invalid workspaceId', () => {
      it('should reject non-UUID workspaceId', () => {
        const input = {
          type: ActorType.Business,
          workspaceId: 'not-a-uuid',
          roles: [validRoleId1],
        };

        expect(() => CreateActorCommandSchema.parse(input)).toThrow(ZodError);
      });

      it('should provide meaningful error message for invalid workspaceId', () => {
        const input = {
          type: ActorType.Business,
          workspaceId: 'invalid-workspace-id',
          roles: [validRoleId1],
        };

        const result = CreateActorCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          const workspaceError = result.error.errors.find((e) => e.path[0] === 'workspaceId');
          expect(workspaceError?.message).toBe('Workspace ID must be a valid UUID');
        }
      });

      it('should reject empty workspaceId', () => {
        const input = {
          type: ActorType.SaccoAdmin,
          workspaceId: '',
          roles: [validRoleId1],
        };

        expect(() => CreateActorCommandSchema.parse(input)).toThrow(ZodError);
      });

      it('should reject missing workspaceId', () => {
        const input = {
          type: ActorType.Rider,
          roles: [validRoleId1],
        };

        expect(() => CreateActorCommandSchema.parse(input)).toThrow(ZodError);
      });
    });

    describe('invalid roles', () => {
      it('should reject non-UUID role IDs in array', () => {
        const input = {
          type: ActorType.Rider,
          workspaceId: validWorkspaceId,
          roles: ['not-a-uuid'],
        };

        expect(() => CreateActorCommandSchema.parse(input)).toThrow(ZodError);
      });

      it('should provide meaningful error message for invalid role UUID', () => {
        const input = {
          type: ActorType.Rider,
          workspaceId: validWorkspaceId,
          roles: [validRoleId1, 'invalid-role-id'],
        };

        const result = CreateActorCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          const roleError = result.error.errors.find((e) => e.path[0] === 'roles');
          expect(roleError?.message).toBe('Each role ID must be a valid UUID');
        }
      });

      it('should reject missing roles field', () => {
        const input = {
          type: ActorType.Internal,
          workspaceId: validWorkspaceId,
        };

        expect(() => CreateActorCommandSchema.parse(input)).toThrow(ZodError);
      });

      it('should reject mixed valid and invalid role UUIDs', () => {
        const input = {
          type: ActorType.AIService,
          workspaceId: validWorkspaceId,
          roles: [validRoleId1, 'bad-uuid', validRoleId2],
        };

        const result = CreateActorCommandSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('optional linkedWallets', () => {
      it('should default linkedWallets to empty array when not provided', () => {
        const input = {
          type: ActorType.Rider,
          workspaceId: validWorkspaceId,
          roles: [validRoleId1],
        };

        const result = CreateActorCommandSchema.parse(input);

        expect(result.linkedWallets).toEqual([]);
      });

      it('should accept valid linkedWallets array', () => {
        const input = {
          type: ActorType.Business,
          workspaceId: validWorkspaceId,
          roles: [validRoleId1],
          linkedWallets: [validWalletId],
        };

        const result = CreateActorCommandSchema.parse(input);

        expect(result.linkedWallets).toEqual([validWalletId]);
      });

      it('should accept empty linkedWallets array', () => {
        const input = {
          type: ActorType.SaccoAdmin,
          workspaceId: validWorkspaceId,
          roles: [validRoleId1],
          linkedWallets: [],
        };

        const result = CreateActorCommandSchema.parse(input);

        expect(result.linkedWallets).toEqual([]);
      });

      it('should reject non-UUID wallet IDs', () => {
        const input = {
          type: ActorType.Rider,
          workspaceId: validWorkspaceId,
          roles: [validRoleId1],
          linkedWallets: ['not-a-uuid'],
        };

        expect(() => CreateActorCommandSchema.parse(input)).toThrow(ZodError);
      });

      it('should provide meaningful error message for invalid wallet UUID', () => {
        const input = {
          type: ActorType.Rider,
          workspaceId: validWorkspaceId,
          roles: [validRoleId1],
          linkedWallets: ['invalid-wallet'],
        };

        const result = CreateActorCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          const walletError = result.error.errors.find((e) => e.path[0] === 'linkedWallets');
          expect(walletError?.message).toBe('Each wallet ID must be a valid UUID');
        }
      });
    });
  });

  describe('CreateActorCommand class', () => {
    describe('constructor', () => {
      it('should create command with all fields', () => {
        const input = {
          type: ActorType.Rider,
          workspaceId: validWorkspaceId,
          roles: [validRoleId1, validRoleId2],
          linkedWallets: [validWalletId],
        };

        const command = new CreateActorCommand(input);

        expect(command.type).toBe(ActorType.Rider);
        expect(command.workspaceId).toBe(validWorkspaceId);
        expect(command.roles).toEqual([validRoleId1, validRoleId2]);
        expect(command.linkedWallets).toEqual([validWalletId]);
      });

      it('should default linkedWallets to empty array in constructor', () => {
        const input = {
          type: ActorType.Internal,
          workspaceId: validWorkspaceId,
          roles: [validRoleId1],
          linkedWallets: [],
        };

        const command = new CreateActorCommand(input);

        expect(command.linkedWallets).toEqual([]);
      });
    });

    describe('validate static method', () => {
      it('should return validated input for valid data', () => {
        const input = {
          type: ActorType.Business,
          workspaceId: validWorkspaceId,
          roles: [validRoleId1],
        };

        const result = CreateActorCommand.validate(input);

        expect(result.type).toBe(ActorType.Business);
        expect(result.workspaceId).toBe(validWorkspaceId);
        expect(result.roles).toEqual([validRoleId1]);
        expect(result.linkedWallets).toEqual([]);
      });

      it('should throw ZodError for invalid input', () => {
        const input = {
          type: 'InvalidType',
          workspaceId: 'not-a-uuid',
          roles: [],
        };

        expect(() => CreateActorCommand.validate(input)).toThrow(ZodError);
      });
    });

    describe('safeValidate static method', () => {
      it('should return success result for valid input', () => {
        const input = {
          type: ActorType.AIService,
          workspaceId: validWorkspaceId,
          roles: [validRoleId1],
          linkedWallets: [validWalletId],
        };

        const result = CreateActorCommand.safeValidate(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe(ActorType.AIService);
          expect(result.data.workspaceId).toBe(validWorkspaceId);
          expect(result.data.roles).toEqual([validRoleId1]);
          expect(result.data.linkedWallets).toEqual([validWalletId]);
        }
      });

      it('should return failure result for invalid input', () => {
        const input = {
          type: 'BadType',
          workspaceId: 'invalid',
          roles: ['not-uuid'],
        };

        const result = CreateActorCommand.safeValidate(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(ZodError);
          expect(result.error.errors.length).toBeGreaterThan(0);
        }
      });

      it('should not throw for invalid input', () => {
        const input = {
          type: null,
          workspaceId: undefined,
          roles: 'not-an-array',
        };

        expect(() => CreateActorCommand.safeValidate(input)).not.toThrow();
      });

      it('should return result object with error property on failure', () => {
        const input = {
          type: ActorType.Rider,
          workspaceId: 'bad-uuid',
          roles: [],
        };

        const result = CreateActorCommand.safeValidate(input);

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('error');
        expect(result.success).toBe(false);
      });

      it('should return result object with data property on success', () => {
        const input = {
          type: ActorType.Rider,
          workspaceId: validWorkspaceId,
          roles: [],
        };

        const result = CreateActorCommand.safeValidate(input);

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        expect(result.success).toBe(true);
      });
    });
  });
});
