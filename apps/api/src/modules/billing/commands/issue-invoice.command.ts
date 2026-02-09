import { PaymentMethod } from '@api/modules/payment';
import { z } from 'zod';

/**
 * Zod schema for IssueInvoiceCommand validation
 */
export const IssueInvoiceCommandSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  providerId: z.string().min(1).max(50),
  correlationId: z.string().uuid().optional(),
});

export type IssueInvoiceCommandInput = z.infer<typeof IssueInvoiceCommandSchema>;

/**
 * IssueInvoiceCommand
 * Command object representing the intent to issue a draft invoice
 * Transitions invoice from DRAFT to ISSUED and triggers PaymentIntent creation
 */
export class IssueInvoiceCommand {
  readonly invoiceId: string;
  readonly paymentMethod: PaymentMethod;
  readonly providerId: string;
  readonly correlationId?: string;

  constructor(input: IssueInvoiceCommandInput) {
    this.invoiceId = input.invoiceId;
    this.paymentMethod = input.paymentMethod;
    this.providerId = input.providerId;
    this.correlationId = input.correlationId;
  }

  static validate(input: unknown): IssueInvoiceCommandInput {
    return IssueInvoiceCommandSchema.parse(input);
  }

  static safeValidate(
    input: unknown,
  ): z.SafeParseReturnType<unknown, IssueInvoiceCommandInput> {
    return IssueInvoiceCommandSchema.safeParse(input);
  }
}
