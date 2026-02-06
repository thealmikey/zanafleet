import { z } from 'zod';

export const SatisfyRequirementCommandSchema = z.object({
  requirementId: z.string().uuid('Requirement ID must be a valid UUID'),
});

export type SatisfyRequirementCommandInput = z.infer<typeof SatisfyRequirementCommandSchema>;
export type SatisfyRequirementCommandRawInput = z.input<typeof SatisfyRequirementCommandSchema>;

export class SatisfyRequirementCommand {
  readonly requirementId: string;

  constructor(input: SatisfyRequirementCommandRawInput) {
    this.requirementId = input.requirementId;
  }

  static validate(input: unknown): SatisfyRequirementCommandInput {
    return SatisfyRequirementCommandSchema.parse(input);
  }

  static safeValidate(input: unknown) {
    return SatisfyRequirementCommandSchema.safeParse(input);
  }
}
