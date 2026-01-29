import { CreateCapabilityCommand } from '../../commands/create-capability.command';

describe('CreateCapabilityCommandSchema', () => {
  it('returns sanitized payload for valid input', () => {
    const parsed = CreateCapabilityCommand.validate({
      name: '  manage_users  ',
    });

    expect(parsed).toEqual({ name: 'manage_users' });

    const command = new CreateCapabilityCommand({ name: '  manage_users  ' });
    expect(command.name).toBe('manage_users');
  });

  it('fails validation when name is missing', () => {
    const result = CreateCapabilityCommand.safeValidate({});
    expect(result.success).toBe(false);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain('Capability name is required');
    } else {
      throw new Error('Expected validation to fail');
    }
  });

  it('fails validation when name exceeds 255 characters', () => {
    const longName = 'a'.repeat(256);

    const result = CreateCapabilityCommand.safeValidate({ name: longName });
    expect(result.success).toBe(false);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain('Capability name must not exceed 255 characters');
    } else {
      throw new Error('Expected validation to fail');
    }
  });

  it('fails validation when name contains invalid characters', () => {
    const result = CreateCapabilityCommand.safeValidate({
      name: 'manage-users',
    });
    expect(result.success).toBe(false);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain(
        'Capability name must use snake_case (lowercase letters, numbers, and underscores only)'
      );
    } else {
      throw new Error('Expected validation to fail');
    }
  });
});
