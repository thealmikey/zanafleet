import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { EventBusService } from '../../src/core/event-bus/event-bus.service';
import { EventLoggerService } from '../../src/core/event-bus/services/event-logger.service';
import { RetryService } from '../../src/core/event-bus/services/retry.service';
import * as EventBusConstants from '../../src/core/event-bus/event-bus.constants';
import { BaseEvent, SerializedEvent } from '../../src/core/event-bus/interfaces/base-event.interface';

describe('EventBusService', () => {
  let service: EventBusService;
  let mockNatsClient: jest.Mocked<ClientProxy>;
  let mockEventLogger: jest.Mocked<EventLoggerService>;
  let mockRetryService: jest.Mocked<RetryService>;

  const createMockEvent = (overrides: Partial<BaseEvent> = {}): BaseEvent => ({
    eventId: 'evt-123',
    eventType: 'OrganizationCreatedEvent-V1',
    eventVersion: '1.0.0',
    occurredAt: new Date('2024-01-01T00:00:00Z'),
    aggregateId: 'org-456',
    aggregateType: 'Organization',
    correlationId: 'corr-789',
    causationId: 'cause-012',
    ...overrides,
  });

  beforeEach(async () => {
    mockNatsClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn().mockReturnValue(of(undefined)),
      close: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    mockEventLogger = {
      logPublish: jest.fn(),
      logReceive: jest.fn(),
      logProcessed: jest.fn(),
      logSkipped: jest.fn(),
      logFailed: jest.fn(),
      logRetry: jest.fn(),
    } as unknown as jest.Mocked<EventLoggerService>;

    mockRetryService = {
      executeWithRetry: jest.fn().mockImplementation(async (operation) => {
        try {
          const result = await operation();
          return { success: true, result, attempts: 1 };
        } catch (error) {
          return { success: false, error, attempts: 1 };
        }
      }),
      calculateDelay: jest.fn(),
      getDelaySequence: jest.fn(),
    } as unknown as jest.Mocked<RetryService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBusService,
        { provide: EventBusConstants.NATS_CLIENT, useValue: mockNatsClient },
        { provide: EventLoggerService, useValue: mockEventLogger },
        { provide: RetryService, useValue: mockRetryService },
      ],
    }).compile();

    service = module.get<EventBusService>(EventBusService);
    (service as unknown as { isConnected: boolean }).isConnected = true;
  });

  describe('onModuleInit', () => {
    it('should connect to NATS on initialization', async () => {
      await service.onModuleInit();

      expect(mockNatsClient.connect).toHaveBeenCalled();
      expect(service.isReady()).toBe(true);
    });

    it('should handle connection failure gracefully', async () => {
      mockNatsClient.connect.mockRejectedValueOnce(new Error('Connection failed'));

      await service.onModuleInit();

      expect(service.isReady()).toBe(false);
    });
  });

  describe('serializeEvent', () => {
    it('should serialize event with all required fields', () => {
      const event = createMockEvent();

      const serialized = service.serializeEvent(event);

      expect(serialized).toEqual({
        eventId: 'evt-123',
        eventType: 'OrganizationCreatedEvent-V1',
        eventVersion: '1.0.0',
        occurredAt: '2024-01-01T00:00:00.000Z',
        aggregateId: 'org-456',
        aggregateType: 'Organization',
        correlationId: 'corr-789',
        causationId: 'cause-012',
        payload: {},
      });
    });

    it('should extract additional payload fields', () => {
      const event = {
        ...createMockEvent(),
        organizationName: 'Test Org',
        status: 'active',
      };

      const serialized = service.serializeEvent(event);

      expect(serialized.payload).toEqual({
        organizationName: 'Test Org',
        status: 'active',
      });
    });

    it('should handle missing optional correlation and causation identifiers', () => {
      const { correlationId: _correlationId, causationId: _causationId, ...baseEvent } =
        createMockEvent();
      const event = {
        ...baseEvent,
        status: 'pending',
      } as BaseEvent & { status: string };

      const serialized = service.serializeEvent(event);

      expect(serialized.correlationId).toBeUndefined();
      expect(serialized.causationId).toBeUndefined();
      expect(serialized.payload).toEqual({ status: 'pending' });
    });

    it('should serialize event with only base fields to an empty payload', () => {
      const event: BaseEvent = {
        eventId: 'evt-base',
        eventType: 'WorkspaceCreatedEvent-V1',
        eventVersion: '1.0.0',
        occurredAt: new Date('2024-02-01T00:00:00Z'),
        aggregateId: 'workspace-123',
        aggregateType: 'Workspace',
      };

      const serialized = service.serializeEvent(event);

      expect(serialized.payload).toEqual({});
      expect(serialized.correlationId).toBeUndefined();
      expect(serialized.causationId).toBeUndefined();
    });

    it('should handle string occurredAt', () => {
      const event = {
        ...createMockEvent(),
        occurredAt: '2024-01-01T00:00:00.000Z' as unknown as Date,
      };

      const serialized = service.serializeEvent(event);

      expect(serialized.occurredAt).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('deserializeEvent', () => {
    it('should deserialize event correctly', () => {
      const serialized = {
        eventId: 'evt-123',
        eventType: 'OrganizationCreatedEvent-V1',
        eventVersion: '1.0.0',
        occurredAt: '2024-01-01T00:00:00.000Z',
        aggregateId: 'org-456',
        aggregateType: 'Organization',
        correlationId: 'corr-789',
        causationId: 'cause-012',
        payload: { organizationName: 'Test Org' },
      };

      const deserialized = service.deserializeEvent(serialized);

      expect(deserialized.eventId).toBe('evt-123');
      expect(deserialized.eventType).toBe('OrganizationCreatedEvent-V1');
      expect(deserialized.occurredAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
      expect(deserialized.organizationName).toBe('Test Org');
    });

    it('should deserialize event with empty payload to base fields only', () => {
      const serialized: SerializedEvent = {
        eventId: 'evt-empty',
        eventType: 'WorkspaceCreatedEvent-V1',
        eventVersion: '1.0.0',
        occurredAt: '2024-02-01T00:00:00.000Z',
        aggregateId: 'workspace-123',
        aggregateType: 'Workspace',
        payload: {},
      };

      const deserialized = service.deserializeEvent(serialized);

      expect(deserialized).toEqual({
        eventId: 'evt-empty',
        eventType: 'WorkspaceCreatedEvent-V1',
        eventVersion: '1.0.0',
        occurredAt: new Date('2024-02-01T00:00:00.000Z'),
        aggregateId: 'workspace-123',
        aggregateType: 'Workspace',
      });
    });
  });

  describe('publish', () => {
    it('should publish event to specified subject', async () => {
      const event = createMockEvent();

      await service.publish('test.subject', event);

      expect(mockEventLogger.logPublish).toHaveBeenCalledWith(event, 'test.subject');
      expect(mockRetryService.executeWithRetry).toHaveBeenCalled();
    });

    it('should throw an error when NATS client reconnection fails', async () => {
      const event = createMockEvent();
      mockNatsClient.connect.mockRejectedValueOnce(new Error('Connection failed'));
      (service as unknown as { isConnected: boolean }).isConnected = false;

      await expect(service.publish('test.subject', event)).rejects.toThrow('Connection failed');

      expect(mockNatsClient.connect).toHaveBeenCalledTimes(1);
      expect(mockRetryService.executeWithRetry).not.toHaveBeenCalled();
      expect(mockEventLogger.logPublish).not.toHaveBeenCalled();
      expect(mockEventLogger.logFailed).toHaveBeenCalledTimes(1);
      const [, error] = mockEventLogger.logFailed.mock.calls[0] as [BaseEvent, Error];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Connection failed');
    });

    it('should attempt to reconnect when not connected and succeed', async () => {
      const event = createMockEvent();
      (service as unknown as { isConnected: boolean }).isConnected = false;

      await service.publish('test.subject', event);

      expect(mockNatsClient.connect).toHaveBeenCalledTimes(1);
      expect((service as unknown as { isConnected: boolean }).isConnected).toBe(true);
      expect(mockEventLogger.logPublish).toHaveBeenCalledWith(event, 'test.subject');
      expect(mockRetryService.executeWithRetry).toHaveBeenCalledTimes(1);
      expect(mockEventLogger.logFailed).not.toHaveBeenCalled();
    });

    it('should use retry service by default', async () => {
      const event = createMockEvent();

      await service.publish('test.subject', event);

      expect(mockRetryService.executeWithRetry).toHaveBeenCalled();
    });

    it('should skip retry when disabled', async () => {
      const event = createMockEvent();
      mockNatsClient.emit.mockReturnValue(of(undefined));

      await service.publish('test.subject', event, { retry: false });

      expect(mockRetryService.executeWithRetry).not.toHaveBeenCalled();
    });

    it('should log failure when publish fails', async () => {
      const event = createMockEvent();
      const error = new Error('Publish failed');
      mockRetryService.executeWithRetry.mockResolvedValueOnce({
        success: false,
        error,
        attempts: 3,
      });

      await expect(service.publish('test.subject', event)).rejects.toThrow('Publish failed');

      expect(mockEventLogger.logFailed).toHaveBeenCalledWith(event, error, 3);
    });

    it('should invoke onRetry callback with correct parameters', async () => {
      const event = createMockEvent();
      const retryError = new Error('Temporary failure');

      mockRetryService.executeWithRetry.mockImplementationOnce(async (_operation, options) => {
        options?.onRetry?.(2, retryError, 1500);
        return { success: false, error: retryError, attempts: 3 };
      });

      await expect(service.publish('test.subject', event)).rejects.toThrow(retryError);

      expect(mockEventLogger.logRetry).toHaveBeenCalledTimes(1);
      expect(mockEventLogger.logRetry).toHaveBeenCalledWith(event, 2, 1500);
      expect(mockEventLogger.logFailed).toHaveBeenCalledWith(event, retryError, 3);
    });

    it('should log retries for multiple retry attempts', async () => {
      const event = createMockEvent();
      const retryError = new Error('Intermittent failure');

      mockRetryService.executeWithRetry.mockImplementationOnce(async (_operation, options) => {
        options?.onRetry?.(1, retryError, 500);
        options?.onRetry?.(2, retryError, 1000);
        return { success: false, error: retryError, attempts: 3 };
      });

      await expect(service.publish('test.subject', event)).rejects.toThrow(retryError);

      expect(mockEventLogger.logRetry).toHaveBeenNthCalledWith(1, event, 1, 500);
      expect(mockEventLogger.logRetry).toHaveBeenNthCalledWith(2, event, 2, 1000);
      expect(mockEventLogger.logFailed).toHaveBeenCalledWith(event, retryError, 3);
    });

    it('should log failure and rethrow when retry is disabled', async () => {
      const event = createMockEvent();
      const error = new Error('Immediate failure');
      mockNatsClient.emit.mockReturnValueOnce(throwError(() => error));

      await expect(
        service.publish('test.subject', event, { retry: false }),
      ).rejects.toThrow(error);

      expect(mockRetryService.executeWithRetry).not.toHaveBeenCalled();
      expect(mockEventLogger.logFailed).toHaveBeenCalledTimes(1);
      expect(mockEventLogger.logFailed).toHaveBeenCalledWith(event, error);
    });

    it('should throw unknown error when retry result lacks error detail', async () => {
      expect.assertions(4);
      const event = createMockEvent();
      mockRetryService.executeWithRetry.mockResolvedValueOnce({
        success: false,
        attempts: 4,
      });

      let caughtError: Error | undefined;
      await service.publish('test.subject', event).catch((error) => {
        caughtError = error as Error;
      });

      expect(caughtError).toBeDefined();
      const finalError = caughtError as Error;
      expect(finalError.message).toBe('Unknown error during publish');
      expect(mockEventLogger.logFailed).toHaveBeenCalledTimes(1);
      expect(mockEventLogger.logFailed).toHaveBeenCalledWith(event, finalError, 4);
    });
  });

  describe('publishEvent', () => {
    it('should derive subjects from multiple event types using buildSubjectFromEventType', async () => {
      const buildSubjectSpy = jest.spyOn(
        EventBusConstants,
        'buildSubjectFromEventType',
      );
      const events: BaseEvent[] = [
        createMockEvent({
          eventId: 'evt-workspace',
          eventType: 'WorkspaceCreatedEvent-V1',
          aggregateId: 'workspace-1',
          aggregateType: 'Workspace',
        }),
        createMockEvent({
          eventId: 'evt-organization',
          eventType: 'OrganizationUpdatedEvent-V2',
          aggregateId: 'organization-2',
          aggregateType: 'Organization',
        }),
        createMockEvent({
          eventId: 'evt-actor',
          eventType: 'ActorOnboardedEvent-V1',
          aggregateId: 'actor-3',
          aggregateType: 'Actor',
        }),
      ];

      try {
        for (const event of events) {
          await service.publishEvent(event);
        }

        expect(buildSubjectSpy).toHaveBeenCalledTimes(events.length);
        expect(buildSubjectSpy).toHaveBeenNthCalledWith(1, 'WorkspaceCreatedEvent-V1');
        expect(buildSubjectSpy).toHaveBeenNthCalledWith(2, 'OrganizationUpdatedEvent-V2');
        expect(buildSubjectSpy).toHaveBeenNthCalledWith(3, 'ActorOnboardedEvent-V1');

        expect(mockEventLogger.logPublish).toHaveBeenNthCalledWith(
          1,
          events[0],
          'workspace.events.created-v1',
        );
        expect(mockEventLogger.logPublish).toHaveBeenNthCalledWith(
          2,
          events[1],
          'organization.events.updated-v2',
        );
        expect(mockEventLogger.logPublish).toHaveBeenNthCalledWith(
          3,
          events[2],
          'actor.events.onboarded-v1',
        );
        expect(mockRetryService.executeWithRetry).toHaveBeenCalledTimes(events.length);
      } finally {
        buildSubjectSpy.mockRestore();
      }
    });

    it('should use custom subject when provided', async () => {
      const event = createMockEvent();

      await service.publishEvent(event, { subject: 'custom.subject' });

      expect(mockEventLogger.logPublish).toHaveBeenCalledWith(event, 'custom.subject');
    });

    it('should fall back to unknown subject when event type does not match pattern', async () => {
      const event = createMockEvent({
        eventId: 'evt-unknown',
        eventType: 'InvalidEventType',
      });

      await service.publishEvent(event);

      expect(mockEventLogger.logPublish).toHaveBeenCalledWith(
        event,
        'unknown.events.invalideventtype',
      );
      expect(mockRetryService.executeWithRetry).toHaveBeenCalledTimes(1);
    });
  });
});
