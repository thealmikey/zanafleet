import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';
import { UpdateWorkspaceCommand } from '../../commands/update-workspace.command';
import { WorkspaceStatus } from '../../dto/workspace.enums';

describe('UpdateWorkspaceCommand', () => {
  const workspaceId = uuidv4();

  it('should create a valid command with all optional fields', () => {
    const input = {
      workspaceId,
      name: 'Updated Name',
      status: WorkspaceStatus.ACTIVE,
      roleTemplates: [uuidv4()],
    };

    const command = new UpdateWorkspaceCommand(input);

    expect(command.workspaceId).toBe(input.workspaceId);
    expect(command.name).toBe(input.name);
    expect(command.status).toBe(input.status);
    expect(command.roleTemplates).toEqual(input.roleTemplates);
  });

  it('should create a valid command with only workspaceId', () => {
    const input = { workspaceId };
    const command = new UpdateWorkspaceCommand(input);

    expect(command.workspaceId).toBe(workspaceId);
    expect(command.name).toBeUndefined();
    expect(command.status).toBeUndefined();
    expect(command.roleTemplates).toBeUndefined();
  });

  it('should validate correctly using Zod', () => {
    const input = {
      workspaceId,
      name: 'New Name',
    };

    const validated = UpdateWorkspaceCommand.validate(input);
    expect(validated).toEqual(input);
  });

  it('should throw ZodError for invalid input (missing workspaceId)', () => {
    const input = {
      name: 'New Name',
    };

    expect(() => UpdateWorkspaceCommand.validate(input as any)).toThrow(ZodError);
  });

  it('should throw ZodError for invalid workspaceId (not a UUID)', () => {
    const input = {
      workspaceId: 'not-a-uuid',
    };

    expect(() => UpdateWorkspaceCommand.validate(input as any)).toThrow(ZodError);
  });
});
