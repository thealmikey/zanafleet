import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { CreateEvidenceCommand } from '../../commands/create-evidence.command';
import { EvidenceType, SubjectType, EvidenceSource } from '../../dto/evidence.enums';
import { EvidenceEntity } from '../../entities/evidence.entity';
import { EvidenceCreatedEventV1 } from '../../events/evidence-created.event';
import { CreateEvidenceCommandHandler } from '../../handlers/create-evidence.handler';

describe('CreateEvidenceCommandHandler', () => {
  let handler: CreateEvidenceCommandHandler;
  let evidenceRepository: jest.Mocked<Repository<EvidenceEntity>>;
  let eventBus: jest.Mocked<EventBus>;

  const validCommand = new CreateEvidenceCommand({
    type: EvidenceType.CUSTOMER_FEEDBACK,
    actorId: '123e4567-e89b-12d3-a456-426614174000',
    workspaceId: '123e4567-e89b-12d3-a456-426614174001',
    subjectType: SubjectType.RIDER,
    subjectId: '123e4567-e89b-12d3-a456-426614174002',
    payload: { rating: 5, comment: 'Excellent!' },
    source: EvidenceSource.API,
    commandId: '123e4567-e89b-12d3-a456-426614174003',
  });

  const existingEvidence: Partial<EvidenceEntity> = {
    id: 'existing-evidence-id-456',
    type: EvidenceType.CUSTOMER_FEEDBACK,
    actorId: '123e4567-e89b-12d3-a456-426614174000',
    workspaceId: '123e4567-e89b-12d3-a456-426614174001',
    subjectType: SubjectType.RIDER,
    subjectId: '123e4567-e89b-12d3-a456-426614174002',
    payload: { rating: 5, comment: 'Excellent!' },
    source: EvidenceSource.API,
    commandId: '123e4567-e89b-12d3-a456-426614174003',
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  beforeEach(() => {
    evidenceRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<EvidenceEntity>>;

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new CreateEvidenceCommandHandler(
      evidenceRepository,
      eventBus,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully create evidence', async () => {
      evidenceRepository.findOne.mockResolvedValue(null);
      evidenceRepository.save.mockResolvedValue({} as EvidenceEntity);

      const result = await handler.execute(validCommand);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      expect(evidenceRepository.findOne).toHaveBeenCalledWith({
        where: { commandId: validCommand.commandId },
      });
      expect(evidenceRepository.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should be idempotent - same commandId returns existing evidenceId without creating duplicate', async () => {
      evidenceRepository.findOne.mockResolvedValue(existingEvidence as EvidenceEntity);

      const result = await handler.execute(validCommand);

      expect(result).toBe('existing-evidence-id-456');
      expect(evidenceRepository.findOne).toHaveBeenCalledWith({
        where: { commandId: validCommand.commandId },
      });
      expect(evidenceRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should emit correct event on success', async () => {
      evidenceRepository.findOne.mockResolvedValue(null);
      evidenceRepository.save.mockResolvedValue({} as EvidenceEntity);

      await handler.execute(validCommand);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const emittedEvent = eventBus.publish.mock.calls[0][0] as EvidenceCreatedEventV1;

      expect(emittedEvent).toBeInstanceOf(EvidenceCreatedEventV1);
      expect(emittedEvent.type).toBe(validCommand.type);
      expect(emittedEvent.actorId).toBe(validCommand.actorId);
      expect(emittedEvent.workspaceId).toBe(validCommand.workspaceId);
      expect(emittedEvent.subjectType).toBe(validCommand.subjectType);
      expect(emittedEvent.subjectId).toBe(validCommand.subjectId);
      expect(emittedEvent.payload).toEqual(validCommand.payload);
      expect(emittedEvent.source).toBe(validCommand.source);
      expect(emittedEvent.commandId).toBe(validCommand.commandId);
      expect(emittedEvent.aggregateType).toBe('Evidence');
      expect(emittedEvent.eventType).toBe('EvidenceCreatedEvent-V1');
      expect(emittedEvent.eventId).toBeDefined();
      expect(emittedEvent.evidenceId).toBeDefined();
      expect(emittedEvent.createdAt).toBeInstanceOf(Date);
      expect(emittedEvent.occurredAt).toBeInstanceOf(Date);
    });

    it('should persist evidence entity with correct data', async () => {
      evidenceRepository.findOne.mockResolvedValue(null);
      evidenceRepository.save.mockResolvedValue({} as EvidenceEntity);

      await handler.execute(validCommand);

      expect(evidenceRepository.save).toHaveBeenCalledTimes(1);
      const savedEntity = evidenceRepository.save.mock.calls[0][0] as EvidenceEntity;

      expect(savedEntity.id).toBeDefined();
      expect(savedEntity.type).toBe(validCommand.type);
      expect(savedEntity.actorId).toBe(validCommand.actorId);
      expect(savedEntity.workspaceId).toBe(validCommand.workspaceId);
      expect(savedEntity.subjectType).toBe(validCommand.subjectType);
      expect(savedEntity.subjectId).toBe(validCommand.subjectId);
      expect(savedEntity.payload).toEqual(validCommand.payload);
      expect(savedEntity.source).toBe(validCommand.source);
      expect(savedEntity.commandId).toBe(validCommand.commandId);
      expect(savedEntity.createdAt).toBeInstanceOf(Date);
    });

    it('should evidence be immutable - no update methods exist on handler', () => {
      expect((handler as unknown as Record<string, unknown>).update).toBeUndefined();
      expect((handler as unknown as Record<string, unknown>).modify).toBeUndefined();
      expect((handler as unknown as Record<string, unknown>).patch).toBeUndefined();
    });

    it('should return different evidenceId for different commandIds', async () => {
      evidenceRepository.findOne.mockResolvedValue(null);
      evidenceRepository.save.mockResolvedValue({} as EvidenceEntity);

      const command1 = new CreateEvidenceCommand({
        ...validCommand,
        commandId: '111e4567-e89b-12d3-a456-426614174001',
      });

      const command2 = new CreateEvidenceCommand({
        ...validCommand,
        commandId: '222e4567-e89b-12d3-a456-426614174002',
      });

      const result1 = await handler.execute(command1);
      const result2 = await handler.execute(command2);

      expect(result1).not.toBe(result2);
      expect(evidenceRepository.save).toHaveBeenCalledTimes(2);
      expect(eventBus.publish).toHaveBeenCalledTimes(2);
    });

    it('should handle repository errors gracefully', async () => {
      evidenceRepository.findOne.mockResolvedValue(null);
      evidenceRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(handler.execute(validCommand)).rejects.toThrow('Database error');
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should check idempotency before any persistence', async () => {
      evidenceRepository.findOne.mockResolvedValue(existingEvidence as EvidenceEntity);

      await handler.execute(validCommand);

      // Verify idempotency check was performed
      expect(evidenceRepository.findOne).toHaveBeenCalledWith({
        where: { commandId: validCommand.commandId },
      });
      // Verify no persistence occurred for duplicate command
      expect(evidenceRepository.save).not.toHaveBeenCalled();
    });
  });
});
