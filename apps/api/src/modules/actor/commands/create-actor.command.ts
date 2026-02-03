import { z } from 'zod';

import { ActorType } from '../dto/actor.enums';

/**
 * Zod validation schema for CreateActorCommand
 * Ensures type safety and input validation at command level
 */
export const CreateActorCommandSchema = z.object({
  email: z.string().email('Email must be a valid email address').trim().toLowerCase(),
  username: z
    .string()
    .trim()
    .min(1, 'Username is required')
    .max(255, 'Username must not exceed 255 characters'),
  type: z.nativeEnum(ActorType, {
    errorMap: () => ({
      message: `Actor type must be one of: ${Object.values(ActorType).join(', ')}`,
    }),
  }),
  workspaceId: z.string().uuid('Workspace ID must be a valid UUID').nullable().optional(),
});

export type CreateActorCommandInput = z.infer<typeof CreateActorCommandSchema>;

/**
 * CreateActorCommand
 * Command object representing the intent to create a new actor
 * Part of the command pattern in the event-driven architecture
 */
export class CreateActorCommand {
  readonly email: string;
  readonly username: string;
  readonly type: ActorType;
  readonly workspaceId: string | null;

  constructor(input: CreateActorCommandInput) {
    this.email = input.email;
    this.username = input.username;
    this.type = input.type;
    this.workspaceId = input.workspaceId ?? null;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateActorCommandInput {
    return CreateActorCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, CreateActorCommandInput> {
    return CreateActorCommandSchema.safeParse(input);
  }
}
