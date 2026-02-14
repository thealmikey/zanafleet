import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { InteractionEventEntity, InteractionEventType, InteractionActorType } from '../../entities/interaction-event.entity';
import { InteractionEventRepository } from '../../repositories/interaction-event.repository';

describe('InteractionEventRepository', () => {
  let repository: InteractionEventRepository;
  let mockRepository: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    };

    mockDataSource = {
      createQueryBuilder: jest.fn(),
      manager: {
        save: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
      },
      transaction: jest.fn(async (callback) => {
        return callback(mockDataSource.manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionEventRepository,
        { provide: getRepositoryToken(InteractionEventEntity), useValue: mockRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    repository = module.get<InteractionEventRepository>(InteractionEventRepository);
  });

  describe('findById', () => {
    it('should find an event by ID', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        streamId: 'stream-123',
        actorId: 'user-1',
        actorType: InteractionActorType.USER,
        eventType: InteractionEventType.HUMAN_MESSAGE,
        payload: { message: 'Hello' },
        createdAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockEvent);

      // Act
      const result = await repository.findById('event-123');

      // Assert
      expect(result).toEqual(mockEvent);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'event-123' },
        relations: ['stream'],
      });
    });

    it('should return null when event not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await repository.findById('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByStreamId', () => {
    it('should find all events for a stream', async () => {
      // Arrange
      const mockEvents = [
        {
          id: 'event-1',
          streamId: 'stream-123',
          actorId: 'user-1',
          actorType: InteractionActorType.USER,
          eventType: InteractionEventType.HUMAN_MESSAGE,
          payload: { message: 'Hello' },
          createdAt: new Date(),
        },
        {
          id: 'event-2',
          streamId: 'stream-123',
          actorId: 'ai-agent-1',
          actorType: InteractionActorType.AI_AGENT,
          eventType: InteractionEventType.AI_RESPONSE,
          payload: { message: 'Hi there!' },
          createdAt: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(mockEvents);

      // Act
      const result = await repository.findByStreamId('stream-123');

      // Assert
      expect(result).toEqual(mockEvents);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { streamId: 'stream-123' },
        order: { createdAt: 'ASC' },
        relations: ['stream'],
      });
    });

    it('should return empty array when no events found', async () => {
      // Arrange
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await repository.findByStreamId('stream-empty');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findByStreamIdPaginated', () => {
    it('should find events with pagination', async () => {
      // Arrange
      const mockEvents = [
        { id: 'event-1', streamId: 'stream-123' },
        { id: 'event-2', streamId: 'stream-123' },
      ];

      mockRepository.find.mockResolvedValue(mockEvents);

      // Act
      const result = await repository.findByStreamIdPaginated('stream-123', 10, 0);

      // Assert
      expect(result).toEqual(mockEvents);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { streamId: 'stream-123' },
        order: { createdAt: 'DESC' },
        take: 10,
        skip: 0,
        relations: ['stream'],
      });
    });
  });

  describe('findByActorId', () => {
    it('should find events by actor ID', async () => {
      // Arrange
      const mockEvents = [
        { id: 'event-1', actorId: 'user-1' },
        { id: 'event-2', actorId: 'user-1' },
      ];

      mockRepository.find.mockResolvedValue(mockEvents);

      // Act
      const result = await repository.findByActorId('user-1');

      // Assert
      expect(result).toEqual(mockEvents);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { actorId: 'user-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findByActorType', () => {
    it('should find events by actor type', async () => {
      // Arrange
      const mockEvents = [
        { id: 'event-1', actorType: InteractionActorType.AI_AGENT },
        { id: 'event-2', actorType: InteractionActorType.AI_AGENT },
      ];

      mockRepository.find.mockResolvedValue(mockEvents);

      // Act
      const result = await repository.findByActorType(InteractionActorType.AI_AGENT);

      // Assert
      expect(result).toEqual(mockEvents);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { actorType: InteractionActorType.AI_AGENT },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findByEventType', () => {
    it('should find events by event type', async () => {
      // Arrange
      const mockEvents = [
        { id: 'event-1', eventType: InteractionEventType.HUMAN_MESSAGE },
      ];

      mockRepository.find.mockResolvedValue(mockEvents);

      // Act
      const result = await repository.findByEventType(InteractionEventType.HUMAN_MESSAGE);

      // Assert
      expect(result).toEqual(mockEvents);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { eventType: InteractionEventType.HUMAN_MESSAGE },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('appendToStream', () => {
    it('should append an event to a stream', async () => {
      // Arrange
      const eventData = {
        id: 'event-new',
        actorId: 'user-1',
        actorType: InteractionActorType.USER,
        eventType: InteractionEventType.HUMAN_MESSAGE,
        payload: { message: 'New message' },
        createdAt: new Date(),
      };

      // Mock the stream entity that should be found
      const mockStream = {
        id: 'stream-123',
        participantIds: ['user-1'],
      };

      // Mock manager methods used in transaction
      mockDataSource.manager.findOne.mockResolvedValue(mockStream);
      mockDataSource.manager.create.mockReturnValue(eventData);
      mockDataSource.manager.save.mockResolvedValue({
        ...eventData,
        streamId: 'stream-123',
      });

      // Act
      const result = await repository.appendToStream('stream-123', eventData);

      // Assert
      expect(result).toBeDefined();
      expect(mockDataSource.manager.findOne).toHaveBeenCalled();
      expect(mockDataSource.manager.save).toHaveBeenCalled();
    });
  });

  describe('countByStreamId', () => {
    it('should count events in a stream', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(5);

      // Act
      const result = await repository.countByStreamId('stream-123');

      // Assert
      expect(result).toBe(5);
      expect(mockRepository.count).toHaveBeenCalledWith({ where: { streamId: 'stream-123' } });
    });
  });
});
