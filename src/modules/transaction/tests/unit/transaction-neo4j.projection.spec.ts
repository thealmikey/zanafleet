import { Logger } from '@nestjs/common';

import { Neo4jService } from '../../../../core/neo4j';
import {
  TransactionType,
  TransactionStatus,
} from '../../dto/transaction.enums';
import { TransactionCreatedEventV1 } from '../../events/transaction-created.event';
import {
  TransactionNeo4jProjection,
  TransactionNeo4jInitializer,
} from '../../projections/transaction-neo4j.projection';

type MockSession = {
  run: jest.Mock<Promise<unknown>, [string, Record<string, unknown>?]>;
  close: jest.Mock<Promise<void>, []>;
};

describe('TransactionNeo4jProjection', () => {
  let projection: TransactionNeo4jProjection;
  let mockSession: MockSession;
  let getSession: jest.Mock<MockSession, []>;
  let logger: Logger;

  const createEvent = (): TransactionCreatedEventV1 => {
    const transactionType = Object.values(TransactionType)[0] as TransactionType;
    const transactionStatus = Object.values(TransactionStatus)[0] as TransactionStatus;

    return new TransactionCreatedEventV1({
      eventId: 'event-transaction-1',
      transactionId: 'txn-123',
      sourceWalletId: 'wallet-source',
      destinationWalletId: 'wallet-destination',
      amount: 1000,
      type: transactionType,
      status: transactionStatus,
      linkedEventId: 'linked-event-1',
      occurredAt: new Date('2024-01-03T00:00:00.000Z'),
      correlationId: 'corr-3',
      causationId: 'caus-3',
    });
  };

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    getSession = jest.fn().mockReturnValue(mockSession);
    projection = new TransactionNeo4jProjection({ getSession } as unknown as Neo4jService);
    logger = (projection as unknown as { logger: Logger }).logger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates or updates the Transaction node with FROM and TO relationships', async () => {
    const event = createEvent();
    mockSession.run.mockResolvedValue(undefined);

    await projection.handle(event);

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledTimes(1);

    const [query, params] = mockSession.run.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(query).toContain('MERGE (txn:Transaction {id: $transactionId})');
    expect(query).toContain('MERGE (txn)-[:FROM]->(sourceWallet)');
    expect(query).toContain('MERGE (txn)-[:TO]->(destWallet)');

    expect(params).toMatchObject({
      transactionId: event.transactionId,
      sourceWalletId: event.sourceWalletId,
      destinationWalletId: event.destinationWalletId,
      amount: event.amount,
      type: event.type,
      status: event.status,
      linkedEventId: event.linkedEventId,
      createdAt: event.occurredAt.toISOString(),
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
      `Failed to project transaction to Neo4j: ${error.message}`,
      error.stack,
    );
    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });
});

describe('TransactionNeo4jInitializer', () => {
  let initializer: TransactionNeo4jInitializer;
  let mockSession: MockSession;
  let getSession: jest.Mock<MockSession, []>;
  let logger: Logger;

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    getSession = jest.fn().mockReturnValue(mockSession);
    initializer = new TransactionNeo4jInitializer({ getSession } as unknown as Neo4jService);
    logger = (initializer as unknown as { logger: Logger }).logger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates constraint and indexes for Transaction nodes', async () => {
    mockSession.run.mockResolvedValue(undefined);
    const loggerLogSpy = jest.spyOn(logger, 'log');

    await initializer.initialize();

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledTimes(4);

    expect(mockSession.run).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('CREATE CONSTRAINT transaction_id_unique IF NOT EXISTS'),
    );
    expect(mockSession.run).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('CREATE INDEX transaction_status_index IF NOT EXISTS'),
    );
    expect(mockSession.run).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('CREATE INDEX transaction_type_index IF NOT EXISTS'),
    );
    expect(mockSession.run).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('CREATE INDEX transaction_createdAt_index IF NOT EXISTS'),
    );

    expect(loggerLogSpy).toHaveBeenCalledWith('UNIQUE constraint on Transaction.id created');
    expect(loggerLogSpy).toHaveBeenCalledWith('Index on Transaction.status created');
    expect(loggerLogSpy).toHaveBeenCalledWith('Index on Transaction.type created');
    expect(loggerLogSpy).toHaveBeenCalledWith('Index on Transaction.createdAt created');
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
