import { z, type SafeParseReturnType } from 'zod';

export const CAPABILITY_NAME_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

export const CreateCapabilityCommandSchema = z.object({
  name: z
    .string({ required_error: 'Capability name is required' })
    .trim()
    .min(1, 'Capability name is required')
    .max(255, 'Capability name must not exceed 255 characters')
    .regex(
      CAPABILITY_NAME_PATTERN,
      'Capability name must use snake_case (lowercase letters, numbers, and underscores only)'
    ),
});

export type CreateCapabilityCommandInput = z.infer<typeof CreateCapabilityCommandSchema>;
export type CreateCapabilityCommandRawInput = z.input<typeof CreateCapabilityCommandSchema>;
export type CreateCapabilityCommandSafeParseResult = SafeParseReturnType<
  CreateCapabilityCommandRawInput,
  CreateCapabilityCommandInput
>;

export class CreateCapabilityCommand {
  readonly name: string;

  constructor(input: CreateCapabilityCommandRawInput) {
    const parsed = CreateCapabilityCommand.validate(input);
    this.name = parsed.name;
  }

  static validate(input: unknown): CreateCapabilityCommandInput {
    return CreateCapabilityCommandSchema.parse(input);
  }

  static safeValidate(input: unknown): CreateCapabilityCommandSafeParseResult {
    return CreateCapabilityCommandSchema.safeParse(input);
  }
}
