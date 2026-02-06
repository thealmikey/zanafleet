import { z } from 'zod';

/**
 * Zod schema for UpdateActorCommand validation
 */
export const UpdateActorCommandSchema = z.object({
  actorId: z.string().uuid(),
  roles: z.array(z.string()).optional(),
  linkedWallets: z.array(z.string()).optional(),
});

export type UpdateActorCommandInput = z.infer<typeof UpdateActorCommandSchema>;

/**
 * UpdateActorCommand
 * Command representing the intent to update an actor.
 */
export class UpdateActorCommand {
  readonly actorId: string;
  readonly roles?: string[];
  readonly linkedWallets?: string[];

  constructor(input: UpdateActorCommandInput) {
    this.actorId = input.actorId;
    this.roles = input.roles;
    this.linkedWallets = input.linkedWallets;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): UpdateActorCommandInput {
    return UpdateActorCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown) {
    return UpdateActorCommandSchema.safeParse(input);
  }
}
