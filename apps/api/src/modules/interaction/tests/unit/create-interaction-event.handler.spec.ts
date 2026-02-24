import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';

import { CreateInteractionEventCommand } from '../../commands/create-interaction-event.command';
import {
  InteractionEventEntity,
  InteractionEventType,
  InteractionActorType,
} from '../../entities/interaction-event.entity';
import {
  InteractionStreamEntity,
  InteractionStreamState,
  InteractionContextType,
} from '../../entities/interaction-stream.entity';
import { CreateInteractionEventCommandHandler } from '../../handlers/create-interaction-event.handler';
import { InteractionEventRepository } from '../../repositories/interaction-event.repository';
import { InteractionStreamRepository } from '../../repositories/interaction-stream.repository';

describe('CreateInteractionEventCommandHandler', () => {
  let handler: CreateInteractionEventCommandHandler;
  let eventRepository: jest.Mocked<InteractionEventRepository>;
  let streamRepository: jest.Mocked<InteractionStreamRepository>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const mockEventRepository = {
      findByStreamId: jest.fn(),
      appendToStream: jest.fn(),
    };

    const mockStreamRepository = {
      findById: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateInteractionEventCommandHandler,
        { provide: InteractionEventRepository, useValue: mockEventRepository },
        { provide: InteractionStreamRepository, useValue: mockStreamRepository },
        { provide: EventBus, useValue: mockEventBus },
      ],
    }).compile();

    handler = module.get<CreateInteractionEventCommandHandler>(
      CreateInteractionEventCommandHandler
    );
    eventRepository = module.get(InteractionEventRepository);
    streamRepository = module.get(InteractionStreamRepository);
    eventBus = module.get(EventBus);
  });

  describe('execute', () => {
    const command = new CreateInteractionEventCommand({
      streamId: 'stream-123',
      actorId: 'user-1',
      actorType: InteractionActorType.USER,
      eventType: InteractionEventType.HUMAN_MESSAGE,
      payload: { message: 'Hello, world!' },
      correlationId: 'corr-123',
      causationId: 'caus-123',
    });

    it('should create an interaction event successfully', async () => {
      // Arrange
      const mockStream: Partial<InteractionStreamEntity> = {
        id: 'stream-123',
        contextType: InteractionContextType.ORDER,
        contextId: 'order-456',
        state: InteractionStreamState.ACTIVE,
        metadata: {},
        participantIds: ['user-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
      };

      streamRepository.findById.mockResolvedValue(mockStream as InteractionStreamEntity);

      const mockEvent: Partial<InteractionEventEntity> = {
        id: 'event-123',
        streamId: 'stream-123',
        actorId: 'user-1',
        actorType: InteractionActorType.USER,
        eventType: InteractionEventType.HUMAN_MESSAGE,
        payload: { message: 'Hello, world!' },
        createdAt: new Date(),
      };

      eventRepository.appendToStream.mockResolvedValue(mockEvent as InteractionEventEntity);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBe('event-123');
      expect(eventRepository.appendToStream).toHaveBeenCalledWith(
        'stream-123',
        expect.objectContaining({
          actorId: 'user-1',
          actorType: InteractionActorType.USER,
          eventType: InteractionEventType.HUMAN_MESSAGE,
          payload: { message: 'Hello, world!' },
        })
      );
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException when stream does not exist', async () => {
      // Arrange
      streamRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should include correlation and causation IDs in the event', async () => {
      // Arrange
      const mockStream: Partial<InteractionStreamEntity> = {
        id: 'stream-123',
        contextType: InteractionContextType.ORDER,
        contextId: 'order-456',
        state: InteractionStreamState.ACTIVE,
        metadata: {},
        participantIds: ['user-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
      };

      streamRepository.findById.mockResolvedValue(mockStream as InteractionStreamEntity);

      const mockEvent: Partial<InteractionEventEntity> = {
        id: 'event-123',
        streamId: 'stream-123',
        actorId: 'user-1',
        actorType: InteractionActorType.USER,
        eventType: InteractionEventType.HUMAN_MESSAGE,
        payload: { message: 'Hello' },
        createdAt: new Date(),
      };

      eventRepository.appendToStream.mockResolvedValue(mockEvent as InteractionEventEntity);

      // Act
      await handler.execute(command);

      // Assert
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'corr-123',
          causationId: 'caus-123',
        })
      );
    });

    it('should handle AI response events', async () => {
      // Arrange
      const aiCommand = new CreateInteractionEventCommand({
        streamId: 'stream-123',
        actorId: 'ai-agent-1',
        actorType: InteractionActorType.AI_AGENT,
        eventType: InteractionEventType.AI_RESPONSE,
        payload: { message: 'Hello, how can I help you?' },
      });

      const mockStream: Partial<InteractionStreamEntity> = {
        id: 'stream-123',
        contextType: InteractionContextType.ORDER,
        contextId: 'order-456',
        state: InteractionStreamState.ACTIVE,
        metadata: {},
        participantIds: ['user-1', 'ai-agent-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
      };

      streamRepository.findById.mockResolvedValue(mockStream as InteractionStreamEntity);

      const mockEvent: Partial<InteractionEventEntity> = {
        id: 'event-456',
        streamId: 'stream-123',
        actorId: 'ai-agent-1',
        actorType: InteractionActorType.AI_AGENT,
        eventType: InteractionEventType.AI_RESPONSE,
        payload: { message: 'Hello, how can I help you?' },
        createdAt: new Date(),
      };

      eventRepository.appendToStream.mockResolvedValue(mockEvent as InteractionEventEntity);

      // Act
      const result = await handler.execute(aiCommand);

      // Assert
      expect(result).toBe('event-456');
      expect(eventRepository.appendToStream).toHaveBeenCalledWith(
        'stream-123',
        expect.objectContaining({
          actorType: InteractionActorType.AI_AGENT,
          eventType: InteractionEventType.AI_RESPONSE,
        })
      );
    });

    it('should handle Slack integration events', async () => {
      // Arrange
      const slackCommand = new CreateInteractionEventCommand({
        streamId: 'stream-123',
        actorId: 'slack-bot-1',
        actorType: InteractionActorType.EXTERNAL_INTEGRATION,
        eventType: InteractionEventType.SLACK_MESSAGE,
        payload: {
          message: 'New message from Slack',
          slackChannelId: 'C12345',
          slackUserId: 'U12345',
        },
      });

      const mockStream: Partial<InteractionStreamEntity> = {
        id: 'stream-123',
        contextType: InteractionContextType.SUPPORT_TICKET,
        contextId: 'ticket-789',
        state: InteractionStreamState.ACTIVE,
        metadata: {},
        participantIds: ['user-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
      };

      streamRepository.findById.mockResolvedValue(mockStream as InteractionStreamEntity);

      const mockEvent: Partial<InteractionEventEntity> = {
        id: 'event-789',
        streamId: 'stream-123',
        actorId: 'slack-bot-1',
        actorType: InteractionActorType.EXTERNAL_INTEGRATION,
        eventType: InteractionEventType.SLACK_MESSAGE,
        payload: {
          message: 'New message from Slack',
          slackChannelId: 'C12345',
          slackUserId: 'U12345',
        },
        createdAt: new Date(),
      };

      eventRepository.appendToStream.mockResolvedValue(mockEvent as InteractionEventEntity);

      // Act
      const result = await handler.execute(slackCommand);

      // Assert
      expect(result).toBe('event-789');
      expect(eventRepository.appendToStream).toHaveBeenCalledWith(
        'stream-123',
        expect.objectContaining({
          actorType: InteractionActorType.EXTERNAL_INTEGRATION,
          eventType: InteractionEventType.SLACK_MESSAGE,
        })
      );
    });

    it('should handle system notification events', async () => {
      // Arrange
      const sysCommand = new CreateInteractionEventCommand({
        streamId: 'stream-123',
        actorId: 'system',
        actorType: InteractionActorType.SYSTEM,
        eventType: InteractionEventType.SYSTEM_NOTIFICATION,
        payload: {
          title: 'Order Delivered',
          message: 'Your order has been delivered successfully',
        },
      });

      const mockStream: Partial<InteractionStreamEntity> = {
        id: 'stream-123',
        contextType: InteractionContextType.ORDER,
        contextId: 'order-456',
        state: InteractionStreamState.ACTIVE,
        metadata: {},
        participantIds: ['user-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
      };

      streamRepository.findById.mockResolvedValue(mockStream as InteractionStreamEntity);

      const mockEvent: Partial<InteractionEventEntity> = {
        id: 'event-sys',
        streamId: 'stream-123',
        actorId: 'system',
        actorType: InteractionActorType.SYSTEM,
        eventType: InteractionEventType.SYSTEM_NOTIFICATION,
        payload: {
          title: 'Order Delivered',
          message: 'Your order has been delivered successfully',
        },
        createdAt: new Date(),
      };

      eventRepository.appendToStream.mockResolvedValue(mockEvent as InteractionEventEntity);

      // Act
      const result = await handler.execute(sysCommand);

      // Assert
      expect(result).toBe('event-sys');
      expect(eventRepository.appendToStream).toHaveBeenCalledWith(
        'stream-123',
        expect.objectContaining({
          actorType: InteractionActorType.SYSTEM,
          eventType: InteractionEventType.SYSTEM_NOTIFICATION,
        })
      );
    });
  });
});
