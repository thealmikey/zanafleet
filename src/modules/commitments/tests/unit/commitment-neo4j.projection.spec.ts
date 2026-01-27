import { Neo4jService } from '../../../../core/neo4j';
import { CommitmentStatus, CommitmentType } from '../../dto/commitment.enums';
import { CommitmentCreatedEventV1 } from '../../events/commitment-created.event';
import { CommitmentStatusChangedEventV1 } from '../../events/commitment-status-changed.event';
import {
  CommitmentNeo4jProjection,
  CommitmentNeo4jInitializer,
} from '../../projections/commitment-neo4j.projection';

describe('CommitmentNeo4jProjection', () => {
  let projection: CommitmentNeo4jProjection;
  let neo4jService: jest.Mocked<Neo4jService>;
  let mockSession: {
    run: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(() => {
    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    neo4jService = {
      getWriteSession: jest.fn().mockReturnValue(mockSession),
    } as unknown as jest.Mocked<Neo4jService>;

    projection = new CommitmentNeo4jProjection(neo4jService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle CommitmentCreatedEventV1', () => {
    const createCreatedEvent = (): CommitmentCreatedEventV1 => {
      return new CommitmentCreatedEventV1({
        eventId: 'event-123',
        commitmentId: 'commitment-456',
        actorId: 'actor-789',
        workspaceId: 'workspace-012',
        type: CommitmentType.DELIVERY,
        status: CommitmentStatus.PENDING,
        description: 'Test commitment',
        dueAt: new Date('2024-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-15T10:00:00Z'),
      });
    };

    it('should create Commitment node with COMMITTED and IN_WORKSPACE relationships', async () => {
      const event = createCreatedEvent();

      await projection.handle(event);

      expect(neo4jService.getWriteSession).toHaveBeenCalled();
      expect(mockSession.run).toHaveBeenCalledTimes(1);

      const [cypher, params] = mockSession.run.mock.calls[0];
      expect(cypher).toContain('MERGE (c:Commitment {id: $commitmentId})');
      expect(cypher).toContain('MATCH (a:Actor {id: $actorId})');
      expect(cypher).toContain('MERGE (a)-[:COMMITTED]->(c)');
      expect(cypher).toContain('MATCH (ws:Workspace {id: $workspaceId})');
      expect(cypher).toContain('MERGE (c)-[:IN_WORKSPACE]->(ws)');
      expect(params.commitmentId).toBe('commitment-456');
      expect(params.actorId).toBe('actor-789');
      expect(params.workspaceId).toBe('workspace-012');
      expect(params.type).toBe(CommitmentType.DELIVERY);
      expect(params.status).toBe(CommitmentStatus.PENDING);
    });

    it('should set commitment properties correctly', async () => {
      const event = createCreatedEvent();

      await projection.handle(event);

      const [cypher, params] = mockSession.run.mock.calls[0];
      expect(cypher).toContain('c.type = $type');
      expect(cypher).toContain('c.status = $status');
      expect(cypher).toContain('c.description = $description');
      expect(cypher).toContain('c.dueAt = datetime($dueAt)');
      expect(cypher).toContain('c.createdAt = datetime($createdAt)');
      expect(params.description).toBe('Test commitment');
      expect(params.dueAt).toBe('2024-12-31T23:59:59.000Z');
      expect(params.createdAt).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should close session after successful operation', async () => {
      const event = createCreatedEvent();

      await projection.handle(event);

      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    it('should close session after failed operation', async () => {
      const event = createCreatedEvent();
      mockSession.run.mockRejectedValue(new Error('Neo4j error'));

      await expect(projection.handle(event)).rejects.toThrow('Neo4j error');
      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('handle CommitmentStatusChangedEventV1', () => {
    const createStatusChangedEvent = (
      newStatus: CommitmentStatus,
    ): CommitmentStatusChangedEventV1 => {
      return new CommitmentStatusChangedEventV1({
        eventId: 'event-123',
        commitmentId: 'commitment-456',
        previousStatus: CommitmentStatus.PENDING,
        newStatus,
        changedAt: new Date('2024-01-20T10:00:00Z'),
      });
    };

    it('should add :Breached label when status changes to BREACHED', async () => {
      const event = createStatusChangedEvent(CommitmentStatus.BREACHED);

      await projection.handle(event);

      expect(mockSession.run).toHaveBeenCalledTimes(1);

      const [cypher, params] = mockSession.run.mock.calls[0];
      expect(cypher).toContain('MATCH (c:Commitment {id: $commitmentId})');
      expect(cypher).toContain('SET c.status = $newStatus');
      expect(cypher).toContain('c:Breached');
      expect(params.commitmentId).toBe('commitment-456');
      expect(params.newStatus).toBe(CommitmentStatus.BREACHED);
    });

    it('should update status without :Breached label for FULFILLED', async () => {
      const event = createStatusChangedEvent(CommitmentStatus.FULFILLED);

      await projection.handle(event);

      expect(mockSession.run).toHaveBeenCalledTimes(1);

      const [cypher, params] = mockSession.run.mock.calls[0];
      expect(cypher).toContain('MATCH (c:Commitment {id: $commitmentId})');
      expect(cypher).toContain('SET c.status = $newStatus');
      expect(cypher).not.toContain(':Breached');
      expect(params.newStatus).toBe(CommitmentStatus.FULFILLED);
    });

    it('should update status without :Breached label for CANCELLED', async () => {
      const event = createStatusChangedEvent(CommitmentStatus.CANCELLED);

      await projection.handle(event);

      const [cypher] = mockSession.run.mock.calls[0];
      expect(cypher).not.toContain(':Breached');
    });

    it('should close session after status update', async () => {
      const event = createStatusChangedEvent(CommitmentStatus.FULFILLED);

      await projection.handle(event);

      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    it('should close session after failed status update', async () => {
      const event = createStatusChangedEvent(CommitmentStatus.BREACHED);
      mockSession.run.mockRejectedValue(new Error('Neo4j error'));

      await expect(projection.handle(event)).rejects.toThrow('Neo4j error');
      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });
  });
});

describe('CommitmentNeo4jInitializer', () => {
  let initializer: CommitmentNeo4jInitializer;
  let neo4jService: jest.Mocked<Neo4jService>;
  let mockSession: {
    run: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(() => {
    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    neo4jService = {
      getWriteSession: jest.fn().mockReturnValue(mockSession),
    } as unknown as jest.Mocked<Neo4jService>;

    initializer = new CommitmentNeo4jInitializer(neo4jService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should create UNIQUE constraint on Commitment.id', async () => {
      await initializer.initialize();

      const cypherCalls = mockSession.run.mock.calls.map(([cypher]: [string]) => cypher);
      expect(cypherCalls.some((c: string) => c.includes('commitment_id_unique'))).toBe(true);
      expect(cypherCalls.some((c: string) => c.includes('FOR (c:Commitment) REQUIRE c.id IS UNIQUE'))).toBe(true);
    });

    it('should create index on Commitment.status', async () => {
      await initializer.initialize();

      const cypherCalls = mockSession.run.mock.calls.map(([cypher]: [string]) => cypher);
      expect(cypherCalls.some((c: string) => c.includes('commitment_status_index'))).toBe(true);
      expect(cypherCalls.some((c: string) => c.includes('ON (c.status)'))).toBe(true);
    });

    it('should create index on Commitment.dueAt', async () => {
      await initializer.initialize();

      const cypherCalls = mockSession.run.mock.calls.map(([cypher]: [string]) => cypher);
      expect(cypherCalls.some((c: string) => c.includes('commitment_dueAt_index'))).toBe(true);
      expect(cypherCalls.some((c: string) => c.includes('ON (c.dueAt)'))).toBe(true);
    });

    it('should create index on Commitment.createdAt', async () => {
      await initializer.initialize();

      const cypherCalls = mockSession.run.mock.calls.map(([cypher]: [string]) => cypher);
      expect(cypherCalls.some((c: string) => c.includes('commitment_createdAt_index'))).toBe(true);
      expect(cypherCalls.some((c: string) => c.includes('ON (c.createdAt)'))).toBe(true);
    });

    it('should use IF NOT EXISTS for idempotent initialization', async () => {
      await initializer.initialize();

      const cypherCalls = mockSession.run.mock.calls.map(([cypher]: [string]) => cypher);
      cypherCalls.forEach((cypher: string) => {
        expect(cypher).toContain('IF NOT EXISTS');
      });
    });

    it('should close session after initialization', async () => {
      await initializer.initialize();

      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    it('should close session after failed initialization', async () => {
      mockSession.run.mockRejectedValue(new Error('Neo4j error'));

      await expect(initializer.initialize()).rejects.toThrow('Neo4j error');
      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });
  });
});
