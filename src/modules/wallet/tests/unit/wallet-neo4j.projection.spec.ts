import { Logger } from '@nestjs/common';
import {
  WalletNeo4jProjection,
  WalletNeo4jInitializer,
} from '../../projections/wallet-neo4j.projection';
import { Neo4jService } from '../../../../core/neo4j';
import { WalletCreatedEventV1 } from '../../events/wallet-created.event';
import { OwnerType, WalletType } from '../../dto/wallet.enums';

type MockSession = {
  run: jest.Mock<Promise<unknown>, [string, Record<string, unknown>?]>;
  close: jest.Mock<Promise<void>, []>;
};

describe('WalletNeo4jProjection', () => {
  let projection: WalletNeo4jProjection;
  let mockSession: MockSession;
  let getSession: jest.Mock<MockSession, []>;
  let logger: Logger;

  const createEvent = (ownerType: OwnerType): WalletCreatedEventV1 =>
    new WalletCreatedEventV1({
      eventId: `event-wallet-${ownerType}`,
      walletId: `wallet-${ownerType}`,
      ownerId: `${ownerType.toLowerCase()}-owner`,
      ownerType,
      type: WalletType.Escrow,
      currency: 'USD',
      createdAt: new Date('2024-01-04T00:00:00.000Z'),
      occurredAt: new Date('2024-01-04T00:00:00.000Z'),
      correlationId: 'corr-4',
      causationId: 'caus-4',
    });

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    getSession = jest.fn().mockReturnValue(mockSession);
    projection = new WalletNeo4jProjection({ getSession } as unknown as Neo4jService);
    logger = (projection as unknown as { logger: Logger }).logger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates or updates the Wallet node and OWNED_BY relationship with correct parameters', async () => {
    const event = createEvent(OwnerType.Actor);
    mockSession.run.mockResolvedValue(undefined);

    await projection.handle(event);

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledTimes(1);

    const [query, params] = mockSession.run.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(query).toContain('MERGE (wallet:Wallet {id: $walletId})');
    expect(query).toContain('MERGE (wallet)-[:OWNED_BY]->(owner)');

    expect(params).toMatchObject({
      walletId: event.walletId,
      ownerId: event.ownerId,
      ownerType: event.ownerType,
      type: event.type,
      currency: event.currency,
      createdAt: event.createdAt.toISOString(),
    });
    expect(typeof params.updatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(params.updatedAt as string))).toBe(false);

    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ownerType: OwnerType.Actor, expectedLabel: 'Actor' },
    { ownerType: OwnerType.Workspace, expectedLabel: 'Workspace' },
    { ownerType: OwnerType.Organization, expectedLabel: 'Organization' },
  ])(
    'uses the correct owner label for $ownerType owner type',
    async ({ ownerType, expectedLabel }) => {
      const event = createEvent(ownerType);
      mockSession.run.mockResolvedValue(undefined);

      await projection.handle(event);

      const [query] = mockSession.run.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(query).toContain(`MATCH (owner:${expectedLabel} {id: $ownerId})`);
      expect(mockSession.close).toHaveBeenCalledTimes(1);
    },
  );

  it('logs and rethrows errors while ensuring the session is closed on failure', async () => {
    const event = createEvent(OwnerType.Actor);
    const error = new Error('Neo4j failure');
    mockSession.run.mockRejectedValueOnce(error);
    const loggerErrorSpy = jest.spyOn(logger, 'error');

    await expect(projection.handle(event)).rejects.toThrow(error);

    expect(mockSession.run).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to project wallet to Neo4j: ${error.message}`,
      error.stack,
    );
    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });
});

describe('WalletNeo4jInitializer', () => {
  let initializer: WalletNeo4jInitializer;
  let mockSession: MockSession;
  let getSession: jest.Mock<MockSession, []>;
  let logger: Logger;

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    getSession = jest.fn().mockReturnValue(mockSession);
    initializer = new WalletNeo4jInitializer({ getSession } as unknown as Neo4jService);
    logger = (initializer as unknown as { logger: Logger }).logger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates constraint and indexes for Wallet nodes', async () => {
    mockSession.run.mockResolvedValue(undefined);
    const loggerLogSpy = jest.spyOn(logger, 'log');

    await initializer.initialize();

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledTimes(4);

    expect(mockSession.run).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('CREATE CONSTRAINT wallet_id_unique IF NOT EXISTS'),
    );
    expect(mockSession.run).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('CREATE INDEX wallet_ownerId_index IF NOT EXISTS'),
    );
    expect(mockSession.run).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('CREATE INDEX wallet_type_index IF NOT EXISTS'),
    );
    expect(mockSession.run).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('CREATE INDEX wallet_ownerType_index IF NOT EXISTS'),
    );

    expect(loggerLogSpy).toHaveBeenCalledWith('UNIQUE constraint on Wallet.id created');
    expect(loggerLogSpy).toHaveBeenCalledWith('Index on Wallet.ownerId created');
    expect(loggerLogSpy).toHaveBeenCalledWith('Index on Wallet.type created');
    expect(loggerLogSpy).toHaveBeenCalledWith('Index on Wallet.ownerType created');
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
