import { z } from 'zod';

/**
 * Zod validation schema for RemoveActorFromWorkspaceCommand
 * Ensures type safety and input validation at command level
 */
export const RemoveActorFromWorkspaceCommandSchema = z.object({
  actorId: z.string().uuid('Actor ID must be a valid UUID'),
  workspaceId: z.string().uuid('Workspace ID must be a valid UUID'),
});

export type RemoveActorFromWorkspaceCommandInput = z.infer<
  typeof RemoveActorFromWorkspaceCommandSchema
>;
export type RemoveActorFromWorkspaceCommandRawInput = z.input<
  typeof RemoveActorFromWorkspaceCommandSchema
>;

/**
 * RemoveActorFromWorkspaceCommand
 * Command object representing the intent to remove an actor from a workspace
 * Part of the command pattern in the event-driven architecture
 */
export class RemoveActorFromWorkspaceCommand {
  readonly actorId: string;
  readonly workspaceId: string;

  constructor(input: RemoveActorFromWorkspaceCommandRawInput) {
    this.actorId = input.actorId;
    this.workspaceId = input.workspaceId;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): RemoveActorFromWorkspaceCommandInput {
    return RemoveActorFromWorkspaceCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown) {
    return RemoveActorFromWorkspaceCommandSchema.safeParse(input);
  }
}
