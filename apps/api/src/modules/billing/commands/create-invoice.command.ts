import { z } from 'zod';

import { ChargeType } from '../dto/billing.enums';

/**
 * Schema for individual charge input
 */
const ChargeInputSchema = z.object({
  chargeType: z.nativeEnum(ChargeType),
  description: z.string().max(255).optional(),
  amount: z.number(),
  currency: z.string().length(3),
  quantity: z.number().positive().default(1),
  unitPrice: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for CreateInvoiceCommand validation
 */
export const CreateInvoiceCommandSchema = z.object({
  payerAccountId: z.string().uuid(),
  payeeAccountId: z.string().uuid(),
  deliveryId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  charges: z.array(ChargeInputSchema).min(1),
  currency: z.string().length(3),
  dueDate: z.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ChargeInput = z.infer<typeof ChargeInputSchema>;
export type CreateInvoiceCommandInput = z.infer<typeof CreateInvoiceCommandSchema>;

/**
 * CreateInvoiceCommand
 * Command object representing the intent to create a new invoice with charges
 */
export class CreateInvoiceCommand {
  readonly payerAccountId: string;
  readonly payeeAccountId: string;
  readonly deliveryId?: string;
  readonly orderId?: string;
  readonly charges: ChargeInput[];
  readonly currency: string;
  readonly dueDate?: Date;
  readonly metadata?: Record<string, unknown>;

  constructor(input: CreateInvoiceCommandInput) {
    this.payerAccountId = input.payerAccountId;
    this.payeeAccountId = input.payeeAccountId;
    this.deliveryId = input.deliveryId;
    this.orderId = input.orderId;
    this.charges = input.charges;
    this.currency = input.currency;
    this.dueDate = input.dueDate;
    this.metadata = input.metadata;
  }

  static validate(input: unknown): CreateInvoiceCommandInput {
    return CreateInvoiceCommandSchema.parse(input);
  }

  static safeValidate(
    input: unknown,
  ): z.SafeParseReturnType<unknown, CreateInvoiceCommandInput> {
    return CreateInvoiceCommandSchema.safeParse(input);
  }
}
