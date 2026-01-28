import { z, type SafeParseReturnType } from 'zod';

export const GrantCapabilityToPersonaCommandSchema = z.object({
  personaId: z
    .string({ required_error: 'Persona ID is required' })
    .trim()
    .uuid('Persona ID must be a valid UUID'),
  capabilityId: z
    .string({ required_error: 'Capability ID is required' })
    .trim()
    .uuid('Capability ID must be a valid UUID'),
});

export type GrantCapabilityToPersonaCommandInput = z.infer<
  typeof GrantCapabilityToPersonaCommandSchema
>;
export type GrantCapabilityToPersonaCommandRawInput = z.input<
  typeof GrantCapabilityToPersonaCommandSchema
>;
export type GrantCapabilityToPersonaCommandSafeParseResult = SafeParseReturnType<
  GrantCapabilityToPersonaCommandRawInput,
  GrantCapabilityToPersonaCommandInput
>;

export class GrantCapabilityToPersonaCommand {
  readonly personaId: string;
  readonly capabilityId: string;

  constructor(input: GrantCapabilityToPersonaCommandRawInput) {
    const parsed = GrantCapabilityToPersonaCommand.validate(input);
    this.personaId = parsed.personaId;
    this.capabilityId = parsed.capabilityId;
  }

  static validate(input: unknown): GrantCapabilityToPersonaCommandInput {
    return GrantCapabilityToPersonaCommandSchema.parse(input);
  }

  static safeValidate(
    input: unknown,
  ): GrantCapabilityToPersonaCommandSafeParseResult {
    return GrantCapabilityToPersonaCommandSchema.safeParse(input);
  }
}
