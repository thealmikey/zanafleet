import { z } from 'zod';
import { AccountType } from '../dto/account.enums';

/**
 * Zod schema for CreateAccountCommand validation
 */
export const CreateAccountCommandSchema = z.object({
  externalId: z.string().uuid(),
  accountType: z.nativeEnum(AccountType),
  currency: z.string().length(3),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Inferred type from Zod schema
 */
export type CreateAccountCommandInput = z.infer<typeof CreateAccountCommandSchema>;

/**
 * CreateAccountCommand
 * Command object representing the intent to create a new account
 * Part of the command pattern in the event-driven architecture
 */
export class CreateAccountCommand {
  readonly externalId: string;
  readonly accountType: AccountType;
  readonly currency: string;
  readonly metadata?: Record<string, unknown>;

  constructor(input: CreateAccountCommandInput) {
    this.externalId = input.externalId;
    this.accountType = input.accountType;
    this.currency = input.currency;
    this.metadata = input.metadata;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateAccountCommandInput {
    return CreateAccountCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, CreateAccountCommandInput> {
    return CreateAccountCommandSchema.safeParse(input);
  }
}
