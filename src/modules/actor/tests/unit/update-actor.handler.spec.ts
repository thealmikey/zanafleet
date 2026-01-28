import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundException } from '@nestjs/common';

import { UpdateActorCommandHandler } from '../../handlers/update-actor.handler';
import { UpdateActorCommand } from '../../commands/update-actor.command';
import { ActorEntity } from '../../entities/actor.entity';
import { EventBusService } from '../../../../core/event-bus';
import { ActorUpdatedEventV1 } from '../../events/actor-updated.event';
import { ActorType } from '../../dto/actor.enums';

describe('UpdateActorCommandHandler', () => {
  let handler: UpdateActorCommandHandler;
  let actorRepository: Repository<ActorEntity>;
  let eventBus: EventBus;
  let eventBusService: EventBusService;

  const mockActorRepository = {
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
        UpdateActorCommandHandler,
        {
          provide: getRepositoryToken(ActorEntity),
          useValue: mockActorRepository,
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

    handler = module.get<UpdateActorCommandHandler>(UpdateActorCommandHandler);
    actorRepository = module.get<Repository<ActorEntity>>(
      getRepositoryToken(ActorEntity),
    );
    eventBus = module.get<EventBus>(EventBus);
    eventBusService = module.get<EventBusService>(EventBusService);

    jest.clearAllMocks();
  });

  it('should successfully update an actor and emit events', async () => {
    const actorId = uuidv4();
    const roles = [uuidv4()];
    const command = new UpdateActorCommand({
      actorId,
      roles,
    });

    const existingActor = new ActorEntity();
    existingActor.id = actorId;
    existingActor.roles = [];
    existingActor.linkedWallets = [];
    existingActor.type = ActorType.Rider;
    existingActor.workspaceId = uuidv4();

    mockActorRepository.findOne.mockResolvedValue(existingActor);
    mockActorRepository.save.mockResolvedValue({ ...existingActor, roles });

    await handler.execute(command);

    expect(actorRepository.findOne).toHaveBeenCalledWith({
      where: { id: actorId },
    });
    expect(actorRepository.save).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(ActorUpdatedEventV1),
    );
    expect(eventBusService.publish).toHaveBeenCalled();
  });

  it('should throw NotFoundException if actor does not exist', async () => {
    const actorId = uuidv4();
    const command = new UpdateActorCommand({
      actorId,
      roles: ['role1'],
    });

    mockActorRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(actorRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should not update or emit if no changes are provided', async () => {
    const actorId = uuidv4();
    const command = new UpdateActorCommand({
      actorId,
    });

    const existingActor = new ActorEntity();
    existingActor.id = actorId;

    mockActorRepository.findOne.mockResolvedValue(existingActor);

    await handler.execute(command);

    expect(actorRepository.findOne).toHaveBeenCalled();
    expect(actorRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
