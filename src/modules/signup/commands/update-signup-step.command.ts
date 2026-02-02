import { z } from 'zod';

/**
 * UpdateSignUpStepCommandSchema
 * Zod schema for validating UpdateSignUpStepCommand input
 */
export const UpdateSignUpStepCommandSchema = z.object({
  sessionId: z.string().uuid(),
  stepName: z.string().min(1),
  workspaceIds: z.array(z.string().uuid()).optional().default([]),
  roles: z.array(z.string()).optional().default([]),
  linkedWallets: z.array(z.string()).optional().default([]),
  idempotencyKey: z.string().optional().nullable(),
});

/**
 * UpdateSignUpStepCommandInput
 * Type derived from the Zod schema for validated input
 */
export type UpdateSignUpStepCommandInput = z.infer<typeof UpdateSignUpStepCommandSchema>;

/**
 * UpdateSignUpStepCommand
 *
 * Command representing the intent to update a sign-up session with step data.
 * Part of the multi-step sign-up orchestration.
 */
export class UpdateSignUpStepCommand {
  readonly sessionId: string;
  readonly stepName: string;
  readonly workspaceIds: string[];
  readonly roles: string[];
  readonly linkedWallets: string[];
  readonly idempotencyKey?: string | null;

  constructor(input: UpdateSignUpStepCommandInput) {
    this.sessionId = input.sessionId;
    this.stepName = input.stepName;
    this.workspaceIds = input.workspaceIds;
    this.roles = input.roles;
    this.linkedWallets = input.linkedWallets;
    this.idempotencyKey = input.idempotencyKey;
  }

  /**
   * Validates input using Zod schema
   */
  static validate(input: unknown): UpdateSignUpStepCommandInput {
    return UpdateSignUpStepCommandSchema.parse(input);
  }

  /**
   * Safe validation that returns a result object
   */
  static safeValidate(input: unknown) {
    return UpdateSignUpStepCommandSchema.safeParse(input);
  }
}
