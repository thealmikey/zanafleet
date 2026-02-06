import { z } from 'zod';

import { EvidenceType, SubjectType, EvidenceSource } from '../dto/evidence.enums';

/**
 * Zod validation schema for CreateEvidenceCommand
 * Ensures type safety and input validation at command level
 */
export const CreateEvidenceCommandSchema = z.object({
  type: z.nativeEnum(EvidenceType, {
    errorMap: () => ({ message: 'Evidence type must be a valid EvidenceType' }),
  }),
  actorId: z.string().uuid('Actor ID must be a valid UUID'),
  workspaceId: z.string().uuid('Workspace ID must be a valid UUID'),
  subjectType: z.nativeEnum(SubjectType, {
    errorMap: () => ({ message: 'Subject type must be a valid SubjectType' }),
  }),
  subjectId: z.string().uuid('Subject ID must be a valid UUID'),
  payload: z.record(z.unknown()).refine((val) => val !== null && typeof val === 'object', {
    message: 'Payload must be a valid object',
  }),
  source: z.nativeEnum(EvidenceSource, {
    errorMap: () => ({ message: 'Source must be a valid EvidenceSource' }),
  }),
  commandId: z.string().uuid('Command ID must be a valid UUID'),
});

export type CreateEvidenceCommandInput = z.infer<typeof CreateEvidenceCommandSchema>;
export type CreateEvidenceCommandRawInput = z.input<typeof CreateEvidenceCommandSchema>;

/**
 * CreateEvidenceCommand
 * Command object representing the intent to create a new evidence record
 * Part of the command pattern in the event-driven architecture
 *
 * Evidence records are immutable - once created, they cannot be modified.
 * The commandId field enables idempotency for duplicate command submissions.
 */
export class CreateEvidenceCommand {
  readonly type: EvidenceType;
  readonly actorId: string;
  readonly workspaceId: string;
  readonly subjectType: SubjectType;
  readonly subjectId: string;
  readonly payload: Record<string, unknown>;
  readonly source: EvidenceSource;
  readonly commandId: string;

  constructor(input: CreateEvidenceCommandRawInput) {
    this.type = input.type;
    this.actorId = input.actorId;
    this.workspaceId = input.workspaceId;
    this.subjectType = input.subjectType;
    this.subjectId = input.subjectId;
    this.payload = input.payload;
    this.source = input.source;
    this.commandId = input.commandId;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateEvidenceCommandInput {
    return CreateEvidenceCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown) {
    return CreateEvidenceCommandSchema.safeParse(input);
  }
}
