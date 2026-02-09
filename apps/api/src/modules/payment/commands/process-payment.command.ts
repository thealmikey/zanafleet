import { z } from 'zod';

/**
 * Zod schema for ProcessPaymentCommand validation
 */
export const ProcessPaymentCommandSchema = z.object({
  paymentIntentId: z.string().uuid(),
  correlationId: z.string().uuid().optional(),
});

export type ProcessPaymentCommandInput = z.infer<typeof ProcessPaymentCommandSchema>;

/**
 * ProcessPaymentCommand
 * Command object representing the intent to execute a payment via provider
 */
export class ProcessPaymentCommand {
  readonly paymentIntentId: string;
  readonly correlationId?: string;

  constructor(input: ProcessPaymentCommandInput) {
    this.paymentIntentId = input.paymentIntentId;
    this.correlationId = input.correlationId;
  }

  static validate(input: unknown): ProcessPaymentCommandInput {
    return ProcessPaymentCommandSchema.parse(input);
  }

  static safeValidate(
    input: unknown,
  ): z.SafeParseReturnType<unknown, ProcessPaymentCommandInput> {
    return ProcessPaymentCommandSchema.safeParse(input);
  }
}
