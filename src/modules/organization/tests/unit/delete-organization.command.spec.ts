import { ZodError } from 'zod';

import {
  DeleteOrganizationCommand,
  DeleteOrganizationCommandSchema,
} from '../../commands/delete-organization.command';

describe('DeleteOrganizationCommand', () => {
  const organizationId = '82c04f1c-66fa-4b87-8588-5fd15c243d26';
  const actorId = '1b0e6d1a-4b2e-45f5-8a5f-7fcb1c4f800d';

  it('returns parsed data when input is valid', () => {
    const result = DeleteOrganizationCommand.validate({
      organizationId,
      deletedByActorId: actorId,
    });

    expect(result).toEqual({
      organizationId,
      deletedByActorId: actorId,
    });
  });

  it('allows command with only organizationId', () => {
    const result = DeleteOrganizationCommand.validate({
      organizationId,
    });

    expect(result).toEqual({
      organizationId,
    });
  });

  it('throws when organizationId is missing', () => {
    expect(() => DeleteOrganizationCommand.validate({})).toThrow(ZodError);
  });

  it('throws when organizationId is not a valid UUID', () => {
    expect(() =>
      DeleteOrganizationCommand.validate({
        organizationId: 'not-a-uuid',
      })
    ).toThrow(ZodError);
  });

  it('throws when deletedByActorId is not a valid UUID', () => {
    expect(() =>
      DeleteOrganizationCommand.validate({
        organizationId,
        deletedByActorId: 'invalid-uuid',
      })
    ).toThrow(ZodError);
  });

  it('safeValidate returns success true for valid input', () => {
    const result = DeleteOrganizationCommand.safeValidate({
      organizationId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        organizationId,
      });
    }
  });

  it('safeValidate returns success false for invalid input', () => {
    const result = DeleteOrganizationCommand.safeValidate({
      organizationId: 'invalid',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
      expect(result.error.issues[0].path).toEqual(['organizationId']);
    }
  });

  it('schema matches command validation behavior', () => {
    const parseResult = DeleteOrganizationCommandSchema.safeParse({
      organizationId,
      deletedByActorId: actorId,
    });

    expect(parseResult.success).toBe(true);
  });
});
