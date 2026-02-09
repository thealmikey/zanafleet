import { z } from 'zod';

import { IncentiveType, FundingSource } from '../dto/incentive.enums';

/**
 * Zod schema for CreateCampaignCommand validation
 */
export const CreateCampaignCommandSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  incentiveType: z.nativeEnum(IncentiveType),
  fundingSource: z.nativeEnum(FundingSource),
  sponsorAccountId: z.string().uuid().optional(),
  discountValue: z.number().positive(),
  maxDiscountAmount: z.number().positive().optional(),
  budgetTotal: z.number().positive(),
  usageLimit: z.number().int().positive().optional(),
  eligibilityRules: z.record(z.unknown()).optional(),
  validFrom: z.date(),
  validUntil: z.date(),
  metadata: z.record(z.unknown()).optional(),
}).refine(
  (data) => data.validUntil > data.validFrom,
  { message: 'validUntil must be after validFrom' },
).refine(
  (data) => {
    if (data.fundingSource !== FundingSource.PLATFORM && !data.sponsorAccountId) {
      return false;
    }
    return true;
  },
  { message: 'sponsorAccountId is required for non-platform funding sources' },
);

export type CreateCampaignCommandInput = z.infer<typeof CreateCampaignCommandSchema>;

/**
 * CreateCampaignCommand
 * Command object representing the intent to create a new incentive campaign
 */
export class CreateCampaignCommand {
  readonly name: string;
  readonly description?: string;
  readonly incentiveType: IncentiveType;
  readonly fundingSource: FundingSource;
  readonly sponsorAccountId?: string;
  readonly discountValue: number;
  readonly maxDiscountAmount?: number;
  readonly budgetTotal: number;
  readonly usageLimit?: number;
  readonly eligibilityRules?: Record<string, unknown>;
  readonly validFrom: Date;
  readonly validUntil: Date;
  readonly metadata?: Record<string, unknown>;

  constructor(input: CreateCampaignCommandInput) {
    this.name = input.name;
    this.description = input.description;
    this.incentiveType = input.incentiveType;
    this.fundingSource = input.fundingSource;
    this.sponsorAccountId = input.sponsorAccountId;
    this.discountValue = input.discountValue;
    this.maxDiscountAmount = input.maxDiscountAmount;
    this.budgetTotal = input.budgetTotal;
    this.usageLimit = input.usageLimit;
    this.eligibilityRules = input.eligibilityRules;
    this.validFrom = input.validFrom;
    this.validUntil = input.validUntil;
    this.metadata = input.metadata;
  }

  static validate(input: unknown): CreateCampaignCommandInput {
    return CreateCampaignCommandSchema.parse(input);
  }

  static safeValidate(
    input: unknown,
  ): z.SafeParseReturnType<unknown, CreateCampaignCommandInput> {
    return CreateCampaignCommandSchema.safeParse(input);
  }
}
