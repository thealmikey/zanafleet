import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { ActorEntity } from '../../../actor/entities/actor.entity';
import { AddActorToWorkspaceCommand } from '../../commands/add-actor-to-workspace.command';
import { MembershipRole, WorkspaceStatus, WorkspaceType } from '../../dto/workspace.enums';
import { MembershipEntity } from '../../entities/membership.entity';
import { WorkspaceEntity } from '../../entities/workspace.entity';
import { ActorAddedToWorkspaceEventV1 } from '../../events/actor-added-to-workspace.event';
import { AddActorToWorkspaceCommandHandler } from '../../handlers/add-actor-to-workspace.handler';

describe('AddActorToWorkspaceCommandHandler', () => {
  let handler: AddActorToWorkspaceCommandHandler;
  let membershipRepository: jest.Mocked<Repository<MembershipEntity>>;
  let workspaceRepository: jest.Mocked<Repository<WorkspaceEntity>>;
  let actorRepository: jest.Mocked<Repository<ActorEntity>>;
  let eventBus: jest.Mocked<EventBus>;

  const mockWorkspace: Partial<WorkspaceEntity> = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    orgId: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Test Workspace',
    type: WorkspaceType.SACCO,
    status: WorkspaceStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockActor: Partial<ActorEntity> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
  };

  const validCommand = new AddActorToWorkspaceCommand({
    actorId: '123e4567-e89b-12d3-a456-426614174000',
    workspaceId: '123e4567-e89b-12d3-a456-426614174001',
    role: MembershipRole.RIDER,
  });

  beforeEach(() => {
    membershipRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<MembershipEntity>>;

    workspaceRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<WorkspaceEntity>>;

    actorRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<ActorEntity>>;

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new AddActorToWorkspaceCommandHandler(
      membershipRepository,
      workspaceRepository,
      actorRepository,
      eventBus
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully add actor to workspace', async () => {
      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
      actorRepository.findOne.mockResolvedValue(mockActor as ActorEntity);
      membershipRepository.findOne.mockResolvedValue(null);
      membershipRepository.save.mockResolvedValue({} as MembershipEntity);

      await handler.execute(validCommand);

      expect(workspaceRepository.findOne).toHaveBeenCalledWith({
        where: { id: validCommand.workspaceId },
      });
      expect(actorRepository.findOne).toHaveBeenCalledWith({
        where: { id: validCommand.actorId },
      });
      expect(membershipRepository.findOne).toHaveBeenCalledWith({
        where: {
          actorId: validCommand.actorId,
          workspaceId: validCommand.workspaceId,
        },
      });
      expect(membershipRepository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException when workspace does not exist', async () => {
      workspaceRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(validCommand)).rejects.toThrow(
        `Workspace with ID '${validCommand.workspaceId}' does not exist`
      );

      expect(actorRepository.findOne).not.toHaveBeenCalled();
      expect(membershipRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when workspace is SUSPENDED', async () => {
      const suspendedWorkspace = {
        ...mockWorkspace,
        status: WorkspaceStatus.SUSPENDED,
      };
      workspaceRepository.findOne.mockResolvedValue(suspendedWorkspace as WorkspaceEntity);

      await expect(handler.execute(validCommand)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(validCommand)).rejects.toThrow(
        `Cannot add actor to suspended workspace '${validCommand.workspaceId}'`
      );

      expect(actorRepository.findOne).not.toHaveBeenCalled();
      expect(membershipRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when actor does not exist', async () => {
      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
      actorRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(validCommand)).rejects.toThrow(
        `Actor with ID '${validCommand.actorId}' does not exist`
      );

      expect(membershipRepository.findOne).not.toHaveBeenCalled();
      expect(membershipRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when actor is already a member', async () => {
      const existingMembership: Partial<MembershipEntity> = {
        actorId: validCommand.actorId,
        workspaceId: validCommand.workspaceId,
        role: MembershipRole.RIDER,
        since: new Date(),
      };

      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
      actorRepository.findOne.mockResolvedValue(mockActor as ActorEntity);
      membershipRepository.findOne.mockResolvedValue(existingMembership as MembershipEntity);

      await expect(handler.execute(validCommand)).rejects.toThrow(ConflictException);
      await expect(handler.execute(validCommand)).rejects.toThrow(
        `Actor '${validCommand.actorId}' is already a member of workspace '${validCommand.workspaceId}'`
      );

      expect(membershipRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should emit correct event on success', async () => {
      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
      actorRepository.findOne.mockResolvedValue(mockActor as ActorEntity);
      membershipRepository.findOne.mockResolvedValue(null);
      membershipRepository.save.mockResolvedValue({} as MembershipEntity);

      await handler.execute(validCommand);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const emittedEvent = eventBus.publish.mock.calls[0][0] as ActorAddedToWorkspaceEventV1;

      expect(emittedEvent).toBeInstanceOf(ActorAddedToWorkspaceEventV1);
      expect(emittedEvent.actorId).toBe(validCommand.actorId);
      expect(emittedEvent.workspaceId).toBe(validCommand.workspaceId);
      expect(emittedEvent.role).toBe(validCommand.role);
      expect(emittedEvent.aggregateType).toBe('Workspace');
      expect(emittedEvent.eventType).toBe('ActorAddedToWorkspaceEvent-V1');
      expect(emittedEvent.eventId).toBeDefined();
      expect(emittedEvent.since).toBeInstanceOf(Date);
      expect(emittedEvent.occurredAt).toBeInstanceOf(Date);
    });

    it('should persist membership with correct data', async () => {
      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
      actorRepository.findOne.mockResolvedValue(mockActor as ActorEntity);
      membershipRepository.findOne.mockResolvedValue(null);
      membershipRepository.save.mockResolvedValue({} as MembershipEntity);

      await handler.execute(validCommand);

      expect(membershipRepository.save).toHaveBeenCalledTimes(1);
      const savedMembership = membershipRepository.save.mock.calls[0][0] as MembershipEntity;

      expect(savedMembership.actorId).toBe(validCommand.actorId);
      expect(savedMembership.workspaceId).toBe(validCommand.workspaceId);
      expect(savedMembership.role).toBe(validCommand.role);
      expect(savedMembership.since).toBeInstanceOf(Date);
    });
  });
});
