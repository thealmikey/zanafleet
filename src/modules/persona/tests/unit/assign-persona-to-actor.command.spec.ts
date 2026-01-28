import { ZodError } from 'zod';
import { AssignPersonaToActorCommand } from '../../commands/assign-persona-to-actor.command';

const VALID_ACTOR_ID = '11111111-1111-1111-1111-111111111111';
const VALID_WORKSPACE_ID = '22222222-2222-2222-2222-222222222222';
const VALID_PERSONA_ID = '33333333-3333-3333-3333-333333333333';

describe('AssignPersonaToActorCommand', () => {
  it('should validate valid input', () => {
    const result = AssignPersonaToActorCommand.validate({
      actorId: VALID_ACTOR_ID,
      workspaceId: VALID_WORKSPACE_ID,
      personaId: VALID_PERSONA_ID,
    });

    expect(result).toEqual({
      actorId: VALID_ACTOR_ID,
      workspaceId: VALID_WORKSPACE_ID,
      personaId: VALID_PERSONA_ID,
    });
  });

  it('should throw when actorId is missing', () => {
    expect(() =>
      AssignPersonaToActorCommand.validate({
        workspaceId: VALID_WORKSPACE_ID,
        personaId: VALID_PERSONA_ID,
      } as Record<string, unknown>),
    ).toThrow(ZodError);
  });

  it('should throw when workspaceId is missing', () => {
    expect(() =>
      AssignPersonaToActorCommand.validate({
        actorId: VALID_ACTOR_ID,
        personaId: VALID_PERSONA_ID,
      } as Record<string, unknown>),
    ).toThrow(ZodError);
  });

  it('should throw when personaId is missing', () => {
    expect(() =>
      AssignPersonaToActorCommand.validate({
        actorId: VALID_ACTOR_ID,
        workspaceId: VALID_WORKSPACE_ID,
      } as Record<string, unknown>),
    ).toThrow(ZodError);
  });

  it('should throw when actorId is not a UUID', () => {
    expect(() =>
      AssignPersonaToActorCommand.validate({
        actorId: 'not-a-uuid',
        workspaceId: VALID_WORKSPACE_ID,
        personaId: VALID_PERSONA_ID,
      }),
    ).toThrow(ZodError);
  });

  it('should throw when workspaceId is not a UUID', () => {
    expect(() =>
      AssignPersonaToActorCommand.validate({
        actorId: VALID_ACTOR_ID,
        workspaceId: 'invalid',
        personaId: VALID_PERSONA_ID,
      }),
    ).toThrow(ZodError);
  });

  it('should throw when personaId is not a UUID', () => {
    expect(() =>
      AssignPersonaToActorCommand.validate({
        actorId: VALID_ACTOR_ID,
        workspaceId: VALID_WORKSPACE_ID,
        personaId: 'invalid',
      }),
    ).toThrow(ZodError);
  });

  it('safeValidate should return success result for valid input', () => {
    const result = AssignPersonaToActorCommand.safeValidate({
      actorId: VALID_ACTOR_ID,
      workspaceId: VALID_WORKSPACE_ID,
      personaId: VALID_PERSONA_ID,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        actorId: VALID_ACTOR_ID,
        workspaceId: VALID_WORKSPACE_ID,
        personaId: VALID_PERSONA_ID,
      });
    }
  });

  it('safeValidate should return error result for invalid input', () => {
    const result = AssignPersonaToActorCommand.safeValidate({
      actorId: 'invalid',
      workspaceId: VALID_WORKSPACE_ID,
      personaId: VALID_PERSONA_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
    }
  });

  it('constructor should set properties correctly', () => {
    const command = new AssignPersonaToActorCommand({
      actorId: VALID_ACTOR_ID,
      workspaceId: VALID_WORKSPACE_ID,
      personaId: VALID_PERSONA_ID,
    });

    expect(command.actorId).toBe(VALID_ACTOR_ID);
    expect(command.workspaceId).toBe(VALID_WORKSPACE_ID);
    expect(command.personaId).toBe(VALID_PERSONA_ID);
  });
});
