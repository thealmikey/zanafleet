import { Logger } from '@nestjs/common';
import { NatsContext } from '@nestjs/microservices';
import { WalletSubscriber } from '../../src/core/event-bus/subscribers/wallet.subscriber';
import { WalletNeo4jProjection } from '../../src/modules/wallet/projections/wallet-neo4j.projection';
import { IdempotencyService } from '../../src/core/event-bus/services/idempotency.service';
import { EventLoggerService } from '../../src/core/event-bus/services/event-logger.service';
import { WalletCreatedEventV1 } from '../../src/modules/wallet/events/wallet-created.event';
import { WalletCreditedEventV1 } from '../../src/modules/wallet/events/wallet-credited.event';
import { WalletDebitedEventV1 } from '../../src/modules/wallet/events/wallet-debited.event';
import { SerializedEvent } from '../../src/core/event-bus/interfaces/base-event.interface';

type ProjectionMock = {
  handle: jest.Mock<Promise<void>, [WalletCreatedEventV1]>;
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
  walletId: 'wallet-123',
  ownerId: 'owner-456',
  ownerType: 'DRIVER',
  type: 'STANDARD',
  currency: 'USD',
  createdAt: new Date('2023-08-10T12:34:56.000Z').toISOString(),
  amount: 100,
  newBalance: 200,
  reference: 'txn-123',
};

const createSerializedEvent = (
  overrides: Partial<SerializedEvent> = {},
): SerializedEvent => {
  const baseEvent: SerializedEvent = {
    eventId: 'wallet-event-123',
    eventType: 'WalletCreatedEvent-V1',
    eventVersion: '1.0.0',
    occurredAt: new Date('2023-08-10T12:34:56.000Z').toISOString(),
    aggregateId: 'wallet-aggregate-123',
    aggregateType: 'Wallet',
    correlationId: 'corr-123',
    causationId: 'caus-123',
    payload: basePayload,
  };

  return {
    ...baseEvent,
    ...overrides,
    payload: {
      ...basePayload,
      ...(overrides.payload as Record<string, unknown> | undefined),
    },
  } as SerializedEvent;
};

