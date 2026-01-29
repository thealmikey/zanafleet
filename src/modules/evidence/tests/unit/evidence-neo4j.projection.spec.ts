import { Neo4jService } from '../../../../core/neo4j';
import { EvidenceType, SubjectType, EvidenceSource } from '../../dto/evidence.enums';
import { EvidenceCreatedEventV1 } from '../../events/evidence-created.event';
import {
  EvidenceNeo4jProjection,
  EvidenceNeo4jInitializer,
} from '../../projections/evidence-neo4j.projection';

describe('EvidenceNeo4jProjection', () => {
  let projection: EvidenceNeo4jProjection;
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

    projection = new EvidenceNeo4jProjection(neo4jService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createEvent = (): EvidenceCreatedEventV1 => {
    return new EvidenceCreatedEventV1({
      eventId: 'event-123',
      evidenceId: 'evidence-456',
      type: EvidenceType.CUSTOMER_FEEDBACK,
      actorId: 'actor-789',
      workspaceId: 'workspace-012',
      subjectType: SubjectType.RIDER,
      subjectId: 'subject-345',
      payload: { rating: 5, comment: 'Great!' },
      source: EvidenceSource.API,
      commandId: 'command-678',
      createdAt: new Date('2024-01-15T10:00:00Z'),
    });
  };

  describe('handle EvidenceCreatedEventV1', () => {
    it('should create Evidence node with correct properties', async () => {
      const event = createEvent();

      await projection.handle(event);

      expect(neo4jService.getWriteSession).toHaveBeenCalled();
      expect(mockSession.run).toHaveBeenCalledTimes(1);

      const [cypher, params] = mockSession.run.mock.calls[0];
      expect(cypher).toContain('MERGE (e:Evidence {id: $evidenceId})');
      expect(cypher).toContain('SET e.type = $type');
      expect(cypher).toContain('e.subjectType = $subjectType');
      expect(cypher).toContain('e.subjectId = $subjectId');
      expect(cypher).toContain('e.source = $source');
      expect(cypher).toContain('e.createdAt = datetime($createdAt)');
      expect(params.evidenceId).toBe('evidence-456');
      expect(params.type).toBe(EvidenceType.CUSTOMER_FEEDBACK);
      expect(params.subjectType).toBe(SubjectType.RIDER);
      expect(params.subjectId).toBe('subject-345');
      expect(params.source).toBe(EvidenceSource.API);
      expect(params.createdAt).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should create RECORDED relationship from Actor to Evidence', async () => {
      const event = createEvent();

      await projection.handle(event);

      const [cypher, params] = mockSession.run.mock.calls[0];
      expect(cypher).toContain('MATCH (a:Actor {id: $actorId})');
      expect(cypher).toContain('MERGE (a)-[r:RECORDED]->(e)');
      expect(cypher).toContain('SET r.at = datetime($createdAt)');
      expect(params.actorId).toBe('actor-789');
    });

    it('should create ABOUT relationship from Evidence to Workspace', async () => {
      const event = createEvent();

      await projection.handle(event);

      const [cypher, params] = mockSession.run.mock.calls[0];
      expect(cypher).toContain('MATCH (ws:Workspace {id: $workspaceId})');
      expect(cypher).toContain('MERGE (e)-[:ABOUT]->(ws)');
      expect(params.workspaceId).toBe('workspace-012');
    });

    it('should close session after successful operation', async () => {
      const event = createEvent();

      await projection.handle(event);

      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    it('should close session after failed operation', async () => {
      const event = createEvent();
      mockSession.run.mockRejectedValue(new Error('Neo4j error'));

      await expect(projection.handle(event)).rejects.toThrow('Neo4j error');
      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    it('should handle same event twice without failure (idempotency via MERGE)', async () => {
      const event = createEvent();

      await projection.handle(event);
      await projection.handle(event);

      expect(mockSession.run).toHaveBeenCalledTimes(2);
      expect(mockSession.close).toHaveBeenCalledTimes(2);
    });

    it('should accept all EvidenceType values', async () => {
      const types = [
        EvidenceType.CUSTOMER_FEEDBACK,
        EvidenceType.SACCO_VISIT,
        EvidenceType.OPS_ISSUE,
      ];

      for (const type of types) {
        jest.clearAllMocks();
        const event = new EvidenceCreatedEventV1({
          eventId: 'event-123',
          evidenceId: 'evidence-456',
          type,
          actorId: 'actor-789',
          workspaceId: 'workspace-012',
          subjectType: SubjectType.RIDER,
          subjectId: 'subject-345',
          payload: {},
          source: EvidenceSource.API,
          commandId: 'command-678',
          createdAt: new Date(),
        });

        await projection.handle(event);

        const [, params] = mockSession.run.mock.calls[0];
        expect(params.type).toBe(type);
      }
    });

    it('should accept all SubjectType values', async () => {
      const subjectTypes = [SubjectType.RIDER, SubjectType.BUSINESS, SubjectType.SACCO];

      for (const subjectType of subjectTypes) {
        jest.clearAllMocks();
        const event = new EvidenceCreatedEventV1({
          eventId: 'event-123',
          evidenceId: 'evidence-456',
          type: EvidenceType.CUSTOMER_FEEDBACK,
          actorId: 'actor-789',
          workspaceId: 'workspace-012',
          subjectType,
          subjectId: 'subject-345',
          payload: {},
          source: EvidenceSource.API,
          commandId: 'command-678',
          createdAt: new Date(),
        });

        await projection.handle(event);

        const [, params] = mockSession.run.mock.calls[0];
        expect(params.subjectType).toBe(subjectType);
      }
    });

    it('should accept all EvidenceSource values', async () => {
      const sources = [EvidenceSource.API, EvidenceSource.SMS, EvidenceSource.OPS_APP];

      for (const source of sources) {
        jest.clearAllMocks();
        const event = new EvidenceCreatedEventV1({
          eventId: 'event-123',
          evidenceId: 'evidence-456',
          type: EvidenceType.CUSTOMER_FEEDBACK,
          actorId: 'actor-789',
          workspaceId: 'workspace-012',
          subjectType: SubjectType.RIDER,
          subjectId: 'subject-345',
          payload: {},
          source,
          commandId: 'command-678',
          createdAt: new Date(),
        });

        await projection.handle(event);

        const [, params] = mockSession.run.mock.calls[0];
        expect(params.source).toBe(source);
      }
    });
  });
});

describe('EvidenceNeo4jInitializer', () => {
  let initializer: EvidenceNeo4jInitializer;
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

    initializer = new EvidenceNeo4jInitializer(neo4jService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should create unique constraint on Evidence.id', async () => {
      await initializer.initialize();

      const cypherCalls = mockSession.run.mock.calls.map(([cypher]: [string]) => cypher);
      expect(cypherCalls.some((c: string) => c.includes('evidence_id_unique'))).toBe(true);
      expect(
        cypherCalls.some((c: string) => c.includes('FOR (e:Evidence) REQUIRE e.id IS UNIQUE'))
      ).toBe(true);
    });

    it('should create index on Evidence.type for type-based queries', async () => {
      await initializer.initialize();

      const cypherCalls = mockSession.run.mock.calls.map(([cypher]: [string]) => cypher);
      expect(cypherCalls.some((c: string) => c.includes('evidence_type_index'))).toBe(true);
      expect(cypherCalls.some((c: string) => c.includes('FOR (e:Evidence) ON (e.type)'))).toBe(
        true
      );
    });

    it('should create index on Evidence.createdAt for time-range queries', async () => {
      await initializer.initialize();

      const cypherCalls = mockSession.run.mock.calls.map(([cypher]: [string]) => cypher);
      expect(cypherCalls.some((c: string) => c.includes('evidence_createdAt_index'))).toBe(true);
      expect(cypherCalls.some((c: string) => c.includes('FOR (e:Evidence) ON (e.createdAt)'))).toBe(
        true
      );
    });

    it('should create composite index on (type, createdAt) for filtered time queries', async () => {
      await initializer.initialize();

      const cypherCalls = mockSession.run.mock.calls.map(([cypher]: [string]) => cypher);
      expect(cypherCalls.some((c: string) => c.includes('evidence_type_createdAt_index'))).toBe(
        true
      );
      expect(
        cypherCalls.some((c: string) => c.includes('FOR (e:Evidence) ON (e.type, e.createdAt)'))
      ).toBe(true);
    });

    it('should use IF NOT EXISTS for idempotent initialization', async () => {
      await initializer.initialize();

      const cypherCalls = mockSession.run.mock.calls.map(([cypher]: [string]) => cypher);
      cypherCalls.forEach((cypher: string) => {
        expect(cypher).toContain('IF NOT EXISTS');
      });
    });

    it('should create exactly 4 indexes/constraints', async () => {
      await initializer.initialize();

      expect(mockSession.run).toHaveBeenCalledTimes(4);
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
