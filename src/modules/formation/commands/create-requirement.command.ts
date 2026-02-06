import { z } from 'zod';

import { RequirementType } from '../dto/formation.enums';

export const CreateRequirementCommandSchema = z
  .object({
    entityType: z.string().trim().min(1, 'Entity type is required'),
    entityId: z.string().uuid('Entity ID must be a valid UUID'),
    type: z.nativeEnum(RequirementType, {
      errorMap: () => ({ message: 'Requirement type is required' }),
    }),
    key: z.string().trim().min(1, 'Requirement key is required'),
    description: z.string().trim().min(1, 'Requirement description is required'),
    blocking: z.boolean().optional().default(true),
    targetEntityId: z.string().uuid('Target entity ID must be a valid UUID').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === RequirementType.RELATIONSHIP && !data.targetEntityId) {
      ctx.addIssue({
        path: ['targetEntityId'],
        code: z.ZodIssueCode.custom,
        message: 'Target entity ID is required for relationship requirements',
      });
    }

    if (data.type !== RequirementType.RELATIONSHIP && data.targetEntityId) {
      ctx.addIssue({
        path: ['targetEntityId'],
        code: z.ZodIssueCode.custom,
        message: 'Target entity ID is only allowed for relationship requirements',
      });
    }
  });

export type CreateRequirementCommandInput = z.infer<typeof CreateRequirementCommandSchema>;
export type CreateRequirementCommandRawInput = z.input<typeof CreateRequirementCommandSchema>;

export class CreateRequirementCommand {
  readonly entityType: string;
  readonly entityId: string;
  readonly type: RequirementType;
  readonly key: string;
  readonly description: string;
  readonly blocking: boolean;
  readonly targetEntityId: string | null;

  constructor(input: CreateRequirementCommandRawInput) {
    this.entityType = input.entityType;
    this.entityId = input.entityId;
    this.type = input.type;
    this.key = input.key;
    this.description = input.description;
    this.blocking = input.blocking ?? true;
    this.targetEntityId = input.targetEntityId ?? null;
  }

  static validate(input: unknown): CreateRequirementCommandInput {
    return CreateRequirementCommandSchema.parse(input);
  }

  static safeValidate(input: unknown) {
    return CreateRequirementCommandSchema.safeParse(input);
  }
}
