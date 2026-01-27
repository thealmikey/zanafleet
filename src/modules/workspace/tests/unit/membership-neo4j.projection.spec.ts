import { Neo4jService } from '../../../../core/neo4j';
import { MembershipRole } from '../../dto/workspace.enums';
import { ActorAddedToWorkspaceEventV1 } from '../../events/actor-added-to-workspace.event';
import { ActorRemovedFromWorkspaceEventV1 } from '../../events/actor-removed-from-workspace.event';
import {
  MembershipNeo4jProjection,
  MembershipNeo4jInitializer,
} from '../../projections/membership-neo4j.projection';

describe('MembershipNeo4jProjection', () => {
  let projection: MembershipNeo4jProjection;
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

    projection = new MembershipNeo4jProjection(neo4jService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle ActorAddedToWorkspaceEventV1', () => {
    const createAddedEvent = (): ActorAddedToWorkspaceEventV1 => {
      return new ActorAddedToWorkspaceEventV1({
        eventId: 'event-123',
        actorId: 'actor-456',
        workspaceId: 'workspace-789',
        role: MembershipRole.RIDER,
        since: new Date('2024-01-15T10:00:00Z'),
      });
    };

    it('should create MEMBER_OF relationship with MERGE for idempotency', async () => {
      const event = createAddedEvent();

      await projection.handle(event);

      expect(neo4jService.getWriteSession).toHaveBeenCalled();
      expect(mockSession.run).toHaveBeenCalledTimes(1);

      const [cypher, params] = mockSession.run.mock.calls[0];
      expect(cypher).toContain('MERGE (a)-[r:MEMBER_OF]->(ws)');
      expect(cypher).toContain('MATCH (a:Actor {id: $actorId})');
      expect(cypher).toContain('MATCH (ws:Workspace {id: $workspaceId})');
      expect(params.actorId).toBe('actor-456');
      expect(params.workspaceId).toBe('workspace-789');
      expect(params.role).toBe(MembershipRole.RIDER);
      expect(params.since).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should set role and since properties on relationship', async () => {
      const event = createAddedEvent();

      await projection.handle(event);

      const [cypher] = mockSession.run.mock.calls[0];
      expect(cypher).toContain('SET r.role = $role');
      expect(cypher).toContain('r.since = datetime($since)');
    });

    it('should close session after successful operation', async () => {
      const event = createAddedEvent();

      await projection.handle(event);

      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    it('should close session after failed operation', async () => {
      const event = createAddedEvent();
      mockSession.run.mockRejectedValue(new Error('Neo4j error'));

      await expect(projection.handle(event)).rejects.toThrow('Neo4j error');
      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    it('should handle same event twice without failure (idempotency)', async () => {
      const event = createAddedEvent();

      await projection.handle(event);
      await projection.handle(event);

      expect(mockSession.run).toHaveBeenCalledTimes(2);
      expect(mockSession.close).toHaveBeenCalledTimes(2);
    });

    it('should accept all MembershipRole values', async () => {
      const roles = [
        MembershipRole.RIDER,
        MembershipRole.ADMIN,
        MembershipRole.OPS,
        MembershipRole.BUSINESS_OWNER,
      ];

      for (const role of roles) {
        jest.clearAllMocks();
        const event = new ActorAddedToWorkspaceEventV1({
          eventId: 'event-123',
          actorId: 'actor-456',
          workspaceId: 'workspace-789',
          role,
          since: new Date(),
        });

        await projection.handle(event);

        const [, params] = mockSession.run.mock.calls[0];
        expect(params.role).toBe(role);
      }
    });
  });

  describe('handle ActorRemovedFromWorkspaceEventV1', () => {
    const createRemovedEvent = (): ActorRemovedFromWorkspaceEventV1 => {
      return new ActorRemovedFromWorkspaceEventV1({
        eventId: 'event-123',
        actorId: 'actor-456',
        workspaceId: 'workspace-789',
        removedAt: new Date('2024-01-20T10:00:00Z'),
      });
    };

    it('should delete MEMBER_OF relationship', async () => {
      const event = createRemovedEvent();

      await projection.handle(event);

      expect(neo4jService.getWriteSession).toHaveBeenCalled();
      expect(mockSession.run).toHaveBeenCalledTimes(1);

      const [cypher, params] = mockSession.run.mock.calls[0];
      expect(cypher).toContain('MATCH (a:Actor {id: $actorId})-[r:MEMBER_OF]->(ws:Workspace {id: $workspaceId})');
      expect(cypher).toContain('DELETE r');
      expect(params.actorId).toBe('actor-456');
      expect(params.workspaceId).toBe('workspace-789');
    });

    it('should close session after successful deletion', async () => {
      const event = createRemovedEvent();

      await projection.handle(event);

      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    it('should close session after failed deletion', async () => {
      const event = createRemovedEvent();
      mockSession.run.mockRejectedValue(new Error('Neo4j error'));

      await expect(projection.handle(event)).rejects.toThrow('Neo4j error');
      expect(mockSession.close).toHaveBeenCalledTimes(1);
    });

    it('should handle deleting non-existent relationship gracefully', async () => {
      const event = createRemovedEvent();
      mockSession.run.mockResolvedValue({ records: [] });

      await expect(projection.handle(event)).resolves.not.toThrow();
    });
  });
});

describe('MembershipNeo4jInitializer', () => {
  let initializer: MembershipNeo4jInitializer;
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

    initializer = new MembershipNeo4jInitializer(neo4jService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should create index on MEMBER_OF.role', async () => {
      await initializer.initialize();

      const cypherCalls = mockSession.run.mock.calls.map(([cypher]: [string]) => cypher);
      expect(cypherCalls.some((c: string) => c.includes('member_of_role_index'))).toBe(true);
      expect(cypherCalls.some((c: string) => c.includes('FOR ()-[r:MEMBER_OF]-() ON (r.role)'))).toBe(true);
    });

    it('should create index on MEMBER_OF.since', async () => {
      await initializer.initialize();

      const cypherCalls = mockSession.run.mock.calls.map(([cypher]: [string]) => cypher);
      expect(cypherCalls.some((c: string) => c.includes('member_of_since_index'))).toBe(true);
      expect(cypherCalls.some((c: string) => c.includes('FOR ()-[r:MEMBER_OF]-() ON (r.since)'))).toBe(true);
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
