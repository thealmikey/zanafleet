import { z } from 'zod';

import { MembershipRole } from '../dto/workspace.enums';

/**
 * Zod validation schema for AddActorToWorkspaceCommand
 * Ensures type safety and input validation at command level
 */
export const AddActorToWorkspaceCommandSchema = z.object({
  actorId: z.string().uuid('Actor ID must be a valid UUID'),
  workspaceId: z.string().uuid('Workspace ID must be a valid UUID'),
  role: z.nativeEnum(MembershipRole, {
    errorMap: () => ({ message: 'Role must be a valid MembershipRole' }),
  }),
});

export type AddActorToWorkspaceCommandInput = z.infer<typeof AddActorToWorkspaceCommandSchema>;
export type AddActorToWorkspaceCommandRawInput = z.input<typeof AddActorToWorkspaceCommandSchema>;

/**
 * AddActorToWorkspaceCommand
 * Command object representing the intent to add an actor to a workspace
 * Part of the command pattern in the event-driven architecture
 */
export class AddActorToWorkspaceCommand {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly role: MembershipRole;

  constructor(input: AddActorToWorkspaceCommandRawInput) {
    this.actorId = input.actorId;
    this.workspaceId = input.workspaceId;
    this.role = input.role;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): AddActorToWorkspaceCommandInput {
    return AddActorToWorkspaceCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown) {
    return AddActorToWorkspaceCommandSchema.safeParse(input);
  }
}
