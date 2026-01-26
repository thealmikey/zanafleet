import { z } from 'zod';
import { WalletType, OwnerType } from '../dto/wallet.enums';

/**
 * Zod validation schema for CreateWalletCommand
 * Ensures type safety and input validation at command level
 */
export const CreateWalletCommandSchema = z.object({
  ownerId: z.string().uuid('Owner ID must be a valid UUID'),
  ownerType: z.nativeEnum(OwnerType, {
    errorMap: () => ({
      message: `Owner type must be one of: ${Object.values(OwnerType).join(', ')}`,
    }),
  }),
  type: z.nativeEnum(WalletType, {
    errorMap: () => ({
      message: `Wallet type must be one of: ${Object.values(WalletType).join(', ')}`,
    }),
  }),
  currency: z
    .string()
    .length(3, 'Currency must be exactly 3 characters')
    .toUpperCase(),
});

export type CreateWalletCommandInput = z.infer<typeof CreateWalletCommandSchema>;

/**
 * CreateWalletCommand
 * Command object representing the intent to create a new wallet
 * Part of the command pattern in the event-driven architecture
 */
export class CreateWalletCommand {
  readonly ownerId: string;
  readonly ownerType: OwnerType;
  readonly type: WalletType;
  readonly currency: string;

  constructor(input: CreateWalletCommandInput) {
    this.ownerId = input.ownerId;
    this.ownerType = input.ownerType;
    this.type = input.type;
    this.currency = input.currency;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateWalletCommandInput {
    return CreateWalletCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, CreateWalletCommandInput> {
    return CreateWalletCommandSchema.safeParse(input);
  }
}
