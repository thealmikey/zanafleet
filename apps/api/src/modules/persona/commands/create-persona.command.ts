import { z } from 'zod';

export const CreatePersonaCommandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Persona name is required')
    .max(255, 'Persona name must not exceed 255 characters'),
});

export type CreatePersonaCommandInput = z.infer<typeof CreatePersonaCommandSchema>;
export type CreatePersonaCommandRawInput = z.input<typeof CreatePersonaCommandSchema>;

export class CreatePersonaCommand {
  readonly name: string;

  constructor(input: CreatePersonaCommandRawInput) {
    this.name = input.name;
  }

  static validate(input: unknown): CreatePersonaCommandInput {
    return CreatePersonaCommandSchema.parse(input);
  }

  static safeValidate(input: unknown) {
    return CreatePersonaCommandSchema.safeParse(input);
  }
}
