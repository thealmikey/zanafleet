import { z } from 'zod';

import { WorkspaceStatus } from '../dto/workspace.enums';

/**
 * Zod schema for UpdateWorkspaceCommand validation
 */
export const UpdateWorkspaceCommandSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().optional(),
  status: z.nativeEnum(WorkspaceStatus).optional(),
  roleTemplates: z.array(z.string()).optional(),
});

export type UpdateWorkspaceCommandInput = z.infer<typeof UpdateWorkspaceCommandSchema>;

/**
 * UpdateWorkspaceCommand
 * Command representing the intent to update a workspace.
 */
export class UpdateWorkspaceCommand {
  readonly workspaceId: string;
  readonly name?: string;
  readonly status?: WorkspaceStatus;
  readonly roleTemplates?: string[];

  constructor(input: UpdateWorkspaceCommandInput) {
    this.workspaceId = input.workspaceId;
    this.name = input.name;
    this.status = input.status;
    this.roleTemplates = input.roleTemplates;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): UpdateWorkspaceCommandInput {
    return UpdateWorkspaceCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown) {
    return UpdateWorkspaceCommandSchema.safeParse(input);
  }
}
