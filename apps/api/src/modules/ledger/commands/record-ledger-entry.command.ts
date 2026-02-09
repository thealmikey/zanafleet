import { z } from 'zod';
import { LedgerEntryType, LedgerCategory, LedgerReferenceType } from '../dto/ledger.enums';

/**
 * Schema for individual ledger entry within a double-entry transaction
 */
const LedgerEntrySchema = z.object({
  accountId: z.string().uuid(),
  entryType: z.nativeEnum(LedgerEntryType),
  category: z.nativeEnum(LedgerCategory),
  amount: z.number().positive(),
  currency: z.string().length(3),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for RecordLedgerEntryCommand validation
 * Enforces double-entry bookkeeping: total debits must equal total credits
 */
export const RecordLedgerEntryCommandSchema = z.object({
  referenceType: z.nativeEnum(LedgerReferenceType),
  referenceId: z.string().uuid(),
  entries: z
    .array(LedgerEntrySchema)
    .min(2)
    .refine(
      (entries) => {
        const totalDebit = entries
          .filter((e) => e.entryType === LedgerEntryType.DEBIT)
          .reduce((sum, e) => sum + e.amount, 0);
        const totalCredit = entries
          .filter((e) => e.entryType === LedgerEntryType.CREDIT)
          .reduce((sum, e) => sum + e.amount, 0);
        return Math.abs(totalDebit - totalCredit) < 0.01;
      },
      { message: 'Total debits must equal total credits for double-entry bookkeeping' },
    ),
  correlationId: z.string().uuid().optional(),
});

export type LedgerEntryInput = z.infer<typeof LedgerEntrySchema>;
export type RecordLedgerEntryCommandInput = z.infer<typeof RecordLedgerEntryCommandSchema>;

/**
 * RecordLedgerEntryCommand
 * Command object representing the intent to record balanced ledger entries
 * Enforces double-entry bookkeeping through Zod validation
 */
export class RecordLedgerEntryCommand {
  readonly referenceType: LedgerReferenceType;
  readonly referenceId: string;
  readonly entries: LedgerEntryInput[];
  readonly correlationId?: string;

  constructor(input: RecordLedgerEntryCommandInput) {
    this.referenceType = input.referenceType;
    this.referenceId = input.referenceId;
    this.entries = input.entries;
    this.correlationId = input.correlationId;
  }

  static validate(input: unknown): RecordLedgerEntryCommandInput {
    return RecordLedgerEntryCommandSchema.parse(input);
  }

  static safeValidate(
    input: unknown,
  ): z.SafeParseReturnType<unknown, RecordLedgerEntryCommandInput> {
    return RecordLedgerEntryCommandSchema.safeParse(input);
  }
}
