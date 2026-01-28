import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';
import { UpdateActorCommand } from '../../commands/update-actor.command';

describe('UpdateActorCommand', () => {
  const actorId = uuidv4();

  it('should create a valid command with all optional fields', () => {
    const input = {
      actorId,
      roles: [uuidv4()],
      linkedWallets: [uuidv4()],
    };

    const command = new UpdateActorCommand(input);

    expect(command.actorId).toBe(input.actorId);
    expect(command.roles).toEqual(input.roles);
    expect(command.linkedWallets).toEqual(input.linkedWallets);
  });

  it('should create a valid command with only actorId', () => {
    const input = { actorId };
    const command = new UpdateActorCommand(input);

    expect(command.actorId).toBe(actorId);
    expect(command.roles).toBeUndefined();
    expect(command.linkedWallets).toBeUndefined();
  });

  it('should validate correctly using Zod', () => {
    const input = {
      actorId,
      roles: [uuidv4()],
    };

    const validated = UpdateActorCommand.validate(input);
    expect(validated).toEqual(input);
  });

  it('should throw ZodError for invalid input (missing actorId)', () => {
    const input = {
      roles: [uuidv4()],
    };

    expect(() => UpdateActorCommand.validate(input)).toThrow(ZodError);
  });

  it('should throw ZodError for invalid actorId (not a UUID)', () => {
    const input = {
      actorId: 'not-a-uuid',
    };

    expect(() => UpdateActorCommand.validate(input)).toThrow(ZodError);
  });
});
