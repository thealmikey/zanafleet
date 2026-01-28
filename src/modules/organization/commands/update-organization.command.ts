import { z } from 'zod';
import { OrganizationStatus, OrganizationType } from '../dto/organization.enums';

/**
 * Zod validation schema for UpdateOrganizationCommand
 * Ensures input validation for organization updates
 */
export const UpdateOrganizationCommandSchema = z.object({
  organizationId: z
    .string()
    .uuid('organizationId must be a valid UUID'),
  name: z
    .string()
    .trim()
    .min(1, 'Organization name must not be empty')
    .max(255, 'Organization name must not exceed 255 characters')
    .optional(),
  type: z
    .nativeEnum(OrganizationType, {
      errorMap: () => ({
        message: `Organization type must be one of: ${Object.values(OrganizationType).join(', ')}`,
      }),
    })
    .optional(),
  status: z
    .nativeEnum(OrganizationStatus, {
      errorMap: () => ({
        message: `Organization status must be one of: ${Object.values(OrganizationStatus).join(', ')}`,
      }),
    })
    .optional(),
  linkedWallets: z
    .array(
      z
        .string()
        .uuid('Each wallet ID must be a valid UUID'),
    )
    .optional(),
});

export type UpdateOrganizationCommandInput = z.infer<typeof UpdateOrganizationCommandSchema>;
export type UpdateOrganizationCommandRawInput = z.input<typeof UpdateOrganizationCommandSchema>;

/**
 * UpdateOrganizationCommand
 * Command object representing the intent to update an existing organization
 */
export class UpdateOrganizationCommand {
  readonly organizationId: string;
  readonly name?: string;
  readonly type?: OrganizationType;
  readonly status?: OrganizationStatus;
  readonly linkedWallets?: string[];

  constructor(input: UpdateOrganizationCommandRawInput) {
    this.organizationId = input.organizationId;
    this.name = input.name;
    this.type = input.type;
    this.status = input.status;
    this.linkedWallets = input.linkedWallets;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): UpdateOrganizationCommandInput {
    return UpdateOrganizationCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown) {
    return UpdateOrganizationCommandSchema.safeParse(input);
  }
}
