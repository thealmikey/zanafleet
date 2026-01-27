import { z } from 'zod';
import { OrganizationType, OrganizationStatus } from '../dto/organization.enums';

/**
 * Zod validation schema for CreateOrganizationCommand
 * Ensures type safety and input validation at command level
 */
export const CreateOrganizationCommandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Organization name is required')
    .max(255, 'Organization name must not exceed 255 characters'),
  type: z.nativeEnum(OrganizationType, {
    errorMap: () => ({
      message: `Organization type must be one of: ${Object.values(OrganizationType).join(', ')}`,
    }),
  }),
  status: z.nativeEnum(OrganizationStatus, {
    errorMap: () => ({
      message: `Organization status must be one of: ${Object.values(OrganizationStatus).join(', ')}`,
    }),
  }),
  linkedWallets: z
    .array(
      z
        .string()
        .uuid('Each wallet ID must be a valid UUID'),
    )
    .optional()
    .default([]),
});

export type CreateOrganizationCommandInput = z.infer<typeof CreateOrganizationCommandSchema>;
export type CreateOrganizationCommandRawInput = z.input<typeof CreateOrganizationCommandSchema>;

/**
 * CreateOrganizationCommand
 * Command object representing the intent to create a new organization
 * Part of the command pattern in the event-driven architecture
 */
export class CreateOrganizationCommand {
  readonly name: string;
  readonly type: OrganizationType;
  readonly status: OrganizationStatus;
  readonly linkedWallets: string[];

  constructor(input: CreateOrganizationCommandRawInput) {
    this.name = input.name;
    this.type = input.type;
    this.status = input.status;
    this.linkedWallets = input.linkedWallets ?? [];
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateOrganizationCommandInput {
    return CreateOrganizationCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown) {
    return CreateOrganizationCommandSchema.safeParse(input);
  }
}
