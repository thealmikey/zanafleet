import { z } from 'zod';

/**
 * Zod schema for ApplyIncentiveCommand validation
 */
export const ApplyIncentiveCommandSchema = z.object({
  campaignId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  beneficiaryAccountId: z.string().uuid(),
  baseAmount: z.number().positive(),
  currency: z.string().length(3),
  deliveryId: z.string().uuid().optional(),
  correlationId: z.string().uuid().optional(),
});

export type ApplyIncentiveCommandInput = z.infer<typeof ApplyIncentiveCommandSchema>;

/**
 * ApplyIncentiveCommand
 * Command object representing the intent to apply an incentive to an invoice
 */
export class ApplyIncentiveCommand {
  readonly campaignId: string;
  readonly invoiceId: string;
  readonly beneficiaryAccountId: string;
  readonly baseAmount: number;
  readonly currency: string;
  readonly deliveryId?: string;
  readonly correlationId?: string;

  constructor(input: ApplyIncentiveCommandInput) {
    this.campaignId = input.campaignId;
    this.invoiceId = input.invoiceId;
    this.beneficiaryAccountId = input.beneficiaryAccountId;
    this.baseAmount = input.baseAmount;
    this.currency = input.currency;
    this.deliveryId = input.deliveryId;
    this.correlationId = input.correlationId;
  }

  static validate(input: unknown): ApplyIncentiveCommandInput {
    return ApplyIncentiveCommandSchema.parse(input);
  }

  static safeValidate(
    input: unknown,
  ): z.SafeParseReturnType<unknown, ApplyIncentiveCommandInput> {
    return ApplyIncentiveCommandSchema.safeParse(input);
  }
}
