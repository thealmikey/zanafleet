import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';

import { CreateActorCommand } from '../../commands/create-actor.command';
import { UpdateActorCommand } from '../../commands/update-actor.command';
import { ActorController } from '../../controllers/actor.controller';
import { ActorType } from '../../dto/actor.enums';
import { ActorEntity } from '../../entities/actor.entity';

describe('ActorController', () => {
  let controller: ActorController;
  let commandBus: CommandBus;
  let actorRepository: Repository<ActorEntity>;

  const mockCommandBus = {
    execute: jest.fn(),
  };

  const mockActorRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActorController],
      providers: [
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: getRepositoryToken(ActorEntity),
          useValue: mockActorRepository,
        },
      ],
    }).compile();

    controller = module.get<ActorController>(ActorController);
    commandBus = module.get<CommandBus>(CommandBus);
    actorRepository = module.get<Repository<ActorEntity>>(
      getRepositoryToken(ActorEntity),
    );

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should execute CreateActorCommand and return actorId', async () => {
      const dto = {
        type: ActorType.Rider,
        workspaceId: uuidv4(),
        roles: [uuidv4()],
        linkedWallets: [uuidv4()],
      };
      const actorId = uuidv4();
      mockCommandBus.execute.mockResolvedValue(actorId);

      // Mock validate to return input
      jest.spyOn(CreateActorCommand, 'validate').mockReturnValue(dto as any);

      const result = await controller.create(dto as any);

      expect(result).toEqual({ actorId });
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateActorCommand));
    });

    it('should throw BadRequestException on validation error', async () => {
      const dto = { type: 'invalid' };
      
      jest.spyOn(CreateActorCommand, 'validate').mockImplementation(() => {
        throw new ZodError([]);
      });

      await expect(controller.create(dto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return ActorDto if actor exists', async () => {
      const actorId = uuidv4();
      const actorEntity = {
        id: actorId,
        type: ActorType.Rider,
        roles: [],
        workspaceId: uuidv4(),
        linkedWallets: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        toDomain: jest.fn().mockReturnValue({
          actorId,
          type: ActorType.Rider,
          roles: [],
          workspaceId: uuidv4(),
          linkedWallets: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };
      mockActorRepository.findOne.mockResolvedValue(actorEntity);

      const result = await controller.findOne(actorId);

      expect(result.actorId).toBe(actorId);
      expect(actorRepository.findOne).toHaveBeenCalledWith({ where: { id: actorId } });
    });

    it('should throw NotFoundException if actor does not exist', async () => {
      mockActorRepository.findOne.mockResolvedValue(null);
      await expect(controller.findOne(uuidv4())).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should execute UpdateActorCommand and return updated ActorDto', async () => {
      const actorId = uuidv4();
      const dto = { roles: [uuidv4()] };
      
      const actorEntity = {
        id: actorId,
        type: ActorType.Rider,
        roles: dto.roles,
        workspaceId: uuidv4(),
        linkedWallets: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        toDomain: jest.fn().mockReturnValue({
          actorId,
          type: ActorType.Rider,
          roles: dto.roles,
          workspaceId: uuidv4(),
          linkedWallets: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      // Mock validate to return input
      jest.spyOn(UpdateActorCommand, 'validate').mockReturnValue({ ...dto, actorId } as any);
      mockCommandBus.execute.mockResolvedValue(undefined);
      mockActorRepository.findOne.mockResolvedValue(actorEntity);

      const result = await controller.update(actorId, dto as any);

      expect(result.actorId).toBe(actorId);
      expect(result.roles).toEqual(dto.roles);
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateActorCommand));
    });

    it('should throw BadRequestException on validation error', async () => {
      jest.spyOn(UpdateActorCommand, 'validate').mockImplementation(() => {
        throw new ZodError([]);
      });

      await expect(controller.update(uuidv4(), {} as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if actor not found after update', async () => {
      jest.spyOn(UpdateActorCommand, 'validate').mockReturnValue({ actorId: 'id' } as any);
      mockCommandBus.execute.mockResolvedValue(undefined);
      mockActorRepository.findOne.mockResolvedValue(null);

      await expect(controller.update(uuidv4(), {} as any)).rejects.toThrow(NotFoundException);
    });
  });
});
