import { z } from 'zod';

/**
 * Zod validation schema for DebitWalletCommand
 * Ensures type safety and input validation at command level
 */
export const DebitWalletCommandSchema = z.object({
  walletId: z.string().uuid('Wallet ID must be a valid UUID'),
  amount: z
    .number()
    .positive('Amount must be a positive number')
    .finite('Amount must be a finite number'),
  reference: z.string().optional(),
});

export type DebitWalletCommandInput = z.infer<typeof DebitWalletCommandSchema>;

/**
 * DebitWalletCommand
 * Command object representing the intent to debit (withdraw funds from) a wallet
 * Part of the command pattern in the event-driven architecture
 */
export class DebitWalletCommand {
  readonly walletId: string;
  readonly amount: number;
  readonly reference?: string;

  constructor(input: DebitWalletCommandInput) {
    this.walletId = input.walletId;
    this.amount = input.amount;
    this.reference = input.reference;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): DebitWalletCommandInput {
    return DebitWalletCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, DebitWalletCommandInput> {
    return DebitWalletCommandSchema.safeParse(input);
  }
}
