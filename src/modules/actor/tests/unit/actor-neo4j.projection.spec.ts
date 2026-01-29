import { Logger } from '@nestjs/common';

import { Neo4jService } from '../../../../core/neo4j';
import { ActorOnboardedEventV1 } from '../../events/actor-onboarded.event';
import {
  ActorNeo4jProjection,
  ActorNeo4jInitializer,
} from '../../projections/actor-neo4j.projection';

type MockSession = {
  run: jest.Mock<Promise<unknown>, [string, Record<string, unknown>?]>;
  close: jest.Mock<Promise<void>, []>;
};

describe('ActorNeo4jProjection', () => {
  let projection: ActorNeo4jProjection;
  let mockSession: MockSession;
  let getSession: jest.Mock<MockSession, []>;
  let logger: Logger;

  const createEvent = (): ActorOnboardedEventV1 =>
    ({
      eventId: 'event-123',
      eventType: 'ActorOnboardedEvent-V1',
      eventVersion: '1.0.0',
      occurredAt: new Date('2024-01-01T00:00:00.000Z'),
      aggregateId: 'actor-123',
      aggregateType: 'Actor',
      actorId: 'actor-123',
      type: 'Rider',
      roles: ['member'],
      workspaceId: 'workspace-456',
      linkedWallets: ['wallet-789'],
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      correlationId: 'corr-1',
      causationId: 'caus-1',
    } as unknown as ActorOnboardedEventV1);

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    getSession = jest.fn().mockReturnValue(mockSession);
    projection = new ActorNeo4jProjection({ getSession } as unknown as Neo4jService);
    logger = (projection as unknown as { logger: Logger }).logger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates or updates the Actor node and MEMBER_OF relationship', async () => {
    const event = createEvent();
    mockSession.run.mockResolvedValue(undefined);

    await projection.handle(event);

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledWith(
      expect.stringContaining('MERGE (actor:Actor {id: $actorId})'),
      expect.any(Object)
    );

    const [, params] = mockSession.run.mock.calls[0];
    expect(params).toMatchObject({
      actorId: event.actorId,
      type: event.type,
      workspaceId: event.workspaceId,
      createdAt: event.createdAt.toISOString(),
    });
    expect(typeof params?.updatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(params?.updatedAt as string))).toBe(false);

    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });

  it('closes the session in the finally block when an error occurs', async () => {
    const event = createEvent();
    const error = new Error('Neo4j failure');
    mockSession.run.mockRejectedValueOnce(error);
    const loggerErrorSpy = jest.spyOn(logger, 'error');

    await expect(projection.handle(event)).rejects.toThrow(error);

    expect(mockSession.run).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to project actor to Neo4j: ${error.message}`,
      error.stack
    );
    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });
});

describe('ActorNeo4jInitializer', () => {
  let initializer: ActorNeo4jInitializer;
  let mockSession: MockSession;
  let getSession: jest.Mock<MockSession, []>;
  let logger: Logger;

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    getSession = jest.fn().mockReturnValue(mockSession);
    initializer = new ActorNeo4jInitializer({ getSession } as unknown as Neo4jService);
    logger = (initializer as unknown as { logger: Logger }).logger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates constraint and indexes for Actor nodes', async () => {
    mockSession.run.mockResolvedValue(undefined);
    const loggerLogSpy = jest.spyOn(logger, 'log');

    await initializer.initialize();

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledTimes(3);

    expect(mockSession.run).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('CREATE CONSTRAINT actor_id_unique IF NOT EXISTS')
    );
    expect(mockSession.run).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('CREATE INDEX actor_type_index IF NOT EXISTS')
    );
    expect(mockSession.run).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('CREATE INDEX actor_workspaceId_index IF NOT EXISTS')
    );

    expect(loggerLogSpy).toHaveBeenCalledWith('UNIQUE constraint on Actor.id created');
    expect(loggerLogSpy).toHaveBeenCalledWith('Index on Actor.type created');
    expect(loggerLogSpy).toHaveBeenCalledWith('Index on Actor.workspaceId created');
    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });

  it('logs and rethrows errors during initialization', async () => {
    const error = new Error('Constraint creation failed');
    mockSession.run.mockRejectedValueOnce(error);
    const loggerErrorSpy = jest.spyOn(logger, 'error');

    await expect(initializer.initialize()).rejects.toThrow(error);

    expect(mockSession.run).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to initialize Neo4j constraints/indexes: ${error.message}`,
      error.stack
    );
    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });
});
