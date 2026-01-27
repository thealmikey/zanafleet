import { Logger } from '@nestjs/common';
import {
  WorkspaceNeo4jProjection,
  WorkspaceNeo4jInitializer,
} from '../../projections/workspace-neo4j.projection';
import { Neo4jService } from '../../../../core/neo4j';
import { WorkspaceCreatedEventV1 } from '../../events/workspace-created.event';
import {
  WorkspaceType,
  WorkspaceStatus,
} from '../../dto/workspace.enums';

type MockSession = {
  run: jest.Mock<Promise<unknown>, [string, Record<string, unknown>?]>;
  close: jest.Mock<Promise<void>, []>;
};

describe('WorkspaceNeo4jProjection', () => {
  let projection: WorkspaceNeo4jProjection;
  let mockSession: MockSession;
  let getSession: jest.Mock<MockSession, []>;
  let logger: Logger;

  const createEvent = (): WorkspaceCreatedEventV1 => {
    const workspaceType = Object.values(WorkspaceType)[0] as WorkspaceType;
    const workspaceStatus = Object.values(WorkspaceStatus)[0] as WorkspaceStatus;

    return new WorkspaceCreatedEventV1({
      eventId: 'event-workspace-1',
      workspaceId: 'workspace-123',
      orgId: 'org-456',
      name: 'Operations Workspace',
      type: workspaceType,
      status: workspaceStatus,
      roleTemplates: ['Manager', 'Member'],
      createdAt: new Date('2024-01-02T00:00:00.000Z'),
      occurredAt: new Date('2024-01-02T00:00:00.000Z'),
      correlationId: 'corr-2',
      causationId: 'caus-2',
    });
  };

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    getSession = jest.fn().mockReturnValue(mockSession);
    projection = new WorkspaceNeo4jProjection({ getSession } as unknown as Neo4jService);
    logger = (projection as unknown as { logger: Logger }).logger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates or updates the Workspace node and PART_OF relationship with correct parameters', async () => {
    const event = createEvent();
    mockSession.run.mockResolvedValue(undefined);

    await projection.handle(event);

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledTimes(1);

    const [query, params] = mockSession.run.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(query).toContain('MERGE (ws:Workspace {id: $workspaceId})');
    expect(query).toContain('MERGE (ws)-[:PART_OF]->(org)');

    expect(params).toMatchObject({
      workspaceId: event.workspaceId,
      name: event.name,
      orgId: event.orgId,
      roleTemplates: event.roleTemplates,
      createdAt: event.createdAt.toISOString(),
    });
    expect(typeof params.updatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(params.updatedAt as string))).toBe(false);

    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });

  it('logs and rethrows errors while ensuring the session is closed on failure', async () => {
    const event = createEvent();
    const error = new Error('Neo4j failure');
    mockSession.run.mockRejectedValueOnce(error);
    const loggerErrorSpy = jest.spyOn(logger, 'error');

    await expect(projection.handle(event)).rejects.toThrow(error);

    expect(mockSession.run).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to project workspace to Neo4j: ${error.message}`,
      error.stack,
    );
    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });
});

describe('WorkspaceNeo4jInitializer', () => {
  let initializer: WorkspaceNeo4jInitializer;
  let mockSession: MockSession;
  let getSession: jest.Mock<MockSession, []>;
  let logger: Logger;

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    getSession = jest.fn().mockReturnValue(mockSession);
    initializer = new WorkspaceNeo4jInitializer({ getSession } as unknown as Neo4jService);
    logger = (initializer as unknown as { logger: Logger }).logger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates constraint and indexes for Workspace nodes', async () => {
    mockSession.run.mockResolvedValue(undefined);
    const loggerLogSpy = jest.spyOn(logger, 'log');

    await initializer.initialize();

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledTimes(3);

    expect(mockSession.run).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('CREATE CONSTRAINT workspace_id_unique IF NOT EXISTS'),
    );
    expect(mockSession.run).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('CREATE INDEX workspace_orgId_index IF NOT EXISTS'),
    );
    expect(mockSession.run).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('CREATE INDEX workspace_createdAt_index IF NOT EXISTS'),
    );

    expect(loggerLogSpy).toHaveBeenCalledWith('UNIQUE constraint on Workspace.id created');
    expect(loggerLogSpy).toHaveBeenCalledWith('Index on Workspace.orgId created');
    expect(loggerLogSpy).toHaveBeenCalledWith('Index on Workspace.createdAt created');
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
      error.stack,
    );
    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });
});
