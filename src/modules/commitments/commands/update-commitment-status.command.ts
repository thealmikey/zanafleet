import { z } from 'zod';

import { CommitmentStatus } from '../dto/commitment.enums';

/**
 * Valid status transitions from each status
 * PENDING can transition to: FULFILLED, BREACHED, CANCELLED
 * Terminal states (FULFILLED, BREACHED, CANCELLED) cannot transition
 */
export const VALID_STATUS_TRANSITIONS: Record<CommitmentStatus, CommitmentStatus[]> = {
  [CommitmentStatus.PENDING]: [
    CommitmentStatus.FULFILLED,
    CommitmentStatus.BREACHED,
    CommitmentStatus.CANCELLED,
  ],
  [CommitmentStatus.FULFILLED]: [],
  [CommitmentStatus.BREACHED]: [],
  [CommitmentStatus.CANCELLED]: [],
};

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  currentStatus: CommitmentStatus,
  newStatus: CommitmentStatus,
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Zod validation schema for UpdateCommitmentStatusCommand
 * Ensures type safety and input validation at command level
 */
export const UpdateCommitmentStatusCommandSchema = z.object({
  commitmentId: z
    .string()
    .uuid('Commitment ID must be a valid UUID'),
  newStatus: z.nativeEnum(CommitmentStatus, {
    errorMap: () => ({ message: 'New status must be a valid CommitmentStatus' }),
  }),
});

export type UpdateCommitmentStatusCommandInput = z.infer<typeof UpdateCommitmentStatusCommandSchema>;
export type UpdateCommitmentStatusCommandRawInput = z.input<typeof UpdateCommitmentStatusCommandSchema>;

/**
 * UpdateCommitmentStatusCommand
 * Command object representing the intent to update a commitment's status
 * Part of the command pattern in the event-driven architecture
 */
export class UpdateCommitmentStatusCommand {
  readonly commitmentId: string;
  readonly newStatus: CommitmentStatus;

  constructor(input: UpdateCommitmentStatusCommandRawInput) {
    this.commitmentId = input.commitmentId;
    this.newStatus = input.newStatus;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): UpdateCommitmentStatusCommandInput {
    return UpdateCommitmentStatusCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown) {
    return UpdateCommitmentStatusCommandSchema.safeParse(input);
  }
}
