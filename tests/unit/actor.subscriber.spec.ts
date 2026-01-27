import { NatsContext } from '@nestjs/microservices';
import { ActorSubscriber } from '../../src/core/event-bus/subscribers/actor.subscriber';
import { ActorNeo4jProjection } from '../../src/modules/actor/projections/actor-neo4j.projection';
import { IdempotencyService } from '../../src/core/event-bus/services/idempotency.service';
import { EventLoggerService } from '../../src/core/event-bus/services/event-logger.service';
import { ActorOnboardedEventV1 } from '../../src/modules/actor/events/actor-onboarded.event';
import { SerializedEvent } from '../../src/core/event-bus/interfaces/base-event.interface';

type ProjectionMock = {
  handle: jest.Mock<Promise<void>, [ActorOnboardedEventV1]>;
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

const createSerializedEvent = (
  overrides: Partial<SerializedEvent> = {},
): SerializedEvent =>
  ({
    eventId: 'event-123',
    eventType: 'ActorOnboardedEvent-V1',
    eventVersion: '1.0.0',
    occurredAt: new Date('2023-08-10T12:34:56.000Z').toISOString(),
    aggregateId: 'actor-123',
    aggregateType: 'Actor',
    correlationId: 'corr-123',
    causationId: 'caus-123',
    payload: {
      actorId: 'actor-123',
      workspaceId: 'workspace-123',
      type: 'Rider',
      roles: ['member'],
      linkedWallets: ['wallet-1'],
      createdAt: new Date('2023-08-10T12:34:56.000Z').toISOString(),
    },
    ...overrides,
  }) as SerializedEvent;

describe('ActorSubscriber', () => {
  let subscriber: ActorSubscriber;
  let projection: ProjectionMock;
  let idempotencyService: IdempotencyMock;
  let eventLogger: EventLoggerMock;
  let contextMock: NatsContextMock;
  let context: NatsContext;

  const subject = 'actor.events.onboarded-v1';

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

    subscriber = new ActorSubscriber(
      projection as unknown as ActorNeo4jProjection,
      idempotencyService as unknown as IdempotencyService,
      eventLogger as unknown as EventLoggerService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('processes ActorOnboardedEvent-V1 and invokes the projection', async () => {
    const data = createSerializedEvent();
    const domainEvent = {
      eventId: data.eventId,
      eventType: 'ActorOnboardedEvent-V1',
      eventVersion: '1.0.0',
      occurredAt: new Date('2023-08-10T12:34:56.000Z'),
      aggregateId: data.aggregateId,
      aggregateType: 'Actor',
      actorId: 'actor-123',
      type: 'Rider',
      roles: ['member'],
      workspaceId: 'workspace-123',
      linkedWallets: ['wallet-1'],
      createdAt: new Date('2023-08-10T12:34:56.000Z'),
    } as unknown as ActorOnboardedEventV1;

    idempotencyService.isProcessed.mockReturnValue(false);
    projection.handle.mockResolvedValue(undefined);
    const fromJsonSpy = jest
      .spyOn(ActorOnboardedEventV1, 'fromJSON')
      .mockReturnValue(domainEvent);

    await subscriber.handleActorEvent(data, context);

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
      ActorNeo4jProjection.name,
    );
    expect(idempotencyService.remove).not.toHaveBeenCalled();
    expect(eventLogger.logFailed).not.toHaveBeenCalled();
  });

  it('skips duplicate events when idempotency check returns true', async () => {
    const data = createSerializedEvent();
    idempotencyService.isProcessed.mockReturnValue(true);
    const fromJsonSpy = jest.spyOn(ActorOnboardedEventV1, 'fromJSON');

    await subscriber.handleActorEvent(data, context);

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
      eventType: 'ActorOnboardedEvent-V1',
      eventVersion: '1.0.0',
      occurredAt: new Date('2023-08-10T12:34:56.000Z'),
      aggregateId: data.aggregateId,
      aggregateType: 'Actor',
      actorId: 'actor-123',
      type: 'Rider',
      roles: ['member'],
      workspaceId: 'workspace-123',
      linkedWallets: ['wallet-1'],
      createdAt: new Date('2023-08-10T12:34:56.000Z'),
    } as unknown as ActorOnboardedEventV1;
    const error = new Error('Projection failure');

    idempotencyService.isProcessed.mockReturnValue(false);
    jest.spyOn(ActorOnboardedEventV1, 'fromJSON').mockReturnValue(domainEvent);
    projection.handle.mockRejectedValue(error);

    await expect(
      subscriber.handleActorEvent(data, context),
    ).rejects.toThrow('Projection failure');

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(
      data.eventId,
    );
    expect(projection.handle).toHaveBeenCalledWith(domainEvent);
    expect(idempotencyService.remove).toHaveBeenCalledWith(data.eventId);
    expect(eventLogger.logFailed).toHaveBeenCalledWith(data, error);
    expect(eventLogger.logProcessed).not.toHaveBeenCalled();
  });

  it('ignores events with unknown eventType', async () => {
    const data = createSerializedEvent({ eventType: 'UnknownEvent' });
    idempotencyService.isProcessed.mockReturnValue(false);
    const fromJsonSpy = jest.spyOn(ActorOnboardedEventV1, 'fromJSON');

    await subscriber.handleActorEvent(data, context);

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(
      data.eventId,
    );
    expect(eventLogger.logReceive).toHaveBeenCalledWith(data, subject);
    expect(fromJsonSpy).not.toHaveBeenCalled();
    expect(projection.handle).not.toHaveBeenCalled();
    expect(eventLogger.logProcessed).not.toHaveBeenCalled();
    expect(eventLogger.logSkipped).not.toHaveBeenCalled();
  });
});
