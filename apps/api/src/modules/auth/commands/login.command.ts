import { z } from 'zod';

/**
 * Zod validation schema for LoginCommand
 * Ensures type safety and input validation at command level
 */
export const LoginCommandSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Identifier is required'),
  password: z
    .string()
    .optional(),
});

export type LoginCommandInput = z.infer<typeof LoginCommandSchema>;

/**
 * LoginCommand
 * Command object representing the intent to authenticate an actor
 * Part of the command pattern in the event-driven architecture
 */
export class LoginCommand {
  readonly identifier: string;
  readonly password: string | undefined;

  constructor(input: LoginCommandInput) {
    this.identifier = input.identifier;
    this.password = input.password;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): LoginCommandInput {
    return LoginCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, LoginCommandInput> {
    return LoginCommandSchema.safeParse(input);
  }
}
