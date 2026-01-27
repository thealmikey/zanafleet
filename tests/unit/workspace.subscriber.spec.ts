import { NatsContext } from '@nestjs/microservices';
import { WorkspaceSubscriber } from '../../src/core/event-bus/subscribers/workspace.subscriber';
import { WorkspaceNeo4jProjection } from '../../src/modules/workspace/projections/workspace-neo4j.projection';
import { IdempotencyService } from '../../src/core/event-bus/services/idempotency.service';
import { EventLoggerService } from '../../src/core/event-bus/services/event-logger.service';
import { WorkspaceCreatedEventV1 } from '../../src/modules/workspace/events/workspace-created.event';
import { SerializedEvent } from '../../src/core/event-bus/interfaces/base-event.interface';

type ProjectionMock = {
  handle: jest.Mock<Promise<void>, [WorkspaceCreatedEventV1]>;
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
  workspaceId: 'workspace-123',
  orgId: 'org-456',
  name: 'Main Workspace',
  type: 'OPERATIONS',
  status: 'ACTIVE',
  roleTemplates: ['admin', 'member'],
  createdAt: new Date('2023-08-10T12:34:56.000Z').toISOString(),
};

const createSerializedEvent = (
  overrides: Partial<SerializedEvent> = {},
): SerializedEvent =>
  ({
    eventId: 'workspace-event-123',
    eventType: 'WorkspaceCreatedEvent-V1',
    eventVersion: '1.0.0',
    occurredAt: new Date('2023-08-10T12:34:56.000Z').toISOString(),
    aggregateId: 'workspace-aggregate-123',
    aggregateType: 'Workspace',
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

describe('WorkspaceSubscriber', () => {
  let subscriber: WorkspaceSubscriber;
  let projection: ProjectionMock;
  let idempotencyService: IdempotencyMock;
  let eventLogger: EventLoggerMock;
  let contextMock: NatsContextMock;
  let context: NatsContext;

  const subject = 'workspace.events.created-v1';

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

    subscriber = new WorkspaceSubscriber(
      projection as unknown as WorkspaceNeo4jProjection,
      idempotencyService as unknown as IdempotencyService,
      eventLogger as unknown as EventLoggerService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('processes WorkspaceCreatedEvent-V1 and invokes the projection', async () => {
    const data = createSerializedEvent();
    const domainEvent = {
      eventId: data.eventId,
      eventType: 'WorkspaceCreatedEvent-V1',
      eventVersion: '1.0.0',
      occurredAt: new Date(data.occurredAt),
      aggregateId: data.aggregateId,
      aggregateType: 'Workspace',
      workspaceId: basePayload.workspaceId,
      orgId: basePayload.orgId,
      name: basePayload.name,
      type: basePayload.type,
      status: basePayload.status,
      roleTemplates: basePayload.roleTemplates,
      createdAt: new Date(basePayload.createdAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    } as unknown as WorkspaceCreatedEventV1;

    idempotencyService.isProcessed.mockReturnValue(false);
    projection.handle.mockResolvedValue(undefined);
    const fromJsonSpy = jest
      .spyOn(WorkspaceCreatedEventV1, 'fromJSON')
      .mockReturnValue(domainEvent);

    await subscriber.handleWorkspaceEvent(data, context);

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
      WorkspaceNeo4jProjection.name,
    );
    expect(idempotencyService.remove).not.toHaveBeenCalled();
    expect(eventLogger.logFailed).not.toHaveBeenCalled();
  });

  it('skips duplicate events when idempotency check returns true', async () => {
    const data = createSerializedEvent();
    idempotencyService.isProcessed.mockReturnValue(true);
    const fromJsonSpy = jest.spyOn(WorkspaceCreatedEventV1, 'fromJSON');

    await subscriber.handleWorkspaceEvent(data, context);

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
      eventType: 'WorkspaceCreatedEvent-V1',
      eventVersion: '1.0.0',
      occurredAt: new Date(data.occurredAt),
      aggregateId: data.aggregateId,
      aggregateType: 'Workspace',
      workspaceId: basePayload.workspaceId,
      orgId: basePayload.orgId,
      name: basePayload.name,
      type: basePayload.type,
      status: basePayload.status,
      roleTemplates: basePayload.roleTemplates,
      createdAt: new Date(basePayload.createdAt),
    } as unknown as WorkspaceCreatedEventV1;
    const error = new Error('Projection failure');

    idempotencyService.isProcessed.mockReturnValue(false);
    jest.spyOn(WorkspaceCreatedEventV1, 'fromJSON').mockReturnValue(domainEvent);
    projection.handle.mockRejectedValue(error);

    await expect(subscriber.handleWorkspaceEvent(data, context)).rejects.toThrow(
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
    const fromJsonSpy = jest.spyOn(WorkspaceCreatedEventV1, 'fromJSON');

    await subscriber.handleWorkspaceEvent(data, context);

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
