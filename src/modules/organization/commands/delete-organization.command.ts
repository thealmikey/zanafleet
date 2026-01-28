import { z } from 'zod';

export const DeleteOrganizationCommandSchema = z.object({
  organizationId: z
    .string()
    .uuid('organizationId must be a valid UUID'),
  deletedByActorId: z
    .string()
    .uuid('deletedByActorId must be a valid UUID')
    .optional(),
});

export type DeleteOrganizationCommandInput = z.infer<typeof DeleteOrganizationCommandSchema>;
export type DeleteOrganizationCommandRawInput = z.input<typeof DeleteOrganizationCommandSchema>;

export class DeleteOrganizationCommand {
  readonly organizationId: string;
  readonly deletedByActorId?: string;

  constructor(input: DeleteOrganizationCommandRawInput) {
    this.organizationId = input.organizationId;
    this.deletedByActorId = input.deletedByActorId;
  }

  static validate(input: unknown): DeleteOrganizationCommandInput {
    return DeleteOrganizationCommandSchema.parse(input);
  }

  static safeValidate(input: unknown) {
    return DeleteOrganizationCommandSchema.safeParse(input);
  }
}
