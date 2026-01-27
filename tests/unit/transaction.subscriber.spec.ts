import { NatsContext } from '@nestjs/microservices';
import { TransactionSubscriber } from '../../src/core/event-bus/subscribers/transaction.subscriber';
import { TransactionNeo4jProjection } from '../../src/modules/transaction/projections/transaction-neo4j.projection';
import { IdempotencyService } from '../../src/core/event-bus/services/idempotency.service';
import { EventLoggerService } from '../../src/core/event-bus/services/event-logger.service';
import { TransactionCreatedEventV1 } from '../../src/modules/transaction/events/transaction-created.event';
import { SerializedEvent } from '../../src/core/event-bus/interfaces/base-event.interface';

type ProjectionMock = {
  handle: jest.Mock<Promise<void>, [TransactionCreatedEventV1]>;
};

type IdempotencyMock = {
  isProcessed: jest.Mock<boolean, [string]>;
  markAsProcessed: jest.Mock<void, [string]>;
  remove: jest.Mock<void, [string]>;
};

type EventLoggerMock = {
  logReceive: jest.Mock<void, [unknown, string]>;
  logProcessed: jest.Mock<void, [unknown, string]>;
  logSkipped: jest.Mock<void, [unknown, string]>;
  logFailed: jest.Mock<void, [unknown, Error]>;
};

type NatsContextMock = {
  getSubject: jest.Mock<string, []>;
};

const basePayload = {
  transactionId: 'txn-123',
  sourceWalletId: 'wallet-src-456',
  destinationWalletId: 'wallet-dest-789',
  amount: 150,
  type: 'TRANSFER',
  status: 'PENDING',
  linkedEventId: 'linked-001',
};

const createSerializedEvent = (
  overrides: Partial<SerializedEvent> = {},
): SerializedEvent =>
  ({
    eventId: 'txn-event-123',
    eventType: 'TransactionCreatedEvent-V1',
    eventVersion: '1.0.0',
    occurredAt: new Date('2023-08-10T12:34:56.000Z').toISOString(),
    aggregateId: 'transaction-aggregate-123',
    aggregateType: 'Transaction',
    correlationId: 'corr-123',
    causationId: 'caus-123',
    payload: {
      ...basePayload,
    },
    ...overrides,
    payload: {
      ...basePayload,
      ...(overrides.payload as Record<string, unknown> | undefined),
    },
  }) as SerializedEvent;

