import { z } from 'zod';

import { RoleScope } from '../dto/role.enums';

/**
 * Zod validation schema for CreateRoleCommand
 * Ensures type safety and input validation at command level
 */
export const CreateRoleCommandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Role name is required')
    .max(255, 'Role name must not exceed 255 characters'),
  permissions: z.array(z.string().min(1, 'Permission cannot be empty')).optional().default([]),
  scope: z.nativeEnum(RoleScope, {
    errorMap: () => ({
      message: `Role scope must be one of: ${Object.values(RoleScope).join(', ')}`,
    }),
  }),
});

export type CreateRoleCommandInput = z.infer<typeof CreateRoleCommandSchema>;

/**
 * CreateRoleCommand
 * Command object representing the intent to create a new role
 * Part of the command pattern in the event-driven architecture
 */
export class CreateRoleCommand {
  readonly name: string;
  readonly permissions: string[];
  readonly scope: RoleScope;

  constructor(input: CreateRoleCommandInput) {
    this.name = input.name;
    this.permissions = input.permissions || [];
    this.scope = input.scope;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateRoleCommandInput {
    return CreateRoleCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, CreateRoleCommandInput> {
    return CreateRoleCommandSchema.safeParse(input);
  }
}
