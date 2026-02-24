import { ActorType } from '@api/modules/actor/dto/actor.enums';
import { z } from 'zod';

/**
 * InitiateSignUpCommandSchema
 * Zod schema for validating InitiateSignUpCommand input
 */
export const InitiateSignUpCommandSchema = z.object({
  actorType: z.nativeEnum(ActorType),
  idempotencyKey: z.string().optional().nullable(),
});

/**
 * InitiateSignUpCommandInput
 * Type derived from the Zod schema for validated input
 */
export type InitiateSignUpCommandInput = z.infer<typeof InitiateSignUpCommandSchema>;

/**
 * InitiateSignUpCommand
 *
 * Command representing the intent to initiate a new sign-up session.
 * Part of the CQRS pattern for state changes.
 */
export class InitiateSignUpCommand {
  readonly actorType: ActorType;
  readonly idempotencyKey?: string | null;

  constructor(input: InitiateSignUpCommandInput) {
    this.actorType = input.actorType;
    this.idempotencyKey = input.idempotencyKey;
  }

  /**
   * Validates input using Zod schema
   * @param input Raw input object
   * @returns Validated InitiateSignUpCommandInput
   * @throws ZodError if validation fails
   */
  static validate(input: unknown): InitiateSignUpCommandInput {
    return InitiateSignUpCommandSchema.parse(input);
  }

  /**
   * Safe validation that returns a result object instead of throwing
   * @param input Raw input object
   * @returns Zod safe parse result
   */
  static safeValidate(input: unknown) {
    return InitiateSignUpCommandSchema.safeParse(input);
  }
}
