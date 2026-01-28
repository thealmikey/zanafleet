import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundException } from '@nestjs/common';

import { UpdateWorkspaceCommandHandler } from '../../handlers/update-workspace.handler';
import { UpdateWorkspaceCommand } from '../../commands/update-workspace.command';
import { WorkspaceEntity } from '../../entities/workspace.entity';
import { EventBusService } from '../../../../core/event-bus';
import { WorkspaceUpdatedEventV1 } from '../../events/workspace-updated.event';
import { WorkspaceStatus, WorkspaceType } from '../../dto/workspace.enums';

describe('UpdateWorkspaceCommandHandler', () => {
  let handler: UpdateWorkspaceCommandHandler;
  let workspaceRepository: Repository<WorkspaceEntity>;
  let eventBus: EventBus;
  let eventBusService: EventBusService;

  const mockWorkspaceRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockEventBusService = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateWorkspaceCommandHandler,
        {
          provide: getRepositoryToken(WorkspaceEntity),
          useValue: mockWorkspaceRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: EventBusService,
          useValue: mockEventBusService,
        },
      ],
    }).compile();

    handler = module.get<UpdateWorkspaceCommandHandler>(UpdateWorkspaceCommandHandler);
    workspaceRepository = module.get<Repository<WorkspaceEntity>>(
      getRepositoryToken(WorkspaceEntity),
    );
    eventBus = module.get<EventBus>(EventBus);
    eventBusService = module.get<EventBusService>(EventBusService);

    jest.clearAllMocks();
  });

  it('should successfully update a workspace and emit events', async () => {
    const workspaceId = uuidv4();
    const name = 'New Workspace Name';
    const command = new UpdateWorkspaceCommand({
      workspaceId,
      name,
    });

    const existingWorkspace = new WorkspaceEntity();
    existingWorkspace.id = workspaceId;
    existingWorkspace.name = 'Old Name';
    existingWorkspace.orgId = uuidv4();
    existingWorkspace.type = WorkspaceType.BUSINESS;
    existingWorkspace.status = WorkspaceStatus.ACTIVE;
    existingWorkspace.roleTemplates = [];

    mockWorkspaceRepository.findOne.mockResolvedValue(existingWorkspace);
    mockWorkspaceRepository.save.mockResolvedValue({ ...existingWorkspace, name });

    await handler.execute(command);

    expect(workspaceRepository.findOne).toHaveBeenCalledWith({
      where: { id: workspaceId },
    });
    expect(workspaceRepository.save).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(WorkspaceUpdatedEventV1),
    );
    expect(eventBusService.publish).toHaveBeenCalled();
  });

  it('should throw NotFoundException if workspace does not exist', async () => {
    const workspaceId = uuidv4();
    const command = new UpdateWorkspaceCommand({
      workspaceId,
      name: 'New Name',
    });

    mockWorkspaceRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(workspaceRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should not update or emit if no changes are provided', async () => {
    const workspaceId = uuidv4();
    const command = new UpdateWorkspaceCommand({
      workspaceId,
    });

    const existingWorkspace = new WorkspaceEntity();
    existingWorkspace.id = workspaceId;

    mockWorkspaceRepository.findOne.mockResolvedValue(existingWorkspace);

    await handler.execute(command);

    expect(workspaceRepository.findOne).toHaveBeenCalled();
    expect(workspaceRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
