import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { RemoveActorFromWorkspaceCommand } from '../../commands/remove-actor-from-workspace.command';
import { MembershipRole } from '../../dto/workspace.enums';
import { MembershipEntity } from '../../entities/membership.entity';
import { ActorRemovedFromWorkspaceEventV1 } from '../../events/actor-removed-from-workspace.event';
import { RemoveActorFromWorkspaceCommandHandler } from '../../handlers/remove-actor-from-workspace.handler';

describe('RemoveActorFromWorkspaceCommandHandler', () => {
  let handler: RemoveActorFromWorkspaceCommandHandler;
  let membershipRepository: jest.Mocked<Repository<MembershipEntity>>;
  let eventBus: jest.Mocked<EventBus>;

  const mockMembership: Partial<MembershipEntity> = {
    actorId: '123e4567-e89b-12d3-a456-426614174000',
    workspaceId: '123e4567-e89b-12d3-a456-426614174001',
    role: MembershipRole.RIDER,
    since: new Date('2024-01-01'),
  };

  const validCommand = new RemoveActorFromWorkspaceCommand({
    actorId: '123e4567-e89b-12d3-a456-426614174000',
    workspaceId: '123e4567-e89b-12d3-a456-426614174001',
  });

  beforeEach(() => {
    membershipRepository = {
      findOne: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<MembershipEntity>>;

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new RemoveActorFromWorkspaceCommandHandler(membershipRepository, eventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully remove actor from workspace', async () => {
      membershipRepository.findOne.mockResolvedValue(mockMembership as MembershipEntity);
      membershipRepository.remove.mockResolvedValue(mockMembership as MembershipEntity);

      await handler.execute(validCommand);

      expect(membershipRepository.findOne).toHaveBeenCalledWith({
        where: {
          actorId: validCommand.actorId,
          workspaceId: validCommand.workspaceId,
        },
      });
      expect(membershipRepository.remove).toHaveBeenCalledWith(mockMembership);
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException when membership does not exist', async () => {
      membershipRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(validCommand)).rejects.toThrow(
        `Actor '${validCommand.actorId}' is not a member of workspace '${validCommand.workspaceId}'`
      );

      expect(membershipRepository.remove).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should emit correct event on success', async () => {
      membershipRepository.findOne.mockResolvedValue(mockMembership as MembershipEntity);
      membershipRepository.remove.mockResolvedValue(mockMembership as MembershipEntity);

      await handler.execute(validCommand);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const emittedEvent = eventBus.publish.mock.calls[0][0] as ActorRemovedFromWorkspaceEventV1;

      expect(emittedEvent).toBeInstanceOf(ActorRemovedFromWorkspaceEventV1);
      expect(emittedEvent.actorId).toBe(validCommand.actorId);
      expect(emittedEvent.workspaceId).toBe(validCommand.workspaceId);
      expect(emittedEvent.aggregateType).toBe('Workspace');
      expect(emittedEvent.eventType).toBe('ActorRemovedFromWorkspaceEvent-V1');
      expect(emittedEvent.eventId).toBeDefined();
      expect(emittedEvent.removedAt).toBeInstanceOf(Date);
      expect(emittedEvent.occurredAt).toBeInstanceOf(Date);
    });
  });
});
