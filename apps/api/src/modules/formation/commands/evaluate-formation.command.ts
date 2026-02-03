import { z } from 'zod';

export const EvaluateFormationCommandSchema = z.object({
  entityType: z.string().trim().min(1, 'Entity type is required'),
  entityId: z.string().uuid('Entity ID must be a valid UUID'),
});

export type EvaluateFormationCommandInput = z.infer<typeof EvaluateFormationCommandSchema>;
export type EvaluateFormationCommandRawInput = z.input<typeof EvaluateFormationCommandSchema>;

export class EvaluateFormationCommand {
  readonly entityType: string;
  readonly entityId: string;

  constructor(input: EvaluateFormationCommandRawInput) {
    this.entityType = input.entityType;
    this.entityId = input.entityId;
  }

  static validate(input: unknown): EvaluateFormationCommandInput {
    return EvaluateFormationCommandSchema.parse(input);
  }

  static safeValidate(input: unknown) {
    return EvaluateFormationCommandSchema.safeParse(input);
  }
}
