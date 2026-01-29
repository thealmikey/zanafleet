import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';

import { CreateWorkspaceCommand } from '../../commands/create-workspace.command';
import { UpdateWorkspaceCommand } from '../../commands/update-workspace.command';
import { WorkspaceController } from '../../controllers/workspace.controller';
import { WorkspaceType, WorkspaceStatus } from '../../dto/workspace.enums';
import { WorkspaceEntity } from '../../entities/workspace.entity';

describe('WorkspaceController', () => {
  let controller: WorkspaceController;
  let commandBus: CommandBus;
  let workspaceRepository: Repository<WorkspaceEntity>;

  const mockCommandBus = {
    execute: jest.fn(),
  };

  const mockWorkspaceRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspaceController],
      providers: [
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: getRepositoryToken(WorkspaceEntity),
          useValue: mockWorkspaceRepository,
        },
      ],
    }).compile();

    controller = module.get<WorkspaceController>(WorkspaceController);
    commandBus = module.get<CommandBus>(CommandBus);
    workspaceRepository = module.get<Repository<WorkspaceEntity>>(
      getRepositoryToken(WorkspaceEntity),
    );

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should execute CreateWorkspaceCommand and return workspaceId', async () => {
      const dto = {
        name: 'Test Workspace',
        orgId: uuidv4(),
        type: WorkspaceType.BUSINESS,
        status: WorkspaceStatus.ACTIVE,
      };
      const workspaceId = uuidv4();
      mockCommandBus.execute.mockResolvedValue(workspaceId);

      // Mock validate to return input
      jest.spyOn(CreateWorkspaceCommand, 'validate').mockReturnValue(dto as any);

      const result = await controller.create(dto as any);

      expect(result).toEqual({ workspaceId });
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateWorkspaceCommand));
    });

    it('should throw BadRequestException on validation error', async () => {
      const dto = { name: '' };
      
      jest.spyOn(CreateWorkspaceCommand, 'validate').mockImplementation(() => {
        throw new ZodError([]);
      });

      await expect(controller.create(dto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return WorkspaceDto if workspace exists', async () => {
      const workspaceId = uuidv4();
      const workspaceEntity = {
        id: workspaceId,
        orgId: uuidv4(),
        name: 'Test Workspace',
        type: WorkspaceType.BUSINESS,
        status: WorkspaceStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        toDomain: jest.fn().mockReturnValue({
          workspaceId,
          orgId: uuidv4(),
          name: 'Test Workspace',
          type: WorkspaceType.BUSINESS,
          status: WorkspaceStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };
      mockWorkspaceRepository.findOne.mockResolvedValue(workspaceEntity);

      const result = await controller.findOne(workspaceId);

      expect(result.workspaceId).toBe(workspaceId);
      expect(workspaceRepository.findOne).toHaveBeenCalledWith({ where: { id: workspaceId } });
    });

    it('should throw NotFoundException if workspace does not exist', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue(null);
      await expect(controller.findOne(uuidv4())).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should execute UpdateWorkspaceCommand and return updated WorkspaceDto', async () => {
      const workspaceId = uuidv4();
      const dto = { name: 'Updated Name' };
      
      const workspaceEntity = {
        id: workspaceId,
        orgId: uuidv4(),
        name: dto.name,
        type: WorkspaceType.BUSINESS,
        status: WorkspaceStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        toDomain: jest.fn().mockReturnValue({
          workspaceId,
          orgId: uuidv4(),
          name: dto.name,
          type: WorkspaceType.BUSINESS,
          status: WorkspaceStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      // Mock validate to return input
      jest.spyOn(UpdateWorkspaceCommand, 'validate').mockReturnValue({ ...dto, workspaceId } as any);
      mockCommandBus.execute.mockResolvedValue(undefined);
      mockWorkspaceRepository.findOne.mockResolvedValue(workspaceEntity);

      const result = await controller.update(workspaceId, dto as any);

      expect(result.workspaceId).toBe(workspaceId);
      expect(result.name).toBe(dto.name);
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateWorkspaceCommand));
    });

    it('should throw BadRequestException on validation error', async () => {
      jest.spyOn(UpdateWorkspaceCommand, 'validate').mockImplementation(() => {
        throw new ZodError([]);
      });

      await expect(controller.update(uuidv4(), {} as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if workspace not found after update', async () => {
      jest.spyOn(UpdateWorkspaceCommand, 'validate').mockReturnValue({ workspaceId: 'id' } as any);
      mockCommandBus.execute.mockResolvedValue(undefined);
      mockWorkspaceRepository.findOne.mockResolvedValue(null);

      await expect(controller.update(uuidv4(), {} as any)).rejects.toThrow(NotFoundException);
    });
  });
});
