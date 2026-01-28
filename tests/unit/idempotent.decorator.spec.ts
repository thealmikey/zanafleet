import 'reflect-metadata';
import { Idempotent, IDEMPOTENT_KEY, withIdempotency, IdempotentHandler } from '../../src/core/event-bus/decorators/idempotent.decorator';
import { IdempotencyService } from '../../src/core/event-bus/services/idempotency.service';
import { EventLoggerService } from '../../src/core/event-bus/services/event-logger.service';
import { BaseEvent } from '../../src/core/event-bus/interfaces/base-event.interface';

type IdempotencyServiceMock = {
  isProcessed: jest.Mock<boolean, [string]>;
  markAsProcessed: jest.Mock<void, [string]>;
  remove: jest.Mock<void, [string]>;
};

type EventLoggerMock = {
  logSkipped: jest.Mock<void, [BaseEvent, string]>;
};

const createIdempotencyServiceMock = (): IdempotencyServiceMock => ({
  isProcessed: jest.fn(),
  markAsProcessed: jest.fn(),
  remove: jest.fn(),
});

const createEventLoggerMock = (): EventLoggerMock => ({
  logSkipped: jest.fn(),
});

const createBaseEvent = (overrides: Partial<BaseEvent> = {}): BaseEvent => ({
  eventId: 'event-123',
  eventType: 'TestEvent',
  eventVersion: '1.0.0',
  occurredAt: new Date('2024-01-01T00:00:00.000Z'),
  aggregateId: 'aggregate-123',
  aggregateType: 'TestAggregate',
  ...overrides,
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Idempotent decorator', () => {
  it('sets metadata key on class', () => {
    @Idempotent()
    class TestHandler {}

    const metadata = Reflect.getMetadata(IDEMPOTENT_KEY, TestHandler);
    expect(metadata).toBe(true);
  });

  it('sets metadata key on method', () => {
    class TestHandler {
      @Idempotent()
      handle(): void {
        return;
      }
    }

    const metadata = Reflect.getMetadata(IDEMPOTENT_KEY, TestHandler.prototype, 'handle');
    expect(metadata).toBe(true);
  });
});

describe('withIdempotency', () => {
  let idempotencyService: IdempotencyServiceMock;
  let eventLogger: EventLoggerMock;
  let event: BaseEvent;

  beforeEach(() => {
    idempotencyService = createIdempotencyServiceMock();
    eventLogger = createEventLoggerMock();
    event = createBaseEvent();
  });

  it('skips handler and logs when event is already processed', async () => {
    idempotencyService.isProcessed.mockReturnValue(true);
    const handler = jest.fn();

    const wrapped = withIdempotency(
      handler,
      idempotencyService as unknown as IdempotencyService,
      eventLogger as unknown as EventLoggerService,
    );

    await wrapped(event);

    expect(handler).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).toHaveBeenCalledWith(event, 'duplicate');
    expect(idempotencyService.markAsProcessed).not.toHaveBeenCalled();
  });

  it('marks event as processed and calls handler when new', async () => {
    idempotencyService.isProcessed.mockReturnValue(false);
    const handler = jest.fn().mockResolvedValue(undefined);

    const wrapped = withIdempotency(
      handler,
      idempotencyService as unknown as IdempotencyService,
      eventLogger as unknown as EventLoggerService,
    );

    await wrapped(event);

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(event.eventId);
    expect(handler).toHaveBeenCalledWith(event);
    expect(eventLogger.logSkipped).not.toHaveBeenCalled();
    expect(idempotencyService.remove).not.toHaveBeenCalled();
  });

  it('removes idempotency entry when handler throws', async () => {
    idempotencyService.isProcessed.mockReturnValue(false);
    const error = new Error('handler failure');
    const handler = jest.fn().mockRejectedValue(error);

    const wrapped = withIdempotency(
      handler,
      idempotencyService as unknown as IdempotencyService,
      eventLogger as unknown as EventLoggerService,
    );

    await expect(wrapped(event)).rejects.toThrow(error);

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(event.eventId);
    expect(idempotencyService.remove).toHaveBeenCalledWith(event.eventId);
  });

  it('handles duplicate events without event logger', async () => {
    idempotencyService.isProcessed.mockReturnValue(true);
    const handler = jest.fn();

    const wrapped = withIdempotency(
      handler,
      idempotencyService as unknown as IdempotencyService,
    );

    await wrapped(event);

    expect(handler).not.toHaveBeenCalled();
    expect(idempotencyService.markAsProcessed).not.toHaveBeenCalled();
    expect(idempotencyService.remove).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).not.toHaveBeenCalled();
  });

  it('processes new events without event logger', async () => {
    idempotencyService.isProcessed.mockReturnValue(false);
    const handler = jest.fn().mockResolvedValue(undefined);

    const wrapped = withIdempotency(
      handler,
      idempotencyService as unknown as IdempotencyService,
    );

    await wrapped(event);

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(event.eventId);
    expect(handler).toHaveBeenCalledWith(event);
    expect(idempotencyService.remove).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).not.toHaveBeenCalled();
  });

  it('skips logging when event logger argument is undefined', async () => {
    idempotencyService.isProcessed.mockReturnValue(true);
    const handler = jest.fn();

    const wrapped = withIdempotency(
      handler,
      idempotencyService as unknown as IdempotencyService,
      undefined,
    );

    await wrapped(event);

    expect(handler).not.toHaveBeenCalled();
    expect(idempotencyService.markAsProcessed).not.toHaveBeenCalled();
    expect(idempotencyService.remove).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).not.toHaveBeenCalled();
  });
});

