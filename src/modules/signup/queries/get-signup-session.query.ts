import { z } from 'zod';

/**
 * GetSignUpSessionQuerySchema
 * Zod schema for validating GetSignUpSessionQuery input
 */
export const GetSignUpSessionQuerySchema = z.object({
  sessionId: z.string().uuid(),
});

export type GetSignUpSessionQueryInput = z.infer<typeof GetSignUpSessionQuerySchema>;

/**
 * GetSignUpSessionQuery
 *
 * Query for retrieving a sign-up session by ID.
 * Part of the CQRS pattern - separates read concerns from commands.
 */
export class GetSignUpSessionQuery {
  readonly sessionId: string;

  constructor(input: GetSignUpSessionQueryInput) {
    this.sessionId = input.sessionId;
  }

  static validate(input: unknown): GetSignUpSessionQueryInput {
    return GetSignUpSessionQuerySchema.parse(input);
  }

  static safeValidate(input: unknown) {
    return GetSignUpSessionQuerySchema.safeParse(input);
  }
}
