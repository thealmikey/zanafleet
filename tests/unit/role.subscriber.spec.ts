import { NatsContext } from '@nestjs/microservices';
import { RoleSubscriber } from '../../src/core/event-bus/subscribers/role.subscriber';
import { RoleNeo4jProjection } from '../../src/modules/role/projections/role-neo4j.projection';
import { IdempotencyService } from '../../src/core/event-bus/services/idempotency.service';
import { EventLoggerService } from '../../src/core/event-bus/services/event-logger.service';
import { RoleCreatedEventV1 } from '../../src/modules/role/events/role-created.event';
import { SerializedEvent } from '../../src/core/event-bus/interfaces/base-event.interface';

type ProjectionMock = {
  handle: jest.Mock<Promise<void>, [RoleCreatedEventV1]>;
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
    eventId: 'role-event-123',
    eventType: 'RoleCreatedEvent-V1',
    eventVersion: '1.0.0',
    occurredAt: new Date('2023-08-10T12:34:56.000Z').toISOString(),
    aggregateId: 'role-aggregate-123',
    aggregateType: 'Role',
    correlationId: 'corr-123',
    causationId: 'caus-123',
    payload: {
      roleId: 'role-123',
      name: 'Workspace Admin',
      permissions: ['role.assign', 'role.revoke'],
      scope: 'GLOBAL',
      createdAt: new Date('2023-08-10T12:34:56.000Z').toISOString(),
      ...(overrides.payload as Record<string, unknown> | undefined),
    },
    ...overrides,
  }) as SerializedEvent;

describe('RoleSubscriber', () => {
  let subscriber: RoleSubscriber;
  let projection: ProjectionMock;
  let idempotencyService: IdempotencyMock;
  let eventLogger: EventLoggerMock;
  let contextMock: NatsContextMock;
  let context: NatsContext;

  const subject = 'role.events.created-v1';

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

    subscriber = new RoleSubscriber(
      projection as unknown as RoleNeo4jProjection,
      idempotencyService as unknown as IdempotencyService,
      eventLogger as unknown as EventLoggerService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('processes RoleCreatedEvent-V1 and invokes the projection', async () => {
    const data = createSerializedEvent();
    const domainEvent = {
      eventId: data.eventId,
      eventType: 'RoleCreatedEvent-V1',
      eventVersion: '1.0.0',
      occurredAt: new Date(data.occurredAt),
      aggregateId: data.aggregateId,
      aggregateType: 'Role',
      roleId: 'role-123',
      name: 'Workspace Admin',
      permissions: ['role.assign', 'role.revoke'],
      scope: 'GLOBAL',
      createdAt: new Date('2023-08-10T12:34:56.000Z'),
      correlationId: data.correlationId,
      causationId: data.causationId,
    } as unknown as RoleCreatedEventV1;

    idempotencyService.isProcessed.mockReturnValue(false);
    projection.handle.mockResolvedValue(undefined);
    const fromJsonSpy = jest
      .spyOn(RoleCreatedEventV1, 'fromJSON')
      .mockReturnValue(domainEvent);

    await subscriber.handleRoleEvent(data, context);

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
      RoleNeo4jProjection.name,
    );
    expect(idempotencyService.remove).not.toHaveBeenCalled();
    expect(eventLogger.logFailed).not.toHaveBeenCalled();
  });

  it('skips duplicate events when idempotency check returns true', async () => {
    const data = createSerializedEvent();
    idempotencyService.isProcessed.mockReturnValue(true);
    const fromJsonSpy = jest.spyOn(RoleCreatedEventV1, 'fromJSON');

    await subscriber.handleRoleEvent(data, context);

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
      eventType: 'RoleCreatedEvent-V1',
      eventVersion: '1.0.0',
      occurredAt: new Date(data.occurredAt),
      aggregateId: data.aggregateId,
      aggregateType: 'Role',
      roleId: 'role-123',
      name: 'Workspace Admin',
      permissions: ['role.assign', 'role.revoke'],
      scope: 'GLOBAL',
      createdAt: new Date('2023-08-10T12:34:56.000Z'),
    } as unknown as RoleCreatedEventV1;
    const error = new Error('Projection failure');

    idempotencyService.isProcessed.mockReturnValue(false);
    jest.spyOn(RoleCreatedEventV1, 'fromJSON').mockReturnValue(domainEvent);
    projection.handle.mockRejectedValue(error);

    await expect(subscriber.handleRoleEvent(data, context)).rejects.toThrow(
      'Projection failure',
    );

    expect(idempotencyService.markAsProcessed).toHaveBeenCalledWith(data.eventId);
    expect(projection.handle).toHaveBeenCalledWith(domainEvent);
    expect(idempotencyService.remove).toHaveBeenCalledWith(data.eventId);
    expect(eventLogger.logFailed).toHaveBeenCalledWith(data, error);
    expect(eventLogger.logProcessed).not.toHaveBeenCalled();
  });

  it('ignores events with unknown eventType', async () => {
    const data = createSerializedEvent({ eventType: 'UnknownEvent' });
    idempotencyService.isProcessed.mockReturnValue(false);
    const fromJsonSpy = jest.spyOn(RoleCreatedEventV1, 'fromJSON');

    await subscriber.handleRoleEvent(data, context);

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
