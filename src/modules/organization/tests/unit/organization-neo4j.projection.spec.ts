import { Logger } from '@nestjs/common';

import { Neo4jService } from '../../../../core/neo4j';
import { OrganizationType, OrganizationStatus } from '../../dto/organization.enums';
import { OrganizationCreatedEventV1 } from '../../events/organization-created.event';
import {
  OrganizationNeo4jProjection,
  OrganizationNeo4jInitializer,
} from '../../projections/organization-neo4j.projection';

type MockSession = {
  run: jest.Mock<Promise<unknown>, [string, Record<string, unknown>?]>;
  close: jest.Mock<Promise<void>, []>;
};

describe('OrganizationNeo4jProjection', () => {
  let projection: OrganizationNeo4jProjection;
  let mockSession: MockSession;
  let getSession: jest.Mock<MockSession, []>;
  let logger: Logger;

  const createEvent = (): OrganizationCreatedEventV1 => {
    const organizationType = Object.values(OrganizationType)[0] as OrganizationType;
    const organizationStatus = Object.values(OrganizationStatus)[0] as OrganizationStatus;

    return new OrganizationCreatedEventV1({
      eventId: 'event-organization-1',
      organizationId: 'org-123',
      name: 'ZanaFleet Org',
      type: organizationType,
      status: organizationStatus,
      linkedWallets: ['wallet-1', 'wallet-2'],
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      occurredAt: new Date('2024-01-01T00:00:00.000Z'),
      correlationId: 'corr-1',
      causationId: 'caus-1',
    });
  };

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    getSession = jest.fn().mockReturnValue(mockSession);
    projection = new OrganizationNeo4jProjection({ getSession } as unknown as Neo4jService);
    logger = (projection as unknown as { logger: Logger }).logger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates or updates the Organization node with correct parameters', async () => {
    const event = createEvent();
    mockSession.run.mockResolvedValue(undefined);

    await projection.handle(event);

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledTimes(1);

    const [query, params] = mockSession.run.mock.calls[0] as [string, Record<string, unknown>];

    expect(query).toContain('MERGE (org:Organization {id: $organizationId})');
    expect(query).toContain('org.linkedWallets = $linkedWallets');

    expect(params).toMatchObject({
      organizationId: event.organizationId,
      name: event.name,
      type: event.type,
      status: event.status,
      createdAt: event.createdAt.toISOString(),
      linkedWallets: event.linkedWallets,
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
      `Failed to project organization to Neo4j: ${error.message}`,
      error.stack
    );
    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });
});

describe('OrganizationNeo4jInitializer', () => {
  let initializer: OrganizationNeo4jInitializer;
  let mockSession: MockSession;
  let getSession: jest.Mock<MockSession, []>;
  let logger: Logger;

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    getSession = jest.fn().mockReturnValue(mockSession);
    initializer = new OrganizationNeo4jInitializer({ getSession } as unknown as Neo4jService);
    logger = (initializer as unknown as { logger: Logger }).logger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates constraint and indexes for Organization nodes', async () => {
    mockSession.run.mockResolvedValue(undefined);
    const loggerLogSpy = jest.spyOn(logger, 'log');

    await initializer.initialize();

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledTimes(4);

    expect(mockSession.run).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('CREATE CONSTRAINT organization_id_unique IF NOT EXISTS')
    );
    expect(mockSession.run).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('CREATE INDEX organization_type_index IF NOT EXISTS')
    );
    expect(mockSession.run).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('CREATE INDEX organization_status_index IF NOT EXISTS')
    );
    expect(mockSession.run).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('CREATE INDEX organization_createdAt_index IF NOT EXISTS')
    );

    expect(loggerLogSpy).toHaveBeenCalledWith('UNIQUE constraint on Organization.id created');
    expect(loggerLogSpy).toHaveBeenCalledWith('Index on Organization.type created');
    expect(loggerLogSpy).toHaveBeenCalledWith('Index on Organization.status created');
    expect(loggerLogSpy).toHaveBeenCalledWith('Index on Organization.createdAt created');
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
