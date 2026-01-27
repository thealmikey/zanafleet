import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { OrganizationEntity } from '../../../organization/entities/organization.entity';
import { CreateWorkspaceCommand } from '../../commands/create-workspace.command';
import { WorkspaceStatus, WorkspaceType } from '../../dto/workspace.enums';
import { WorkspaceEntity } from '../../entities/workspace.entity';
import { WorkspaceCreatedEventV1 } from '../../events/workspace-created.event';
import { CreateWorkspaceCommandHandler } from '../../handlers/create-workspace.handler';

describe('CreateWorkspaceCommandHandler', () => {
  let handler: CreateWorkspaceCommandHandler;
  let workspaceRepository: jest.Mocked<Repository<WorkspaceEntity>>;
  let organizationRepository: jest.Mocked<Repository<OrganizationEntity>>;
  let eventBus: jest.Mocked<EventBus>;

  const mockOrganization: Partial<OrganizationEntity> = {
    id: '123e4567-e89b-12d3-a456-426614174010',
  };

  const validCommand = new CreateWorkspaceCommand({
    name: 'Test Workspace',
    orgId: '123e4567-e89b-12d3-a456-426614174010',
    type: WorkspaceType.SACCO,
    status: WorkspaceStatus.ACTIVE,
    roleTemplates: ['role-template-1', 'role-template-2'],
  });

  beforeEach(() => {
    workspaceRepository = {
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<WorkspaceEntity>>;

    organizationRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrganizationEntity>>;

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new CreateWorkspaceCommandHandler(
      workspaceRepository,
      organizationRepository,
      eventBus,
      undefined,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully create workspace and emit WorkspaceCreatedEventV1', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization as OrganizationEntity);
      workspaceRepository.save.mockResolvedValue({} as WorkspaceEntity);

      const workspaceId = await handler.execute(validCommand);

      expect(workspaceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: validCommand.orgId },
      });
      expect(workspaceRepository.save).toHaveBeenCalledTimes(1);

      const savedWorkspace = workspaceRepository.save.mock.calls[0][0] as WorkspaceEntity;
      expect(savedWorkspace).toMatchObject({
        id: workspaceId,
        orgId: validCommand.orgId,
        name: validCommand.name,
        type: validCommand.type,
        status: validCommand.status,
        roleTemplates: validCommand.roleTemplates,
      });

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const emittedEvent = eventBus.publish.mock.calls[0][0] as WorkspaceCreatedEventV1;

      expect(emittedEvent).toBeInstanceOf(WorkspaceCreatedEventV1);
      expect(emittedEvent.workspaceId).toBe(workspaceId);
      expect(emittedEvent.orgId).toBe(validCommand.orgId);
      expect(emittedEvent.name).toBe(validCommand.name);
      expect(emittedEvent.roleTemplates).toEqual(validCommand.roleTemplates);
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      const execution = handler.execute(validCommand);

      await expect(execution).rejects.toThrow(NotFoundException);
      await expect(execution).rejects.toThrow(
        `Organization with ID '${validCommand.orgId}' does not exist`,
      );

      expect(workspaceRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should emit correct event properties on success', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization as OrganizationEntity);
      workspaceRepository.save.mockResolvedValue({} as WorkspaceEntity);

      const workspaceId = await handler.execute(validCommand);
      const emittedEvent = eventBus.publish.mock.calls[0][0] as WorkspaceCreatedEventV1;

      expect(emittedEvent.eventType).toBe('WorkspaceCreatedEvent-V1');
      expect(emittedEvent.aggregateType).toBe('Workspace');
      expect(emittedEvent.workspaceId).toBe(workspaceId);
      expect(emittedEvent.orgId).toBe(validCommand.orgId);
      expect(emittedEvent.name).toBe(validCommand.name);
      expect(emittedEvent.type).toBe(validCommand.type);
      expect(emittedEvent.status).toBe(validCommand.status);
      expect(emittedEvent.roleTemplates).toEqual(validCommand.roleTemplates);
    });
  });
});