describe('TransactionSubscriber', () => {
  let subscriber: TransactionSubscriber;
  let projection: ProjectionMock;
  let idempotencyService: IdempotencyMock;
  let eventLogger: EventLoggerMock;
  let contextMock: NatsContextMock;
  let context: NatsContext;

  const subject = 'transaction.events.created-v1';

  beforeEach(() => {
    projection = { handle: jest.fn() };
    idempotencyService = {
      isProcessed: jest.fn(),
      markAsProcessed: jest.fn(),
      remove: jest.fn(),
    };
    eventLogger = {
      logReceive: jest.fn(),
      logProcessed: jest.fn(),
      logSkipped: jest.fn(),
      logFailed: jest.fn(),
    };
    contextMock = {
      getSubject: jest.fn().mockReturnValue(subject),
    };
    context = contextMock as unknown as NatsContext;

    subscriber = new TransactionSubscriber(
      projection as unknown as TransactionNeo4jProjection,
      idempotencyService as unknown as IdempotencyService,
      eventLogger as unknown as EventLoggerService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('processes TransactionCreatedEvent-V1 and invokes the projection', async () => {
    const data = createSerializedEvent();
    const domainEvent = {
      eventId: data.eventId,
      eventType: 'TransactionCreatedEvent-V1',
      eventVersion: '1.0.0',
      occurredAt: new Date(data.occurredAt),
      aggregateId: data.aggregateId,
      aggregateType: 'Transaction',
      transactionId: basePayload.transactionId,
      sourceWalletId: basePayload.sourceWalletId,
      destinationWalletId: basePayload.destinationWalletId,
      amount: basePayload.amount,
      type: basePayload.type,
      status: basePayload.status,
      linkedEventId: basePayload.linkedEventId,
      correlationId: data.correlationId,
      causationId: data.causationId,
    } as unknown as TransactionCreatedEventV1;

    idempotencyService.isProcessed.mockReturnValue(false);
    projection.handle.mockResolvedValue(undefined);
    const fromJsonSpy = jest
      .spyOn(TransactionCreatedEventV1, 'fromJSON')
      .mockReturnValue(domainEvent);

    await subscriber.handleTransactionEvent(data, context);

    expect(contextMock.getSubject).toHaveBeenCalledTimes(1);
    expect(idempotencyService.isProcessed).toHaveBeenCalledWith(data.eventId);
    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(data.eventId);
    expect(eventLogger.logReceive).toHaveBeenCalledWith(data, subject);
    expect(fromJsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: data.eventId }),
    );
    expect(projection.handle).toHaveBeenCalledWith(domainEvent);
    expect(eventLogger.logProcessed).toHaveBeenCalledWith(
      domainEvent,
      TransactionNeo4jProjection.name,
    );
    expect(idempotencyService.remove).not.toHaveBeenCalled();
    expect(eventLogger.logFailed).not.toHaveBeenCalled();
  });

  it('skips duplicate events when idempotency check returns true', async () => {
    const data = createSerializedEvent();
    idempotencyService.isProcessed.mockReturnValue(true);
    const fromJsonSpy = jest.spyOn(TransactionCreatedEventV1, 'fromJSON');

    await subscriber.handleTransactionEvent(data, context);

    expect(idempotencyService.isProcessed).toHaveBeenCalledWith(data.eventId);
    expect(idempotencyService.markAsProcessed).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).toHaveBeenCalledWith(data, 'duplicate');
    expect(eventLogger.logReceive).not.toHaveBeenCalled();
    expect(fromJsonSpy).not.toHaveBeenCalled();
    expect(projection.handle).not.toHaveBeenCalled();
  });

  it('removes idempotency entry and logs failure when projection throws', async () => {
    const data = createSerializedEvent();
    const domainEvent = {
      eventId: data.eventId,
      eventType: 'TransactionCreatedEvent-V1',
      eventVersion: '1.0.0',
      occurredAt: new Date(data.occurredAt),
      aggregateId: data.aggregateId,
      aggregateType: 'Transaction',
      transactionId: basePayload.transactionId,
      sourceWalletId: basePayload.sourceWalletId,
      destinationWalletId: basePayload.destinationWalletId,
      amount: basePayload.amount,
      type: basePayload.type,
      status: basePayload.status,
      linkedEventId: basePayload.linkedEventId,
    } as unknown as TransactionCreatedEventV1;
    const error = new Error('Projection failure');

    idempotencyService.isProcessed.mockReturnValue(false);
    jest.spyOn(TransactionCreatedEventV1, 'fromJSON').mockReturnValue(domainEvent);
    projection.handle.mockRejectedValue(error);

    await expect(
      subscriber.handleTransactionEvent(data, context),
    ).rejects.toThrow('Projection failure');

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(data.eventId);
    expect(projection.handle).toHaveBeenCalledWith(domainEvent);
    expect(idempotencyService.remove).toHaveBeenCalledWith(data.eventId);
    expect(eventLogger.logFailed).toHaveBeenCalledWith(data, error);
    expect(eventLogger.logProcessed).not.toHaveBeenCalled();
  });

  it('ignores events with unknown eventType', async () => {
    const data = createSerializedEvent({ eventType: 'UnknownEvent' });
    idempotencyService.isProcessed.mockReturnValue(false);
    const fromJsonSpy = jest.spyOn(TransactionCreatedEventV1, 'fromJSON');

    await subscriber.handleTransactionEvent(data, context);

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(data.eventId);
    expect(eventLogger.logReceive).toHaveBeenCalledWith(data, subject);
    expect(fromJsonSpy).not.toHaveBeenCalled();
    expect(projection.handle).not.toHaveBeenCalled();
    expect(eventLogger.logProcessed).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).not.toHaveBeenCalled();
    expect(eventLogger.logFailed).not.toHaveBeenCalled();
    expect(idempotencyService.remove).not.toHaveBeenCalled();
  });
});
