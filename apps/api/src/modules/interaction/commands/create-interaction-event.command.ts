import { z } from 'zod';

import { InteractionEventType, InteractionActorType } from '../entities/interaction-event.entity';

/**
 * Zod validation schema for CreateInteractionEventCommand
 * Ensures type safety and input validation at command level
 */
export const CreateInteractionEventCommandSchema = z.object({
  streamId: z.string().uuid('Stream ID must be a valid UUID'),
  actorId: z.string().uuid('Actor ID must be a valid UUID'),
  actorType: z.nativeEnum(InteractionActorType, {
    errorMap: () => ({
      message: `Actor type must be one of: ${Object.values(InteractionActorType).join(', ')}`,
    }),
  }),
  eventType: z.nativeEnum(InteractionEventType, {
    errorMap: () => ({
      message: `Event type must be one of: ${Object.values(InteractionEventType).join(', ')}`,
    }),
  }),
  payload: z.record(z.unknown()).optional(),
  correlationId: z.string().uuid().optional(),
  causationId: z.string().uuid().optional(),
});

export type CreateInteractionEventCommandInput = z.infer<
  typeof CreateInteractionEventCommandSchema
>;

/**
 * CreateInteractionEventCommand
 * Command object representing the intent to create a new interaction event
 * Part of the command pattern in the event-driven architecture
 */
export class CreateInteractionEventCommand {
  readonly streamId: string;
  readonly actorId: string;
  readonly actorType: InteractionActorType;
  readonly eventType: InteractionEventType;
  readonly payload: Record<string, unknown>;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(input: CreateInteractionEventCommandInput) {
    this.streamId = input.streamId;
    this.actorId = input.actorId;
    this.actorType = input.actorType;
    this.eventType = input.eventType;
    this.payload = input.payload ?? {};
    this.correlationId = input.correlationId;
    this.causationId = input.causationId;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateInteractionEventCommandInput {
    return CreateInteractionEventCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(
    input: unknown
  ): z.SafeParseReturnType<unknown, CreateInteractionEventCommandInput> {
    return CreateInteractionEventCommandSchema.safeParse(input);
  }
}