describe('WalletSubscriber', () => {
  let subscriber: WalletSubscriber;
  let projection: ProjectionMock;
  let idempotencyService: IdempotencyMock;
  let eventLogger: EventLoggerMock;
  let contextMock: NatsContextMock;
  let context: NatsContext;

  const subject = 'wallet.events.created-v1';

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

    subscriber = new WalletSubscriber(
      projection as unknown as WalletNeo4jProjection,
      idempotencyService as unknown as IdempotencyService,
      eventLogger as unknown as EventLoggerService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('processes WalletCreatedEvent-V1 and invokes the projection', async () => {
    const data = createSerializedEvent();
    const domainEvent = {
      eventId: data.eventId,
      eventType: 'WalletCreatedEvent-V1',
      eventVersion: '1.0.0',
      occurredAt: new Date(data.occurredAt),
      aggregateId: data.aggregateId,
      aggregateType: 'Wallet',
      walletId: basePayload.walletId,
      ownerId: basePayload.ownerId,
      ownerType: basePayload.ownerType,
      type: basePayload.type,
      currency: basePayload.currency,
      createdAt: new Date(basePayload.createdAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    } as unknown as WalletCreatedEventV1;

    idempotencyService.isProcessed.mockReturnValue(false);
    projection.handle.mockResolvedValue(undefined);
    const fromJsonSpy = jest
      .spyOn(WalletCreatedEventV1, 'fromJSON')
      .mockReturnValue(domainEvent);

    await subscriber.handleWalletEvent(data, context);

    expect(contextMock.getSubject).toHaveBeenCalledTimes(1);
    expect(idempotencyService.isProcessed).toHaveBeenCalledWith(data.eventId);
    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(
      data.eventId,
    );
    expect(eventLogger.logReceive).toHaveBeenCalledWith(data, subject);
    expect(fromJsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: data.eventId }),
    );
    expect(projection.handle).toHaveBeenCalledWith(domainEvent);
    expect(eventLogger.logProcessed).toHaveBeenCalledWith(
      domainEvent,
      WalletNeo4jProjection.name,
    );
    expect(idempotencyService.remove).not.toHaveBeenCalled();
    expect(eventLogger.logFailed).not.toHaveBeenCalled();
  });

  it('processes WalletCreditedEvent-V1 and logs processed event', async () => {
    const creditedSubject = 'wallet.events.credited-v1';
    contextMock.getSubject.mockReturnValue(creditedSubject);
    const data = createSerializedEvent({
      eventType: 'WalletCreditedEvent-V1',
      payload: {
        walletId: 'wallet-987',
        amount: 50,
        newBalance: 250,
        reference: 'credit-txn-1',
      } as unknown as SerializedEvent['payload'],
    });
    const domainEvent = {
      eventId: data.eventId,
      eventType: 'WalletCreditedEvent-V1',
      eventVersion: '1.0.0',
      occurredAt: new Date(data.occurredAt),
      aggregateId: data.aggregateId,
      aggregateType: 'Wallet',
      walletId: 'wallet-987',
      amount: 50,
      newBalance: 250,
      reference: 'credit-txn-1',
      correlationId: data.correlationId,
      causationId: data.causationId,
    } as unknown as WalletCreditedEventV1;

    idempotencyService.isProcessed.mockReturnValue(false);
    const fromJsonSpy = jest
      .spyOn(WalletCreditedEventV1, 'fromJSON')
      .mockReturnValue(domainEvent);

    await subscriber.handleWalletEvent(data, context);

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(
      data.eventId,
    );
    expect(eventLogger.logReceive).toHaveBeenCalledWith(data, creditedSubject);
    expect(fromJsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: data.eventId }),
    );
    expect(eventLogger.logProcessed).toHaveBeenCalledWith(
      domainEvent,
      'WalletCreditedHandler',
    );
    expect(projection.handle).not.toHaveBeenCalled();
    expect(eventLogger.logFailed).not.toHaveBeenCalled();
    expect(idempotencyService.remove).not.toHaveBeenCalled();
  });

  it('processes WalletDebitedEvent-V1 and logs processed event', async () => {
    const debitedSubject = 'wallet.events.debited-v1';
    contextMock.getSubject.mockReturnValue(debitedSubject);
    const data = createSerializedEvent({
      eventType: 'WalletDebitedEvent-V1',
      payload: {
        walletId: 'wallet-654',
        amount: 30,
        newBalance: 170,
        reference: 'debit-txn-5',
      } as unknown as SerializedEvent['payload'],
    });
    const domainEvent = {
      eventId: data.eventId,
      eventType: 'WalletDebitedEvent-V1',
      eventVersion: '1.0.0',
      occurredAt: new Date(data.occurredAt),
      aggregateId: data.aggregateId,
      aggregateType: 'Wallet',
      walletId: 'wallet-654',
      amount: 30,
      newBalance: 170,
      reference: 'debit-txn-5',
      correlationId: data.correlationId,
      causationId: data.causationId,
    } as unknown as WalletDebitedEventV1;

    idempotencyService.isProcessed.mockReturnValue(false);
    const fromJsonSpy = jest
      .spyOn(WalletDebitedEventV1, 'fromJSON')
      .mockReturnValue(domainEvent);

    await subscriber.handleWalletEvent(data, context);

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(
      data.eventId,
    );
    expect(eventLogger.logReceive).toHaveBeenCalledWith(data, debitedSubject);
    expect(fromJsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: data.eventId }),
    );
    expect(eventLogger.logProcessed).toHaveBeenCalledWith(
      domainEvent,
      'WalletDebitedHandler',
    );
    expect(projection.handle).not.toHaveBeenCalled();
    expect(eventLogger.logFailed).not.toHaveBeenCalled();
    expect(idempotencyService.remove).not.toHaveBeenCalled();
  });

  it('skips duplicate events when idempotency check returns true', async () => {
    const data = createSerializedEvent();
    idempotencyService.isProcessed.mockReturnValue(true);
    const createdSpy = jest.spyOn(WalletCreatedEventV1, 'fromJSON');
    const creditedSpy = jest.spyOn(WalletCreditedEventV1, 'fromJSON');
    const debitedSpy = jest.spyOn(WalletDebitedEventV1, 'fromJSON');

    await subscriber.handleWalletEvent(data, context);

    expect(idempotencyService.isProcessed).toHaveBeenCalledWith(data.eventId);
    expect(idempotencyService.markAsProcessed).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).toHaveBeenCalledWith(data, 'duplicate');
    expect(eventLogger.logReceive).not.toHaveBeenCalled();
    expect(eventLogger.logProcessed).not.toHaveBeenCalled();
    expect(projection.handle).not.toHaveBeenCalled();
    expect(createdSpy).not.toHaveBeenCalled();
    expect(creditedSpy).not.toHaveBeenCalled();
    expect(debitedSpy).not.toHaveBeenCalled();
  });

  it('removes idempotency entry and logs failure when projection throws', async () => {
    const data = createSerializedEvent();
    const domainEvent = {
      eventId: data.eventId,
      eventType: 'WalletCreatedEvent-V1',
      eventVersion: '1.0.0',
      occurredAt: new Date(data.occurredAt),
      aggregateId: data.aggregateId,
      aggregateType: 'Wallet',
      walletId: basePayload.walletId,
      ownerId: basePayload.ownerId,
      ownerType: basePayload.ownerType,
      type: basePayload.type,
      currency: basePayload.currency,
      createdAt: new Date(basePayload.createdAt),
    } as unknown as WalletCreatedEventV1;
    const error = new Error('Projection failure');

    idempotencyService.isProcessed.mockReturnValue(false);
    jest.spyOn(WalletCreatedEventV1, 'fromJSON').mockReturnValue(domainEvent);
    projection.handle.mockRejectedValue(error);

    await expect(
      subscriber.handleWalletEvent(data, context),
    ).rejects.toThrow('Projection failure');

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(
      data.eventId,
    );
    expect(projection.handle).toHaveBeenCalledWith(domainEvent);
    expect(idempotencyService.remove).toHaveBeenCalledWith(data.eventId);
    expect(eventLogger.logFailed).toHaveBeenCalledWith(data, error);
    expect(eventLogger.logProcessed).not.toHaveBeenCalled();
  });

  it('handles unknown event types by logging warning without processing', async () => {
    const data = createSerializedEvent({ eventType: 'UnknownEvent' });
    idempotencyService.isProcessed.mockReturnValue(false);
    const createdSpy = jest.spyOn(WalletCreatedEventV1, 'fromJSON');
    const creditedSpy = jest.spyOn(WalletCreditedEventV1, 'fromJSON');
    const debitedSpy = jest.spyOn(WalletDebitedEventV1, 'fromJSON');
    const loggerInstance = (subscriber as unknown as { logger: Logger }).logger;
    const warnSpy = jest.spyOn(loggerInstance, 'warn');

    await subscriber.handleWalletEvent(data, context);

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(
      data.eventId,
    );
    expect(eventLogger.logReceive).toHaveBeenCalledWith(data, subject);
    expect(eventLogger.logProcessed).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).not.toHaveBeenCalled();
    expect(eventLogger.logFailed).not.toHaveBeenCalled();
    expect(projection.handle).not.toHaveBeenCalled();
    expect(createdSpy).not.toHaveBeenCalled();
    expect(creditedSpy).not.toHaveBeenCalled();
    expect(debitedSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      `Unknown wallet event type: ${data.eventType}`,
    );
    expect(idempotencyService.remove).not.toHaveBeenCalled();
  });
});
