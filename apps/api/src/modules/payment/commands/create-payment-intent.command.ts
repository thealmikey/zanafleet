import { z } from 'zod';

import { PaymentFlowType, PaymentMethod } from '../dto/payment.enums';

/**
 * Zod schema for CreatePaymentIntentCommand validation
 */
export const CreatePaymentIntentCommandSchema = z.object({
  payerAccountId: z.string().uuid(),
  payeeAccountId: z.string().uuid(),
  flowType: z.nativeEnum(PaymentFlowType),
  amount: z.number().positive(),
  currency: z.string().length(3),
  paymentMethod: z.nativeEnum(PaymentMethod),
  providerId: z.string().min(1).max(50),
  invoiceId: z.string().uuid().optional(),
  idempotencyKey: z.string().min(1).max(128),
  metadata: z.record(z.unknown()).optional(),
  expiresAt: z.date().optional(),
});

export type CreatePaymentIntentCommandInput = z.infer<typeof CreatePaymentIntentCommandSchema>;

/**
 * CreatePaymentIntentCommand
 * Command object representing the intent to create a new payment intent
 * Supports idempotency via idempotencyKey
 */
export class CreatePaymentIntentCommand {
  readonly payerAccountId: string;
  readonly payeeAccountId: string;
  readonly flowType: PaymentFlowType;
  readonly amount: number;
  readonly currency: string;
  readonly paymentMethod: PaymentMethod;
  readonly providerId: string;
  readonly invoiceId?: string;
  readonly idempotencyKey: string;
  readonly metadata?: Record<string, unknown>;
  readonly expiresAt?: Date;

  constructor(input: CreatePaymentIntentCommandInput) {
    this.payerAccountId = input.payerAccountId;
    this.payeeAccountId = input.payeeAccountId;
    this.flowType = input.flowType;
    this.amount = input.amount;
    this.currency = input.currency;
    this.paymentMethod = input.paymentMethod;
    this.providerId = input.providerId;
    this.invoiceId = input.invoiceId;
    this.idempotencyKey = input.idempotencyKey;
    this.metadata = input.metadata;
    this.expiresAt = input.expiresAt;
  }

  static validate(input: unknown): CreatePaymentIntentCommandInput {
    return CreatePaymentIntentCommandSchema.parse(input);
  }

  static safeValidate(
    input: unknown
  ): z.SafeParseReturnType<unknown, CreatePaymentIntentCommandInput> {
    return CreatePaymentIntentCommandSchema.safeParse(input);
  }
}
