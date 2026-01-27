import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { UpdateCommitmentStatusCommand } from '../../commands/update-commitment-status.command';
import { CommitmentStatus, CommitmentType } from '../../dto/commitment.enums';
import { CommitmentEntity } from '../../entities/commitment.entity';
import { CommitmentStatusChangedEventV1 } from '../../events/commitment-status-changed.event';
import { UpdateCommitmentStatusCommandHandler } from '../../handlers/update-commitment-status.handler';

describe('UpdateCommitmentStatusCommandHandler', () => {
  let handler: UpdateCommitmentStatusCommandHandler;
  let commitmentRepository: jest.Mocked<Repository<CommitmentEntity>>;
  let eventBus: jest.Mocked<EventBus>;

  const createMockCommitment = (status: CommitmentStatus): Partial<CommitmentEntity> => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    actorId: '123e4567-e89b-12d3-a456-426614174001',
    workspaceId: '123e4567-e89b-12d3-a456-426614174002',
    type: CommitmentType.DELIVERY,
    status,
    description: 'Test commitment',
    dueAt: new Date('2024-12-31'),
    fulfilledAt: null,
    breachedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  });

  beforeEach(() => {
    commitmentRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<CommitmentEntity>>;

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new UpdateCommitmentStatusCommandHandler(
      commitmentRepository,
      eventBus,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully transition PENDING -> FULFILLED', async () => {
      const commitment = createMockCommitment(CommitmentStatus.PENDING);
      commitmentRepository.findOne.mockResolvedValue(commitment as CommitmentEntity);
      commitmentRepository.save.mockResolvedValue(commitment as CommitmentEntity);

      const command = new UpdateCommitmentStatusCommand({
        commitmentId: commitment.id!,
        newStatus: CommitmentStatus.FULFILLED,
      });

      await handler.execute(command);

      expect(commitmentRepository.save).toHaveBeenCalledTimes(1);
      const savedCommitment = commitmentRepository.save.mock.calls[0][0] as CommitmentEntity;
      expect(savedCommitment.status).toBe(CommitmentStatus.FULFILLED);
      expect(savedCommitment.fulfilledAt).toBeInstanceOf(Date);
      expect(savedCommitment.breachedAt).toBeNull();

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const emittedEvent = eventBus.publish.mock.calls[0][0] as CommitmentStatusChangedEventV1;
      expect(emittedEvent.previousStatus).toBe(CommitmentStatus.PENDING);
      expect(emittedEvent.newStatus).toBe(CommitmentStatus.FULFILLED);
    });

    it('should successfully transition PENDING -> BREACHED', async () => {
      const commitment = createMockCommitment(CommitmentStatus.PENDING);
      commitmentRepository.findOne.mockResolvedValue(commitment as CommitmentEntity);
      commitmentRepository.save.mockResolvedValue(commitment as CommitmentEntity);

      const command = new UpdateCommitmentStatusCommand({
        commitmentId: commitment.id!,
        newStatus: CommitmentStatus.BREACHED,
      });

      await handler.execute(command);

      expect(commitmentRepository.save).toHaveBeenCalledTimes(1);
      const savedCommitment = commitmentRepository.save.mock.calls[0][0] as CommitmentEntity;
      expect(savedCommitment.status).toBe(CommitmentStatus.BREACHED);
      expect(savedCommitment.breachedAt).toBeInstanceOf(Date);
      expect(savedCommitment.fulfilledAt).toBeNull();

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const emittedEvent = eventBus.publish.mock.calls[0][0] as CommitmentStatusChangedEventV1;
      expect(emittedEvent.previousStatus).toBe(CommitmentStatus.PENDING);
      expect(emittedEvent.newStatus).toBe(CommitmentStatus.BREACHED);
    });

    it('should successfully transition PENDING -> CANCELLED', async () => {
      const commitment = createMockCommitment(CommitmentStatus.PENDING);
      commitmentRepository.findOne.mockResolvedValue(commitment as CommitmentEntity);
      commitmentRepository.save.mockResolvedValue(commitment as CommitmentEntity);

      const command = new UpdateCommitmentStatusCommand({
        commitmentId: commitment.id!,
        newStatus: CommitmentStatus.CANCELLED,
      });

      await handler.execute(command);

      expect(commitmentRepository.save).toHaveBeenCalledTimes(1);
      const savedCommitment = commitmentRepository.save.mock.calls[0][0] as CommitmentEntity;
      expect(savedCommitment.status).toBe(CommitmentStatus.CANCELLED);
      expect(savedCommitment.fulfilledAt).toBeNull();
      expect(savedCommitment.breachedAt).toBeNull();

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for FULFILLED -> BREACHED (illegal transition)', async () => {
      const commitment = createMockCommitment(CommitmentStatus.FULFILLED);
      commitmentRepository.findOne.mockResolvedValue(commitment as CommitmentEntity);

      const command = new UpdateCommitmentStatusCommand({
        commitmentId: commitment.id!,
        newStatus: CommitmentStatus.BREACHED,
      });

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        "Invalid status transition from 'FULFILLED' to 'BREACHED'",
      );

      expect(commitmentRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for BREACHED -> PENDING (illegal transition)', async () => {
      const commitment = createMockCommitment(CommitmentStatus.BREACHED);
      commitmentRepository.findOne.mockResolvedValue(commitment as CommitmentEntity);

      const command = new UpdateCommitmentStatusCommand({
        commitmentId: commitment.id!,
        newStatus: CommitmentStatus.PENDING,
      });

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        "Invalid status transition from 'BREACHED' to 'PENDING'",
      );

      expect(commitmentRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for CANCELLED -> FULFILLED (illegal transition)', async () => {
      const commitment = createMockCommitment(CommitmentStatus.CANCELLED);
      commitmentRepository.findOne.mockResolvedValue(commitment as CommitmentEntity);

      const command = new UpdateCommitmentStatusCommand({
        commitmentId: commitment.id!,
        newStatus: CommitmentStatus.FULFILLED,
      });

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        "Invalid status transition from 'CANCELLED' to 'FULFILLED'",
      );

      expect(commitmentRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when commitment does not exist', async () => {
      commitmentRepository.findOne.mockResolvedValue(null);

      const command = new UpdateCommitmentStatusCommand({
        commitmentId: '123e4567-e89b-12d3-a456-426614174000',
        newStatus: CommitmentStatus.FULFILLED,
      });

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow(
        "Commitment with ID '123e4567-e89b-12d3-a456-426614174000' does not exist",
      );

      expect(commitmentRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should emit correct event with all properties', async () => {
      const commitment = createMockCommitment(CommitmentStatus.PENDING);
      commitmentRepository.findOne.mockResolvedValue(commitment as CommitmentEntity);
      commitmentRepository.save.mockResolvedValue(commitment as CommitmentEntity);

      const command = new UpdateCommitmentStatusCommand({
        commitmentId: commitment.id!,
        newStatus: CommitmentStatus.FULFILLED,
      });

      await handler.execute(command);

      const emittedEvent = eventBus.publish.mock.calls[0][0] as CommitmentStatusChangedEventV1;
      expect(emittedEvent).toBeInstanceOf(CommitmentStatusChangedEventV1);
      expect(emittedEvent.commitmentId).toBe(commitment.id);
      expect(emittedEvent.previousStatus).toBe(CommitmentStatus.PENDING);
      expect(emittedEvent.newStatus).toBe(CommitmentStatus.FULFILLED);
      expect(emittedEvent.changedAt).toBeInstanceOf(Date);
      expect(emittedEvent.occurredAt).toBeInstanceOf(Date);
      expect(emittedEvent.aggregateType).toBe('Commitment');
      expect(emittedEvent.eventType).toBe('CommitmentStatusChangedEvent-V1');
      expect(emittedEvent.eventId).toBeDefined();
    });

    it('should not emit event if persistence fails', async () => {
      const commitment = createMockCommitment(CommitmentStatus.PENDING);
      commitmentRepository.findOne.mockResolvedValue(commitment as CommitmentEntity);
      commitmentRepository.save.mockRejectedValue(new Error('Database error'));

      const command = new UpdateCommitmentStatusCommand({
        commitmentId: commitment.id!,
        newStatus: CommitmentStatus.FULFILLED,
      });

      await expect(handler.execute(command)).rejects.toThrow('Database error');
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
