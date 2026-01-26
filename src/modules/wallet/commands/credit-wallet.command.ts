import { z } from 'zod';

/**
 * Zod validation schema for CreditWalletCommand
 * Ensures type safety and input validation at command level
 */
export const CreditWalletCommandSchema = z.object({
  walletId: z.string().uuid('Wallet ID must be a valid UUID'),
  amount: z
    .number()
    .positive('Amount must be a positive number')
    .finite('Amount must be a finite number'),
  reference: z.string().optional(),
});

export type CreditWalletCommandInput = z.infer<typeof CreditWalletCommandSchema>;

/**
 * CreditWalletCommand
 * Command object representing the intent to credit (add funds to) a wallet
 * Part of the command pattern in the event-driven architecture
 */
export class CreditWalletCommand {
  readonly walletId: string;
  readonly amount: number;
  readonly reference?: string;

  constructor(input: CreditWalletCommandInput) {
    this.walletId = input.walletId;
    this.amount = input.amount;
    this.reference = input.reference;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreditWalletCommandInput {
    return CreditWalletCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, CreditWalletCommandInput> {
    return CreditWalletCommandSchema.safeParse(input);
  }
}
