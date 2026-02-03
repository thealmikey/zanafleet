import { z } from 'zod';

export const AssignPersonaToActorCommandSchema = z.object({
  actorId: z.string().uuid('Actor ID must be a valid UUID'),
  workspaceId: z.string().uuid('Workspace ID must be a valid UUID'),
  personaId: z.string().uuid('Persona ID must be a valid UUID'),
});

export type AssignPersonaToActorCommandInput = z.infer<typeof AssignPersonaToActorCommandSchema>;
export type AssignPersonaToActorCommandRawInput = z.input<typeof AssignPersonaToActorCommandSchema>;

export class AssignPersonaToActorCommand {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly personaId: string;

  constructor(input: AssignPersonaToActorCommandRawInput) {
    this.actorId = input.actorId;
    this.workspaceId = input.workspaceId;
    this.personaId = input.personaId;
  }

  static validate(input: unknown): AssignPersonaToActorCommandInput {
    return AssignPersonaToActorCommandSchema.parse(input);
  }

  static safeValidate(input: unknown) {
    return AssignPersonaToActorCommandSchema.safeParse(input);
  }
}
