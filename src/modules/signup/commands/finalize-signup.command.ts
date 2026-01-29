import { z } from 'zod';

/**
 * FinalizeSignUpCommandSchema
 * Zod schema for validating FinalizeSignUpCommand input
 */
export const FinalizeSignUpCommandSchema = z.object({
  sessionId: z.string().uuid(),
});

/**
 * FinalizeSignUpCommandInput
 * Type derived from the Zod schema for validated input
 */
export type FinalizeSignUpCommandInput = z.infer<typeof FinalizeSignUpCommandSchema>;

/**
 * FinalizeSignUpCommand
 *
 * Command representing the intent to finalize a sign-up session.
 * Part of the CQRS pattern for state changes.
 */
export class FinalizeSignUpCommand {
  readonly sessionId: string;

  constructor(input: FinalizeSignUpCommandInput) {
    this.sessionId = input.sessionId;
  }

  /**
   * Validates input using Zod schema
   * @param input Raw input object
   * @returns Validated FinalizeSignUpCommandInput
   * @throws ZodError if validation fails
   */
  static validate(input: unknown): FinalizeSignUpCommandInput {
    return FinalizeSignUpCommandSchema.parse(input);
  }

  /**
   * Safe validation that returns a result object instead of throwing
   * @param input Raw input object
   * @returns Zod safe parse result
   */
  static safeValidate(input: unknown) {
    return FinalizeSignUpCommandSchema.safeParse(input);
  }
}
