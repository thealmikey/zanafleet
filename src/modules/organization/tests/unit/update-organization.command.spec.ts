import { ZodError } from 'zod';

import {
  UpdateOrganizationCommand,
  UpdateOrganizationCommandSchema,
} from '../../commands/update-organization.command';
import { OrganizationStatus, OrganizationType } from '../../dto/organization.enums';

describe('UpdateOrganizationCommand', () => {
  const organizationId = '4b6f9f0e-5d76-4b36-9f4c-2b2e5b4b8f84';
  const walletIdOne = 'f5c9b3d4-2d47-4b2a-8dd8-3f78c5e0f5b1';
  const walletIdTwo = 'c8f0e2a1-7b43-4e8f-a9f2-3c7d5e9a6b4f';

  it('returns parsed data when input is valid', () => {
    const input = {
      organizationId,
      name: '  Acme Corp  ',
      type: OrganizationType.BUSINESS,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [walletIdOne, walletIdTwo],
    };

    const result = UpdateOrganizationCommand.validate(input);

    expect(result).toEqual({
      organizationId,
      name: 'Acme Corp',
      type: OrganizationType.BUSINESS,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [walletIdOne, walletIdTwo],
    });
  });

  it('allows updates with only organizationId provided', () => {
    const result = UpdateOrganizationCommand.validate({
      organizationId,
    });

    expect(result).toEqual({
      organizationId,
    });
  });

  it('throws when organizationId is missing', () => {
    expect(() => UpdateOrganizationCommand.validate({})).toThrow(ZodError);
  });

  it('throws when organizationId is not a valid UUID', () => {
    expect(() =>
      UpdateOrganizationCommand.validate({ organizationId: 'not-a-uuid' }),
    ).toThrow(ZodError);
  });

  it('throws when type is invalid', () => {
    expect(() =>
      UpdateOrganizationCommand.validate({
        organizationId,
        type: 'INVALID' as OrganizationType,
      }),
    ).toThrow(ZodError);
  });

  it('throws when status is invalid', () => {
    expect(() =>
      UpdateOrganizationCommand.validate({
        organizationId,
        status: 'INVALID' as OrganizationStatus,
      }),
    ).toThrow(ZodError);
  });

  it('throws when linkedWallets contains invalid UUIDs', () => {
    expect(() =>
      UpdateOrganizationCommand.validate({
        organizationId,
        linkedWallets: ['invalid-uuid'],
      }),
    ).toThrow(ZodError);
  });

  it('safeValidate returns success true for valid input', () => {
    const result = UpdateOrganizationCommand.safeValidate({
      organizationId,
      name: 'Valid Name',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        organizationId,
        name: 'Valid Name',
      });
    }
  });

  it('safeValidate returns success false for invalid input', () => {
    const result = UpdateOrganizationCommand.safeValidate({
      organizationId: 'invalid',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
      expect(result.error.issues[0].path).toEqual(['organizationId']);
    }
  });

  it('schema matches command validation behavior', () => {
    const parseResult = UpdateOrganizationCommandSchema.safeParse({
      organizationId,
      status: OrganizationStatus.SUSPENDED,
    });

    expect(parseResult.success).toBe(true);
  });
});
