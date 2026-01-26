import { z } from 'zod';
import { TransactionType } from '../dto/transaction.enums';

/**
 * Zod validation schema for CreateTransactionCommand
 * Ensures type safety and input validation at command level
 */
export const CreateTransactionCommandSchema = z.object({
  sourceWalletId: z.string().uuid('Source wallet ID must be a valid UUID'),
  destinationWalletId: z.string().uuid('Destination wallet ID must be a valid UUID'),
  amount: z
    .number()
    .positive('Amount must be a positive number')
    .finite('Amount must be a finite number'),
  type: z.nativeEnum(TransactionType, {
    errorMap: () => ({
      message: `Transaction type must be one of: ${Object.values(TransactionType).join(', ')}`,
    }),
  }),
  linkedEventId: z.string().uuid('Linked event ID must be a valid UUID').optional(),
});

export type CreateTransactionCommandInput = z.infer<typeof CreateTransactionCommandSchema>;

/**
 * CreateTransactionCommand
 * Command object representing the intent to create a new transaction (fund transfer)
 * Part of the command pattern in the event-driven architecture
 */
export class CreateTransactionCommand {
  readonly sourceWalletId: string;
  readonly destinationWalletId: string;
  readonly amount: number;
  readonly type: TransactionType;
  readonly linkedEventId?: string;

  constructor(input: CreateTransactionCommandInput) {
    this.sourceWalletId = input.sourceWalletId;
    this.destinationWalletId = input.destinationWalletId;
    this.amount = input.amount;
    this.type = input.type;
    this.linkedEventId = input.linkedEventId;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateTransactionCommandInput {
    return CreateTransactionCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, CreateTransactionCommandInput> {
    return CreateTransactionCommandSchema.safeParse(input);
  }
}
