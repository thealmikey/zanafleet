import { z } from 'zod';

/**
 * Zod schema for ProcessPayoutCommand validation
 */
export const ProcessPayoutCommandSchema = z.object({
  batchId: z.string().uuid(),
  providerId: z.string().min(1).max(50),
  correlationId: z.string().uuid().optional(),
});

export type ProcessPayoutCommandInput = z.infer<typeof ProcessPayoutCommandSchema>;

/**
 * ProcessPayoutCommand
 * Command object representing the intent to execute a payout via payment provider
 */
export class ProcessPayoutCommand {
  readonly batchId: string;
  readonly providerId: string;
  readonly correlationId?: string;

  constructor(input: ProcessPayoutCommandInput) {
    this.batchId = input.batchId;
    this.providerId = input.providerId;
    this.correlationId = input.correlationId;
  }

  static validate(input: unknown): ProcessPayoutCommandInput {
    return ProcessPayoutCommandSchema.parse(input);
  }

  static safeValidate(
    input: unknown,
  ): z.SafeParseReturnType<unknown, ProcessPayoutCommandInput> {
    return ProcessPayoutCommandSchema.safeParse(input);
  }
}
