import { GrantCapabilityToPersonaCommand } from '../../commands/grant-capability-to-persona.command';

describe('GrantCapabilityToPersonaCommandSchema', () => {
  const VALID_PERSONA_ID = '11111111-1111-4111-8111-111111111111';
  const VALID_CAPABILITY_ID = '22222222-2222-4222-8222-222222222222';

  it('returns sanitized payload for valid input', () => {
    const payload = {
      personaId: `  ${VALID_PERSONA_ID}  `,
      capabilityId: `  ${VALID_CAPABILITY_ID}  `,
    };

    const parsed = GrantCapabilityToPersonaCommand.validate(payload);

    expect(parsed).toEqual({
      personaId: VALID_PERSONA_ID,
      capabilityId: VALID_CAPABILITY_ID,
    });

    const command = new GrantCapabilityToPersonaCommand(payload);

    expect(command.personaId).toBe(VALID_PERSONA_ID);
    expect(command.capabilityId).toBe(VALID_CAPABILITY_ID);
  });

  it('fails validation when persona ID is invalid', () => {
    const result = GrantCapabilityToPersonaCommand.safeValidate({
      personaId: 'not-a-uuid',
      capabilityId: VALID_CAPABILITY_ID,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain('Persona ID must be a valid UUID');
    } else {
      throw new Error('Expected validation to fail');
    }
  });

  it('fails validation when capability ID is invalid', () => {
    const result = GrantCapabilityToPersonaCommand.safeValidate({
      personaId: VALID_PERSONA_ID,
      capabilityId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain('Capability ID must be a valid UUID');
    } else {
      throw new Error('Expected validation to fail');
    }
  });

  it('fails validation when required fields are missing', () => {
    const result = GrantCapabilityToPersonaCommand.safeValidate({});

    expect(result.success).toBe(false);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toEqual(
        expect.arrayContaining(['Persona ID is required', 'Capability ID is required'])
      );
    } else {
      throw new Error('Expected validation to fail');
    }
  });
});
