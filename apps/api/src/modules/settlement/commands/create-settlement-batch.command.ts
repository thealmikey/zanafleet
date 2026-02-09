import { z } from 'zod';
import { PayoutMethod } from '../dto/settlement.enums';

/**
 * Zod schema for CreateSettlementBatchCommand validation
 */
export const CreateSettlementBatchCommandSchema = z.object({
  riderAccountId: z.string().uuid(),
  periodStart: z.date(),
  periodEnd: z.date(),
  payoutMethod: z.nativeEnum(PayoutMethod),
  commissionRate: z.number().min(0).max(1).default(0.15),
  correlationId: z.string().uuid().optional(),
});

export type CreateSettlementBatchCommandInput = z.infer<typeof CreateSettlementBatchCommandSchema>;

/**
 * CreateSettlementBatchCommand
 * Command object representing the intent to create a settlement batch
 * Aggregates unsettled earnings for a rider within a date range
 */
export class CreateSettlementBatchCommand {
  readonly riderAccountId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly payoutMethod: PayoutMethod;
  readonly commissionRate: number;
  readonly correlationId?: string;

  constructor(input: CreateSettlementBatchCommandInput) {
    this.riderAccountId = input.riderAccountId;
    this.periodStart = input.periodStart;
    this.periodEnd = input.periodEnd;
    this.payoutMethod = input.payoutMethod;
    this.commissionRate = input.commissionRate ?? 0.15;
    this.correlationId = input.correlationId;
  }

  static validate(input: unknown): CreateSettlementBatchCommandInput {
    return CreateSettlementBatchCommandSchema.parse(input);
  }

  static safeValidate(
    input: unknown,
  ): z.SafeParseReturnType<unknown, CreateSettlementBatchCommandInput> {
    return CreateSettlementBatchCommandSchema.safeParse(input);
  }
}
