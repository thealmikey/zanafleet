import { z } from 'zod';

import {
  InteractionContextType,
  InteractionStreamState,
} from '../entities/interaction-stream.entity';

/**
 * Zod validation schema for CreateInteractionStreamCommand
 * Ensures type safety and input validation at command level
 */
export const CreateInteractionStreamCommandSchema = z.object({
  contextType: z.nativeEnum(InteractionContextType, {
    errorMap: () => ({
      message: `Context type must be one of: ${Object.values(InteractionContextType).join(', ')}`,
    }),
  }),
  contextId: z.string().uuid('Context ID must be a valid UUID'),
  participantIds: z.array(z.string().uuid('Each participant ID must be a valid UUID')).optional(),
  metadata: z.record(z.unknown()).optional(),
  state: z.nativeEnum(InteractionStreamState).optional(),
});

export type CreateInteractionStreamCommandInput = z.infer<
  typeof CreateInteractionStreamCommandSchema
>;

/**
 * CreateInteractionStreamCommand
 * Command object representing the intent to create a new interaction stream
 * Part of the command pattern in the event-driven architecture
 */
export class CreateInteractionStreamCommand {
  readonly contextType: InteractionContextType;
  readonly contextId: string;
  readonly participantIds: string[];
  readonly metadata: Record<string, unknown>;
  readonly state: InteractionStreamState;

  constructor(input: CreateInteractionStreamCommandInput) {
    this.contextType = input.contextType;
    this.contextId = input.contextId;
    this.participantIds = input.participantIds ?? [];
    this.metadata = input.metadata ?? {};
    this.state = input.state ?? InteractionStreamState.ACTIVE;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateInteractionStreamCommandInput {
    return CreateInteractionStreamCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(
    input: unknown
  ): z.SafeParseReturnType<unknown, CreateInteractionStreamCommandInput> {
    return CreateInteractionStreamCommandSchema.safeParse(input);
  }
}
