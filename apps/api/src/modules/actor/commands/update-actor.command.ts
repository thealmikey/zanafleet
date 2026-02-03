import { z } from 'zod';

import { ActorType } from '../dto/actor.enums';

/**
 * Zod validation schema for UpdateActorCommand
 * Ensures type safety and input validation at command level
 */
export const UpdateActorCommandSchema = z.object({
  actorId: z.string().uuid('Actor ID must be a valid UUID'),
  email: z.string().email('Email must be a valid email address').trim().toLowerCase().optional(),
  username: z
    .string()
    .trim()
    .min(1, 'Username cannot be empty')
    .max(255, 'Username must not exceed 255 characters')
    .optional(),
  type: z
    .nativeEnum(ActorType, {
      errorMap: () => ({
        message: `Actor type must be one of: ${Object.values(ActorType).join(', ')}`,
      }),
    })
    .optional(),
  workspaceId: z.string().uuid('Workspace ID must be a valid UUID').nullable().optional(),
});

export type UpdateActorCommandInput = z.infer<typeof UpdateActorCommandSchema>;

/**
 * UpdateActorCommand
 * Command object representing the intent to update an existing actor
 * Part of the command pattern in the event-driven architecture
 */
export class UpdateActorCommand {
  readonly actorId: string;
  readonly email?: string;
  readonly username?: string;
  readonly type?: ActorType;
  readonly workspaceId?: string | null;

  constructor(input: UpdateActorCommandInput) {
    this.actorId = input.actorId;
    this.email = input.email;
    this.username = input.username;
    this.type = input.type;
    this.workspaceId = input.workspaceId;
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
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, UpdateActorCommandInput> {
    return UpdateActorCommandSchema.safeParse(input);
  }
}
