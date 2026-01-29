import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { ActorEntity } from '../../../actor/entities/actor.entity';
import { WorkspaceEntity } from '../../../workspace/entities/workspace.entity';
import { CreateActorCommand } from '../../commands/create-actor.command';
import { ActorType } from '../../dto/actor.enums';
import { ActorOnboardedEventV1 } from '../../events/actor-onboarded.event';
import { CreateActorCommandHandler } from '../../handlers/create-actor.handler';

describe('CreateActorCommandHandler', () => {
  let handler: CreateActorCommandHandler;
  let actorRepository: jest.Mocked<Repository<ActorEntity>>;
  let workspaceRepository: jest.Mocked<Repository<WorkspaceEntity>>;
  let eventBus: jest.Mocked<EventBus>;

  const mockWorkspace: Partial<WorkspaceEntity> = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    roleTemplates: ['role-1-uuid', 'role-2-uuid'],
  };

  const validCommand = new CreateActorCommand({
    type: ActorType.Internal,
    workspaceId: '123e4567-e89b-12d3-a456-426614174001',
    roles: ['role-1-uuid'],
    linkedWallets: ['wallet-uuid-123'],
  });

  beforeEach(() => {
    actorRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<ActorEntity>>;

    workspaceRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<WorkspaceEntity>>;

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new CreateActorCommandHandler(
      actorRepository,
      workspaceRepository,
      eventBus,
      undefined,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully create actor and emit ActorOnboardedEventV1', async () => {
      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
      actorRepository.save.mockResolvedValue({} as ActorEntity);

      const actorId = await handler.execute(validCommand);

      expect(actorId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(workspaceRepository.findOne).toHaveBeenCalledWith({
        where: { id: validCommand.workspaceId },
      });
      expect(actorRepository.save).toHaveBeenCalledTimes(1);

      const savedActor = actorRepository.save.mock.calls[0][0] as ActorEntity;
      expect(savedActor).toMatchObject({
        id: actorId,
        workspaceId: validCommand.workspaceId,
        type: validCommand.type,
        roles: validCommand.roles,
        linkedWallets: validCommand.linkedWallets,
      });

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const emittedEvent = eventBus.publish.mock.calls[0][0] as ActorOnboardedEventV1;

      expect(emittedEvent).toBeInstanceOf(ActorOnboardedEventV1);
      expect(emittedEvent.actorId).toBe(actorId);
      expect(emittedEvent.workspaceId).toBe(validCommand.workspaceId);
      expect(emittedEvent.roles).toEqual(validCommand.roles);
      expect(emittedEvent.type).toBe(validCommand.type);
      expect(emittedEvent.linkedWallets).toEqual(validCommand.linkedWallets);
    });

    it('should throw NotFoundException when workspace does not exist', async () => {
      workspaceRepository.findOne.mockResolvedValue(null);

      const execution = handler.execute(validCommand);

      await expect(execution).rejects.toThrow(NotFoundException);
      await expect(execution).rejects.toThrow(
        `Workspace with ID ${validCommand.workspaceId} does not exist`,
      );

      expect(actorRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when roles are invalid for workspace', async () => {
      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);

      const invalidCommand = new CreateActorCommand({
        ...validCommand,
        roles: ['invalid-role'],
      });

      const execution = handler.execute(invalidCommand);

      await expect(execution).rejects.toThrow(BadRequestException);
      await expect(execution).rejects.toThrow(
        `The following roles are not valid for workspace ${invalidCommand.workspaceId}: invalid-role`,
      );

      expect(actorRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
