import { z } from 'zod';

import { CreateRoleCommand, CreateRoleCommandSchema } from '../../commands/create-role.command';
import { RoleScope } from '../../dto/role.enums';

/**
 * Unit Tests: CreateRoleCommand Zod Validation
 *
 * Tests the Zod schema validation for CreateRoleCommand.
 * Covers:
 * - Valid inputs with all fields
 * - Required field validation (name, scope)
 * - Optional field defaults (permissions)
 * - String length constraints
 * - Enum validation for scope
 * - Static validate() and safeValidate() methods
 */
describe('CreateRoleCommand Unit Tests', () => {
  describe('CreateRoleCommandSchema', () => {
    describe('Valid Inputs', () => {
      it('should validate a complete valid input', () => {
        const input = {
          name: 'Admin',
          permissions: ['read', 'write', 'delete'],
          scope: RoleScope.Organization,
        };

        const result = CreateRoleCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('Admin');
          expect(result.data.permissions).toEqual(['read', 'write', 'delete']);
          expect(result.data.scope).toBe(RoleScope.Organization);
        }
      });

      it('should validate input with empty permissions array', () => {
        const input = {
          name: 'Viewer',
          permissions: [],
          scope: RoleScope.Workspace,
        };

        const result = CreateRoleCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.permissions).toEqual([]);
        }
      });

      it('should default permissions to empty array when omitted', () => {
        const input = {
          name: 'Guest',
          scope: RoleScope.Actor,
        };

        const result = CreateRoleCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.permissions).toEqual([]);
        }
      });

      it('should trim whitespace from name', () => {
        const input = {
          name: '  Trimmed Role  ',
          scope: RoleScope.Organization,
        };

        const result = CreateRoleCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('Trimmed Role');
        }
      });

      it('should accept all valid scope values', () => {
        const scopes = [RoleScope.Organization, RoleScope.Workspace, RoleScope.Actor];

        scopes.forEach((scope) => {
          const input = { name: 'Test Role', scope };
          const result = CreateRoleCommandSchema.safeParse(input);
          expect(result.success).toBe(true);
        });
      });

      it('should accept name at maximum length (255 chars)', () => {
        const input = {
          name: 'A'.repeat(255),
          scope: RoleScope.Organization,
        };

        const result = CreateRoleCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe('Invalid Inputs', () => {
      it('should reject missing name', () => {
        const input = {
          scope: RoleScope.Organization,
        };

        const result = CreateRoleCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('name');
        }
      });

      it('should reject empty name', () => {
        const input = {
          name: '',
          scope: RoleScope.Organization,
        };

        const result = CreateRoleCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Role name is required');
        }
      });

      it('should reject whitespace-only name', () => {
        const input = {
          name: '   ',
          scope: RoleScope.Organization,
        };

        const result = CreateRoleCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Role name is required');
        }
      });

      it('should reject name exceeding 255 characters', () => {
        const input = {
          name: 'A'.repeat(256),
          scope: RoleScope.Organization,
        };

        const result = CreateRoleCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            'Role name must not exceed 255 characters',
          );
        }
      });

      it('should reject missing scope', () => {
        const input = {
          name: 'Admin',
        };

        const result = CreateRoleCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('scope');
        }
      });

      it('should reject invalid scope value', () => {
        const input = {
          name: 'Admin',
          scope: 'InvalidScope',
        };

        const result = CreateRoleCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Role scope must be one of');
        }
      });

      it('should reject permissions with empty strings', () => {
        const input = {
          name: 'Admin',
          permissions: ['read', '', 'write'],
          scope: RoleScope.Organization,
        };

        const result = CreateRoleCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Permission cannot be empty');
        }
      });

      it('should reject non-string permissions', () => {
        const input = {
          name: 'Admin',
          permissions: [123, 'read'],
          scope: RoleScope.Organization,
        };

        const result = CreateRoleCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });
  });

  describe('CreateRoleCommand Class', () => {
    describe('Constructor', () => {
      it('should create command with all fields', () => {
        const input = {
          name: 'Admin',
          permissions: ['read', 'write'],
          scope: RoleScope.Organization,
        };

        const command = new CreateRoleCommand(input);

        expect(command.name).toBe('Admin');
        expect(command.permissions).toEqual(['read', 'write']);
        expect(command.scope).toBe(RoleScope.Organization);
      });

      it('should default permissions to empty array', () => {
        const input = {
          name: 'Viewer',
          scope: RoleScope.Workspace,
        };

        const command = new CreateRoleCommand(input as any);

        expect(command.permissions).toEqual([]);
      });
    });

    describe('Static validate()', () => {
      it('should return validated data for valid input', () => {
        const input = {
          name: 'Manager',
          permissions: ['read'],
          scope: RoleScope.Actor,
        };

        const result = CreateRoleCommand.validate(input);

        expect(result.name).toBe('Manager');
        expect(result.permissions).toEqual(['read']);
        expect(result.scope).toBe(RoleScope.Actor);
      });

      it('should throw ZodError for invalid input', () => {
        const input = {
          name: '',
          scope: RoleScope.Organization,
        };

        expect(() => CreateRoleCommand.validate(input)).toThrow(z.ZodError);
      });
    });

    describe('Static safeValidate()', () => {
      it('should return success result for valid input', () => {
        const input = {
          name: 'Editor',
          scope: RoleScope.Workspace,
        };

        const result = CreateRoleCommand.safeValidate(input);

        expect(result.success).toBe(true);
      });

      it('should return error result for invalid input', () => {
        const input = {
          name: 'Test',
          scope: 'invalid',
        };

        const result = CreateRoleCommand.safeValidate(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(z.ZodError);
        }
      });
    });
  });
});
