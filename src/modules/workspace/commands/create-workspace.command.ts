import { z } from 'zod';

import { WorkspaceStatus, WorkspaceType } from '../dto/workspace.enums';

/**
 * Zod validation schema for CreateWorkspaceCommand
 * Ensures type safety and input validation at command level
 */
export const CreateWorkspaceCommandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Workspace name is required')
    .max(255, 'Workspace name must not exceed 255 characters'),
  orgId: z
    .string()
    .uuid('Organization ID must be a valid UUID'),
  type: z.nativeEnum(WorkspaceType, {
    errorMap: () => ({ message: 'Workspace type is required' }),
  }),
  status: z
    .nativeEnum(WorkspaceStatus)
    .optional()
    .default(WorkspaceStatus.ACTIVE),
  roleTemplates: z
    .array(z.string().uuid('Each role template ID must be a valid UUID'))
    .optional()
    .default([]),
});

export type CreateWorkspaceCommandInput = z.infer<typeof CreateWorkspaceCommandSchema>;
export type CreateWorkspaceCommandRawInput = z.input<typeof CreateWorkspaceCommandSchema>;

/**
 * CreateWorkspaceCommand
 * Command object representing the intent to create a new workspace
 * Part of the command pattern in the event-driven architecture
 */
export class CreateWorkspaceCommand {
  readonly name: string;
  readonly orgId: string;
  readonly type: WorkspaceType;
  readonly status: WorkspaceStatus;
  readonly roleTemplates: string[];

  constructor(input: CreateWorkspaceCommandRawInput) {
    this.name = input.name;
    this.orgId = input.orgId;
    this.type = input.type;
    this.status = input.status ?? WorkspaceStatus.ACTIVE;
    this.roleTemplates = input.roleTemplates ?? [];
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateWorkspaceCommandInput {
    return CreateWorkspaceCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown) {
    return CreateWorkspaceCommandSchema.safeParse(input);
  }
}
