import { z } from 'zod';

/**
 * LoginCommandSchema
 * Zod schema for validating LoginCommand input
 */
export const LoginCommandSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
});

/**
 * LoginCommandInput
 * Type derived from the Zod schema for validated input
 */
export type LoginCommandInput = z.infer<typeof LoginCommandSchema>;

/**
 * LoginCommand
 *
 * Command representing the intent to log in.
 */
export class LoginCommand {
  readonly identifier: string;

  constructor(input: LoginCommandInput) {
    this.identifier = input.identifier;
  }

  /**
   * Validates input using Zod schema
   */
  static validate(input: unknown): LoginCommandInput {
    return LoginCommandSchema.parse(input);
  }

  /**
   * Safe validation that returns a result object
   */
  static safeValidate(input: unknown) {
    return LoginCommandSchema.safeParse(input);
  }
}
