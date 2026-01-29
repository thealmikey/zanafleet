import { ZodError } from 'zod';

import { CreatePersonaCommand } from '../../commands/create-persona.command';

describe('CreatePersonaCommand', () => {
  it('should validate valid input', () => {
    const result = CreatePersonaCommand.validate({ name: 'Test Persona' });

    expect(result).toEqual({ name: 'Test Persona' });
  });

  it('should throw when name is missing', () => {
    expect(() =>
      CreatePersonaCommand.validate({} as Record<string, unknown>),
    ).toThrow(ZodError);
  });

  it('should throw when name is empty', () => {
    expect(() => CreatePersonaCommand.validate({ name: '' })).toThrow(
      ZodError,
    );
  });

  it('should throw when name exceeds maximum length', () => {
    const longName = 'a'.repeat(256);

    expect(() => CreatePersonaCommand.validate({ name: longName })).toThrow(
      ZodError,
    );
  });

  it('safeValidate should return success result for valid input', () => {
    const result = CreatePersonaCommand.safeValidate({
      name: 'Valid Persona',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'Valid Persona' });
    }
  });

  it('safeValidate should return error result for invalid input', () => {
    const result = CreatePersonaCommand.safeValidate(
      {} as Record<string, unknown>,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
    }
  });

  it('constructor should set properties correctly', () => {
    const command = new CreatePersonaCommand({ name: 'Constructed Persona' });

    expect(command.name).toBe('Constructed Persona');
  });
});
