import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { ActorEntity } from '../../../actor/entities/actor.entity';
import { WorkspaceStatus, WorkspaceType } from '../../../workspace/dto/workspace.enums';
import { WorkspaceEntity } from '../../../workspace/entities/workspace.entity';
import { CreateCommitmentCommand } from '../../commands/create-commitment.command';
import { CommitmentStatus, CommitmentType } from '../../dto/commitment.enums';
import { CommitmentEntity } from '../../entities/commitment.entity';
import { CommitmentCreatedEventV1 } from '../../events/commitment-created.event';
import { CreateCommitmentCommandHandler } from '../../handlers/create-commitment.handler';

describe('CreateCommitmentCommandHandler', () => {
  let handler: CreateCommitmentCommandHandler;
  let commitmentRepository: jest.Mocked<Repository<CommitmentEntity>>;
  let actorRepository: jest.Mocked<Repository<ActorEntity>>;
  let workspaceRepository: jest.Mocked<Repository<WorkspaceEntity>>;
  let eventBus: jest.Mocked<EventBus>;

  const mockActor: Partial<ActorEntity> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
  };

  const mockWorkspace: Partial<WorkspaceEntity> = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    orgId: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Test Workspace',
    type: WorkspaceType.SACCO,
    status: WorkspaceStatus.ACTIVE,
  };

  const validCommand = new CreateCommitmentCommand({
    actorId: '123e4567-e89b-12d3-a456-426614174000',
    workspaceId: '123e4567-e89b-12d3-a456-426614174001',
    type: CommitmentType.DELIVERY,
    description: 'Deliver package to customer',
    dueAt: new Date('2024-12-31T23:59:59Z'),
  });

  beforeEach(() => {
    commitmentRepository = {
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<CommitmentEntity>>;

    actorRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<ActorEntity>>;

    workspaceRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<WorkspaceEntity>>;

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new CreateCommitmentCommandHandler(
      commitmentRepository,
      actorRepository,
      workspaceRepository,
      eventBus
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully create commitment and return commitmentId', async () => {
      actorRepository.findOne.mockResolvedValue(mockActor as ActorEntity);
      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
      commitmentRepository.save.mockResolvedValue({} as CommitmentEntity);

      const result = await handler.execute(validCommand);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should validate actor exists', async () => {
      actorRepository.findOne.mockResolvedValue(mockActor as ActorEntity);
      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
      commitmentRepository.save.mockResolvedValue({} as CommitmentEntity);

      await handler.execute(validCommand);

      expect(actorRepository.findOne).toHaveBeenCalledWith({
        where: { id: validCommand.actorId },
      });
    });

    it('should validate workspace exists', async () => {
      actorRepository.findOne.mockResolvedValue(mockActor as ActorEntity);
      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
      commitmentRepository.save.mockResolvedValue({} as CommitmentEntity);

      await handler.execute(validCommand);

      expect(workspaceRepository.findOne).toHaveBeenCalledWith({
        where: { id: validCommand.workspaceId },
      });
    });

    it('should throw NotFoundException when actor does not exist', async () => {
      actorRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(validCommand)).rejects.toThrow(
        `Actor with ID '${validCommand.actorId}' does not exist`
      );

      expect(workspaceRepository.findOne).not.toHaveBeenCalled();
      expect(commitmentRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when workspace does not exist', async () => {
      actorRepository.findOne.mockResolvedValue(mockActor as ActorEntity);
      workspaceRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(validCommand)).rejects.toThrow(
        `Workspace with ID '${validCommand.workspaceId}' does not exist`
      );

      expect(commitmentRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should persist commitment with correct data', async () => {
      actorRepository.findOne.mockResolvedValue(mockActor as ActorEntity);
      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
      commitmentRepository.save.mockResolvedValue({} as CommitmentEntity);

      await handler.execute(validCommand);

      expect(commitmentRepository.save).toHaveBeenCalledTimes(1);
      const savedEntity = commitmentRepository.save.mock.calls[0][0] as CommitmentEntity;

      expect(savedEntity.actorId).toBe(validCommand.actorId);
      expect(savedEntity.workspaceId).toBe(validCommand.workspaceId);
      expect(savedEntity.type).toBe(CommitmentType.DELIVERY);
      expect(savedEntity.status).toBe(CommitmentStatus.PENDING);
      expect(savedEntity.description).toBe('Deliver package to customer');
      expect(savedEntity.dueAt).toEqual(validCommand.dueAt);
      expect(savedEntity.fulfilledAt).toBeNull();
      expect(savedEntity.breachedAt).toBeNull();
    });

    it('should emit CommitmentCreatedEvent-V1 on success', async () => {
      actorRepository.findOne.mockResolvedValue(mockActor as ActorEntity);
      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
      commitmentRepository.save.mockResolvedValue({} as CommitmentEntity);

      await handler.execute(validCommand);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const emittedEvent = eventBus.publish.mock.calls[0][0] as CommitmentCreatedEventV1;

      expect(emittedEvent).toBeInstanceOf(CommitmentCreatedEventV1);
      expect(emittedEvent.actorId).toBe(validCommand.actorId);
      expect(emittedEvent.workspaceId).toBe(validCommand.workspaceId);
      expect(emittedEvent.type).toBe(CommitmentType.DELIVERY);
      expect(emittedEvent.status).toBe(CommitmentStatus.PENDING);
      expect(emittedEvent.description).toBe('Deliver package to customer');
      expect(emittedEvent.dueAt).toEqual(validCommand.dueAt);
      expect(emittedEvent.aggregateType).toBe('Commitment');
      expect(emittedEvent.eventType).toBe('CommitmentCreatedEvent-V1');
      expect(emittedEvent.eventVersion).toBe('1.0.0');
      expect(emittedEvent.eventId).toBeDefined();
      expect(emittedEvent.commitmentId).toBeDefined();
      expect(emittedEvent.createdAt).toBeInstanceOf(Date);
      expect(emittedEvent.occurredAt).toBeInstanceOf(Date);
    });

    it('should not emit event if persistence fails', async () => {
      actorRepository.findOne.mockResolvedValue(mockActor as ActorEntity);
      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
      commitmentRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(handler.execute(validCommand)).rejects.toThrow('Database error');

      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle all commitment types', async () => {
      actorRepository.findOne.mockResolvedValue(mockActor as ActorEntity);
      workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
      commitmentRepository.save.mockResolvedValue({} as CommitmentEntity);

      const types = [
        CommitmentType.DELIVERY,
        CommitmentType.PAYMENT,
        CommitmentType.SERVICE,
        CommitmentType.AVAILABILITY,
      ];

      for (const type of types) {
        jest.clearAllMocks();
        actorRepository.findOne.mockResolvedValue(mockActor as ActorEntity);
        workspaceRepository.findOne.mockResolvedValue(mockWorkspace as WorkspaceEntity);
        commitmentRepository.save.mockResolvedValue({} as CommitmentEntity);

        const command = new CreateCommitmentCommand({
          ...validCommand,
          type,
        });

        await handler.execute(command);

        const savedEntity = commitmentRepository.save.mock.calls[0][0] as CommitmentEntity;
        expect(savedEntity.type).toBe(type);
      }
    });
  });
});
