import { z } from 'zod';

import { CommitmentStatus, CommitmentType } from '../dto/commitment.enums';

/**
 * Zod validation schema for CreateCommitmentCommand
 * Ensures type safety and input validation at command level
 */
export const CreateCommitmentCommandSchema = z.object({
  actorId: z
    .string()
    .uuid('Actor ID must be a valid UUID'),
  workspaceId: z
    .string()
    .uuid('Workspace ID must be a valid UUID'),
  type: z.nativeEnum(CommitmentType, {
    errorMap: () => ({ message: 'Commitment type must be a valid CommitmentType' }),
  }),
  status: z
    .nativeEnum(CommitmentStatus)
    .optional()
    .default(CommitmentStatus.PENDING),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(1000, 'Description must not exceed 1000 characters'),
  dueAt: z.coerce.date({
    errorMap: () => ({ message: 'Due date must be a valid date' }),
  }),
});

export type CreateCommitmentCommandInput = z.infer<typeof CreateCommitmentCommandSchema>;
export type CreateCommitmentCommandRawInput = z.input<typeof CreateCommitmentCommandSchema>;

/**
 * CreateCommitmentCommand
 * Command object representing the intent to create a new commitment
 * Part of the command pattern in the event-driven architecture
 */
export class CreateCommitmentCommand {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly type: CommitmentType;
  readonly status: CommitmentStatus;
  readonly description: string;
  readonly dueAt: Date;

  constructor(input: CreateCommitmentCommandRawInput) {
    this.actorId = input.actorId;
    this.workspaceId = input.workspaceId;
    this.type = input.type;
    this.status = input.status ?? CommitmentStatus.PENDING;
    this.description = input.description;
    this.dueAt = input.dueAt instanceof Date ? input.dueAt : new Date(input.dueAt);
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateCommitmentCommandInput {
    return CreateCommitmentCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown) {
    return CreateCommitmentCommandSchema.safeParse(input);
  }
}