describe('IdempotentHandler decorator', () => {
  let event: BaseEvent;

  beforeEach(() => {
    event = createBaseEvent();
  });

  it('skips handler for duplicate events', async () => {
    const idempotencyService = createIdempotencyServiceMock();
    const eventLogger = createEventLoggerMock();
    idempotencyService.isProcessed.mockReturnValue(true);
    const original = jest.fn();

    class TestHandler {
      public idempotencyService = idempotencyService as unknown as IdempotencyService;
      public eventLogger = eventLogger as unknown as EventLoggerService;

      constructor(private readonly originalHandler: jest.Mock) {}

      @IdempotentHandler('idempotencyService', 'eventLogger')
      async handle(event: BaseEvent): Promise<void> {
        await this.originalHandler(event);
      }
    }

    const handler = new TestHandler(original);

    await handler.handle(event);

    expect(original).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).toHaveBeenCalledWith(event, 'duplicate');
    expect(idempotencyService.markAsProcessed).not.toHaveBeenCalled();
  });

  it('processes new events and marks them as processed', async () => {
    const idempotencyService = createIdempotencyServiceMock();
    const eventLogger = createEventLoggerMock();
    idempotencyService.isProcessed.mockReturnValue(false);
    const original = jest.fn().mockResolvedValue(undefined);

    class TestHandler {
      public idempotencyService = idempotencyService as unknown as IdempotencyService;
      public eventLogger = eventLogger as unknown as EventLoggerService;

      constructor(private readonly originalHandler: jest.Mock) {}

      @IdempotentHandler('idempotencyService', 'eventLogger')
      async handle(event: BaseEvent): Promise<void> {
        await this.originalHandler(event);
      }
    }

    const handler = new TestHandler(original);

    await handler.handle(event);

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(event.eventId);
    expect(original).toHaveBeenCalledWith(event);
    expect(idempotencyService.remove).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).not.toHaveBeenCalled();
  });

  it('throws an error when idempotencyService is not found on the class', async () => {
    class TestHandler {
      @IdempotentHandler()
      async handle(_event: BaseEvent): Promise<void> {
        return;
      }
    }

    const handler = new TestHandler();

    await expect(handler.handle(event)).rejects.toThrow(
      "IdempotencyService not found on 'idempotencyService'. Ensure it is injected into the handler class.",
    );
  });

  it('removes idempotency entry when handler throws', async () => {
    const idempotencyService = createIdempotencyServiceMock();
    idempotencyService.isProcessed.mockReturnValue(false);
    const error = new Error('handler failure');
    const original = jest.fn().mockRejectedValue(error);

    class TestHandler {
      public idempotencyService = idempotencyService as unknown as IdempotencyService;

      constructor(private readonly originalHandler: jest.Mock) {}

      @IdempotentHandler('idempotencyService')
      async handle(event: BaseEvent): Promise<void> {
        await this.originalHandler(event);
      }
    }

    const handler = new TestHandler(original);

    await expect(handler.handle(event)).rejects.toThrow('handler failure');

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(event.eventId);
    expect(idempotencyService.remove).toHaveBeenCalledWith(event.eventId);
  });

  it('uses custom idempotency service key to resolve service', async () => {
    const idempotencyService = createIdempotencyServiceMock();
    const eventLogger = createEventLoggerMock();
    idempotencyService.isProcessed.mockReturnValue(false);
    const original = jest.fn().mockResolvedValue(undefined);

    class CustomKeyHandler {
      public customIdempotency = idempotencyService as unknown as IdempotencyService;
      public customLogger = eventLogger as unknown as EventLoggerService;

      constructor(private readonly originalHandler: jest.Mock) {}

      @IdempotentHandler('customIdempotency', 'customLogger')
      async handle(event: BaseEvent): Promise<void> {
        await this.originalHandler(event);
      }
    }

    const handlerInstance = new CustomKeyHandler(original);

    await handlerInstance.handle(event);

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(event.eventId);
    expect(original).toHaveBeenCalledWith(event);
    expect(idempotencyService.remove).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).not.toHaveBeenCalled();
  });

  it('handles duplicate events without event logger key', async () => {
    const idempotencyService = createIdempotencyServiceMock();
    const eventLogger = createEventLoggerMock();
    idempotencyService.isProcessed.mockReturnValue(true);
    const original = jest.fn();

    class NoLoggerKeyHandler {
      public idempotencyService = idempotencyService as unknown as IdempotencyService;
      public eventLogger = eventLogger as unknown as EventLoggerService;

      constructor(private readonly originalHandler: jest.Mock) {}

      @IdempotentHandler('idempotencyService')
      async handle(event: BaseEvent): Promise<void> {
        await this.originalHandler(event);
      }
    }

    const handlerInstance = new NoLoggerKeyHandler(original);

    await handlerInstance.handle(event);

    expect(original).not.toHaveBeenCalled();
    expect(idempotencyService.markAsProcessed).not.toHaveBeenCalled();
    expect(idempotencyService.remove).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).not.toHaveBeenCalled();
  });

  it('forwards additional arguments to the original handler', async () => {
    const idempotencyService = createIdempotencyServiceMock();
    idempotencyService.isProcessed.mockReturnValue(false);
    const original = jest.fn().mockResolvedValue(undefined);

    class AdditionalArgsHandler {
      public idempotencyService = idempotencyService as unknown as IdempotencyService;

      @IdempotentHandler('idempotencyService')
      async handle(event: BaseEvent, arg1: string, arg2: number): Promise<void> {
        await original(event, arg1, arg2);
      }
    }

    const handlerInstance = new AdditionalArgsHandler();

    await handlerInstance.handle(event, 'argument-one', 42);

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(event.eventId);
    expect(original).toHaveBeenCalledWith(event, 'argument-one', 42);
    expect(idempotencyService.remove).not.toHaveBeenCalled();
  });
});
