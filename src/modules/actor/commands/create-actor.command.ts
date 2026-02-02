import { z } from 'zod';

import { ActorType } from '../dto/actor.enums';

/**
 * Zod validation schema for CreateActorCommand
 * Ensures type safety and input validation at command level
 */
export const CreateActorCommandSchema = z.object({
  type: z.nativeEnum(ActorType, {
    errorMap: () => ({
      message: `Actor type must be one of: ${Object.values(ActorType).join(', ')}`,
    }),
  }),
  email: z.string().email('Email must be a valid email address'),
  username: z.string().min(1, 'Username must not be empty'),
  passwordHash: z.string().min(1, 'Password hash must not be empty'),
  location: z.string().nullable().optional(),
  workspaceId: z.string().uuid('Workspace ID must be a valid UUID'),
  roles: z.array(z.string().uuid('Each role ID must be a valid UUID')),
  linkedWallets: z
    .array(z.string().uuid('Each wallet ID must be a valid UUID'))
    .optional()
    .default([]),
});

export type CreateActorCommandInput = z.infer<typeof CreateActorCommandSchema>;

/**
 * CreateActorCommand
 * Command object representing the intent to create a new actor
 * Part of the command pattern in the event-driven architecture
 */
export class CreateActorCommand {
  readonly type: ActorType;
  readonly email: string;
  readonly username: string;
  readonly passwordHash: string;
  readonly location: string | null;
  readonly workspaceId: string;
  readonly roles: string[];
  readonly linkedWallets: string[];

  constructor(input: CreateActorCommandInput) {
    this.type = input.type;
    this.email = input.email;
    this.username = input.username;
    this.passwordHash = input.passwordHash;
    this.location = input.location ?? null;
    this.workspaceId = input.workspaceId;
    this.roles = input.roles;
    this.linkedWallets = input.linkedWallets || [];
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
