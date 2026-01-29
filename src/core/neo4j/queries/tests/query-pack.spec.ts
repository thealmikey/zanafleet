import {
  ACTORS_WITH_BREACHES,
  ACTORS_BY_TYPE_IN_WORKSPACE,
  ACTORS_WITH_CAPABILITY,
  ACTOR_DETAILS,
} from '../actors.queries';
import {
  BUSINESSES_NEEDING_CAPABILITY,
  BUSINESSES_WITH_CAPABILITIES,
  BUSINESSES_BY_GEO,
} from '../businesses.queries';
import {
  RIDERS_WITH_SUCCESS_RATE,
  RIDERS_IN_WORKSPACE,
  RIDER_COMMITMENT_SUMMARY,
} from '../riders.queries';
import {
  WORKSPACES_BY_DENSITY,
  WORKSPACES_BY_TYPE,
  WORKSPACE_DETAILS,
  WORKSPACES_WITH_ACTIVE_COMMITMENTS,
} from '../workspaces.queries';

import {
  TEST_ACTORS,
  TEST_WORKSPACES,
  TEST_COMMITMENTS,
  EXPECTED_RESULTS,
} from './test-dataset';

/**
 * Creates a mock Neo4j record with get() method
 */
function createMockRecord(data: Record<string, unknown>): {
  get: (key: string) => unknown;
  toObject: () => Record<string, unknown>;
  keys: string[];
} {
  return {
    get: (key: string) => data[key],
    toObject: () => data,
    keys: Object.keys(data),
  };
}

/**
 * Creates a mock Neo4j session result
 */
function createMockResult(records: Record<string, unknown>[]): {
  records: ReturnType<typeof createMockRecord>[];
} {
  return {
    records: records.map(createMockRecord),
  };
}

/**
 * Creates a mock Neo4j session
 */
function createMockSession(mockResults: Record<string, unknown>[]): {
  run: jest.Mock;
  close: jest.Mock;
} {
  return {
    run: jest.fn().mockResolvedValue(createMockResult(mockResults)),
    close: jest.fn(),
  };
}

describe('Neo4j Query Pack', () => {
  describe('Query Structure Validation', () => {
    it('should have parameterized RIDERS_WITH_SUCCESS_RATE query', () => {
      expect(RIDERS_WITH_SUCCESS_RATE).toContain('$minRate');
      expect(RIDERS_WITH_SUCCESS_RATE).not.toContain('${');
      expect(RIDERS_WITH_SUCCESS_RATE).toContain('MATCH');
      expect(RIDERS_WITH_SUCCESS_RATE).toContain('RETURN');
    });

    it('should have parameterized BUSINESSES_NEEDING_CAPABILITY query', () => {
      expect(BUSINESSES_NEEDING_CAPABILITY).toContain('$capability');
      expect(BUSINESSES_NEEDING_CAPABILITY).not.toContain('${');
      expect(BUSINESSES_NEEDING_CAPABILITY).toContain('NOT EXISTS');
    });

    it('should have parameterized ACTORS_WITH_BREACHES query', () => {
      expect(ACTORS_WITH_BREACHES).toContain('BREACHED');
      expect(ACTORS_WITH_BREACHES).toContain('ORDER BY breachCount DESC');
    });

    it('should have parameterized WORKSPACES_BY_DENSITY query', () => {
      expect(WORKSPACES_BY_DENSITY).toContain('$geo');
      expect(WORKSPACES_BY_DENSITY).not.toContain('${');
      expect(WORKSPACES_BY_DENSITY).toContain('CONTAINS');
    });
  });

  describe('Rider Queries', () => {
    describe('RIDERS_WITH_SUCCESS_RATE', () => {
      it('should return riders meeting minimum success rate', async () => {
        const mockData = [
          {
            riderId: 'actor-001',
            name: 'John Kamau',
            successRate: 0.667,
            totalCommitments: 3,
          },
        ];
        const mockSession = createMockSession(mockData);

        const result = await mockSession.run(RIDERS_WITH_SUCCESS_RATE, { minRate: 0.6 });
        const records = result.records;

        expect(mockSession.run).toHaveBeenCalledWith(RIDERS_WITH_SUCCESS_RATE, { minRate: 0.6 });
        expect(records).toHaveLength(1);
        expect(records[0].get('riderId')).toBe('actor-001');
        expect(records[0].get('name')).toBe('John Kamau');
        expect(records[0].get('successRate')).toBeCloseTo(0.667, 2);
      });

      it('should return empty array when no riders meet threshold', async () => {
        const mockSession = createMockSession([]);

        const result = await mockSession.run(RIDERS_WITH_SUCCESS_RATE, { minRate: 0.99 });

        expect(result.records).toHaveLength(0);
      });
    });

    describe('RIDERS_IN_WORKSPACE', () => {
      it('should return riders in specified workspace', async () => {
        const mockData = [
          { riderId: 'actor-001', name: 'John Kamau', joinedAt: '2024-01-15T10:00:00Z' },
          { riderId: 'actor-002', name: 'Mary Wanjiku', joinedAt: '2024-01-20T09:00:00Z' },
        ];
        const mockSession = createMockSession(mockData);

        const result = await mockSession.run(RIDERS_IN_WORKSPACE, { workspaceId: 'ws-001' });

        expect(mockSession.run).toHaveBeenCalledWith(RIDERS_IN_WORKSPACE, { workspaceId: 'ws-001' });
        expect(result.records).toHaveLength(2);
      });
    });

    describe('RIDER_COMMITMENT_SUMMARY', () => {
      it('should return commitment summary for a rider', async () => {
        const mockData = [
          {
            riderId: 'actor-001',
            name: 'John Kamau',
            total: 3,
            fulfilled: 2,
            breached: 1,
            pending: 0,
          },
        ];
        const mockSession = createMockSession(mockData);

        const result = await mockSession.run(RIDER_COMMITMENT_SUMMARY, { riderId: 'actor-001' });
        const record = result.records[0];

        expect(mockSession.run).toHaveBeenCalledWith(RIDER_COMMITMENT_SUMMARY, { riderId: 'actor-001' });
        expect(record.get('total')).toBe(3);
        expect(record.get('fulfilled')).toBe(2);
        expect(record.get('breached')).toBe(1);
      });
    });
  });

  describe('Business Queries', () => {
    describe('BUSINESSES_NEEDING_CAPABILITY', () => {
      it('should return businesses without specified capability', async () => {
        const mockData = [{ workspaceId: 'ws-003', businessName: 'Kisumu Traders' }];
        const mockSession = createMockSession(mockData);

        const result = await mockSession.run(BUSINESSES_NEEDING_CAPABILITY, {
          capability: 'COLD_CHAIN',
        });

        expect(mockSession.run).toHaveBeenCalledWith(BUSINESSES_NEEDING_CAPABILITY, {
          capability: 'COLD_CHAIN',
        });
        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('businessName')).toBe('Kisumu Traders');
      });

      it('should return empty when all businesses have capability', async () => {
        const mockSession = createMockSession([]);

        const result = await mockSession.run(BUSINESSES_NEEDING_CAPABILITY, {
          capability: 'RETAIL',
        });

        expect(result.records).toHaveLength(0);
      });
    });

    describe('BUSINESSES_BY_GEO', () => {
      it('should return businesses in geographic area', async () => {
        const mockData = [
          { workspaceId: 'ws-002', businessName: 'Mombasa Logistics', geo: 'Mombasa, Kenya' },
        ];
        const mockSession = createMockSession(mockData);

        const result = await mockSession.run(BUSINESSES_BY_GEO, { geo: 'Mombasa' });

        expect(mockSession.run).toHaveBeenCalledWith(BUSINESSES_BY_GEO, { geo: 'Mombasa' });
        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('geo')).toContain('Mombasa');
      });
    });
  });

  describe('Actor Queries', () => {
    describe('ACTORS_WITH_BREACHES', () => {
      it('should return actors with breached commitments sorted by count', async () => {
        const mockData = [
          { actorId: 'actor-001', actorType: 'RIDER', name: 'John Kamau', breachCount: 1 },
          { actorId: 'actor-003', actorType: 'RIDER', name: 'Peter Ochieng', breachCount: 1 },
        ];
        const mockSession = createMockSession(mockData);

        const result = await mockSession.run(ACTORS_WITH_BREACHES, {});

        expect(mockSession.run).toHaveBeenCalledWith(ACTORS_WITH_BREACHES, {});
        expect(result.records).toHaveLength(2);
        expect(result.records[0].get('breachCount')).toBeGreaterThanOrEqual(1);
      });

      it('should return empty when no breaches exist', async () => {
        const mockSession = createMockSession([]);

        const result = await mockSession.run(ACTORS_WITH_BREACHES, {});

        expect(result.records).toHaveLength(0);
      });
    });

    describe('ACTORS_BY_TYPE_IN_WORKSPACE', () => {
      it('should return actors of specified type in workspace', async () => {
        const mockData = [
          {
            actorId: 'actor-001',
            name: 'John Kamau',
            capabilities: ['MOTORCYCLE', 'COLD_CHAIN'],
          },
          { actorId: 'actor-002', name: 'Mary Wanjiku', capabilities: ['BICYCLE', 'FRAGILE'] },
        ];
        const mockSession = createMockSession(mockData);

        const result = await mockSession.run(ACTORS_BY_TYPE_IN_WORKSPACE, {
          workspaceId: 'ws-001',
          actorType: 'RIDER',
        });

        expect(mockSession.run).toHaveBeenCalledWith(ACTORS_BY_TYPE_IN_WORKSPACE, {
          workspaceId: 'ws-001',
          actorType: 'RIDER',
        });
        expect(result.records).toHaveLength(2);
      });
    });

    describe('ACTORS_WITH_CAPABILITY', () => {
      it('should return actors with specified capability', async () => {
        const mockData = [
          {
            actorId: 'actor-001',
            actorType: 'RIDER',
            name: 'John Kamau',
            workspaceIds: ['ws-001'],
          },
          {
            actorId: 'actor-004',
            actorType: 'DRIVER',
            name: 'James Mwangi',
            workspaceIds: ['ws-002'],
          },
        ];
        const mockSession = createMockSession(mockData);

        const result = await mockSession.run(ACTORS_WITH_CAPABILITY, { capability: 'COLD_CHAIN' });

        expect(mockSession.run).toHaveBeenCalledWith(ACTORS_WITH_CAPABILITY, { capability: 'COLD_CHAIN' });
        expect(result.records).toHaveLength(2);
      });
    });

    describe('ACTOR_DETAILS', () => {
      it('should return complete actor details', async () => {
        const mockData = [
          {
            actorId: 'actor-001',
            actorType: 'RIDER',
            name: 'John Kamau',
            capabilities: ['MOTORCYCLE', 'COLD_CHAIN'],
            workspaces: ['ws-001'],
            totalCommitments: 3,
            fulfilled: 2,
            breached: 1,
          },
        ];
        const mockSession = createMockSession(mockData);

        const result = await mockSession.run(ACTOR_DETAILS, { actorId: 'actor-001' });
        const record = result.records[0];

        expect(mockSession.run).toHaveBeenCalledWith(ACTOR_DETAILS, { actorId: 'actor-001' });
        expect(record.get('actorId')).toBe('actor-001');
        expect(record.get('capabilities')).toContain('COLD_CHAIN');
        expect(record.get('totalCommitments')).toBe(3);
      });
    });
  });

  describe('Workspace Queries', () => {
    describe('WORKSPACES_BY_DENSITY', () => {
      it('should return workspaces in geo area with member counts', async () => {
        const mockData = [
          {
            workspaceId: 'ws-001',
            name: 'Nairobi Express SACCO',
            type: 'SACCO',
            geo: 'Nairobi, Kenya',
            memberCount: 2,
          },
        ];
        const mockSession = createMockSession(mockData);

        const result = await mockSession.run(WORKSPACES_BY_DENSITY, { geo: 'Nairobi' });

        expect(mockSession.run).toHaveBeenCalledWith(WORKSPACES_BY_DENSITY, { geo: 'Nairobi' });
        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('memberCount')).toBe(2);
      });

      it('should return empty for non-existent geo', async () => {
        const mockSession = createMockSession([]);

        const result = await mockSession.run(WORKSPACES_BY_DENSITY, { geo: 'Lagos' });

        expect(result.records).toHaveLength(0);
      });
    });

    describe('WORKSPACES_BY_TYPE', () => {
      it('should return workspaces of specified type', async () => {
        const mockData = [
          {
            workspaceId: 'ws-002',
            name: 'Mombasa Logistics',
            geo: 'Mombasa, Kenya',
            memberCount: 2,
          },
          {
            workspaceId: 'ws-003',
            name: 'Kisumu Traders',
            geo: 'Kisumu, Kenya',
            memberCount: 1,
          },
        ];
        const mockSession = createMockSession(mockData);

        const result = await mockSession.run(WORKSPACES_BY_TYPE, { workspaceType: 'BUSINESS' });

        expect(mockSession.run).toHaveBeenCalledWith(WORKSPACES_BY_TYPE, { workspaceType: 'BUSINESS' });
        expect(result.records).toHaveLength(2);
      });
    });

    describe('WORKSPACE_DETAILS', () => {
      it('should return workspace details with member breakdown', async () => {
        const mockData = [
          {
            workspaceId: 'ws-001',
            name: 'Nairobi Express SACCO',
            type: 'SACCO',
            geo: 'Nairobi, Kenya',
            status: 'ACTIVE',
            membersByType: [{ type: 'RIDER', count: 2 }],
          },
        ];
        const mockSession = createMockSession(mockData);

        const result = await mockSession.run(WORKSPACE_DETAILS, { workspaceId: 'ws-001' });
        const record = result.records[0];

        expect(mockSession.run).toHaveBeenCalledWith(WORKSPACE_DETAILS, { workspaceId: 'ws-001' });
        expect(record.get('name')).toBe('Nairobi Express SACCO');
        expect(record.get('membersByType')).toHaveLength(1);
      });
    });

    describe('WORKSPACES_WITH_ACTIVE_COMMITMENTS', () => {
      it('should return workspaces with pending commitments', async () => {
        const mockData = [
          {
            workspaceId: 'ws-001',
            name: 'Nairobi Express SACCO',
            type: 'SACCO',
            activeCommitmentCount: 1,
          },
          {
            workspaceId: 'ws-002',
            name: 'Mombasa Logistics',
            type: 'BUSINESS',
            activeCommitmentCount: 1,
          },
        ];
        const mockSession = createMockSession(mockData);

        const result = await mockSession.run(WORKSPACES_WITH_ACTIVE_COMMITMENTS, {});

        expect(mockSession.run).toHaveBeenCalledWith(WORKSPACES_WITH_ACTIVE_COMMITMENTS, {});
        expect(result.records).toHaveLength(2);
        expect(result.records[0].get('activeCommitmentCount')).toBeGreaterThan(0);
      });
    });
  });

  describe('Neo4j Aura Compatibility', () => {
    it('should not use APOC procedures', () => {
      const allQueries = [
        RIDERS_WITH_SUCCESS_RATE,
        RIDERS_IN_WORKSPACE,
        RIDER_COMMITMENT_SUMMARY,
        BUSINESSES_NEEDING_CAPABILITY,
        BUSINESSES_WITH_CAPABILITIES,
        BUSINESSES_BY_GEO,
        ACTORS_WITH_BREACHES,
        ACTORS_BY_TYPE_IN_WORKSPACE,
        ACTORS_WITH_CAPABILITY,
        ACTOR_DETAILS,
        WORKSPACES_BY_DENSITY,
        WORKSPACES_BY_TYPE,
        WORKSPACE_DETAILS,
        WORKSPACES_WITH_ACTIVE_COMMITMENTS,
      ];

      allQueries.forEach((query) => {
        expect(query.toLowerCase()).not.toContain('apoc.');
        expect(query.toLowerCase()).not.toContain('call apoc');
      });
    });

    it('should not use deprecated Cypher syntax', () => {
      const allQueries = [
        RIDERS_WITH_SUCCESS_RATE,
        BUSINESSES_NEEDING_CAPABILITY,
        ACTORS_WITH_BREACHES,
        WORKSPACES_BY_DENSITY,
      ];

      allQueries.forEach((query) => {
        expect(query).not.toContain('CREATE UNIQUE');
        expect(query).not.toContain('START ');
        expect(query).not.toMatch(/\bextract\s*\(/i);
        expect(query).not.toMatch(/\bfilter\s*\(/i);
      });
    });

    it('should use parameterized queries (no string interpolation)', () => {
      const allQueries = [
        RIDERS_WITH_SUCCESS_RATE,
        BUSINESSES_NEEDING_CAPABILITY,
        ACTORS_WITH_BREACHES,
        WORKSPACES_BY_DENSITY,
      ];

      allQueries.forEach((query) => {
        expect(query).not.toContain('${');
        expect(query).not.toContain("'+");
        expect(query).not.toContain("+'");
      });
    });
  });

  describe('Test Dataset Validation', () => {
    it('should have valid actor test data', () => {
      expect(TEST_ACTORS).toHaveLength(5);
      TEST_ACTORS.forEach((actor) => {
        expect(actor.id).toBeDefined();
        expect(actor.type).toBeDefined();
        expect(actor.name).toBeDefined();
        expect(Array.isArray(actor.capabilities)).toBe(true);
      });
    });

    it('should have valid workspace test data', () => {
      expect(TEST_WORKSPACES).toHaveLength(4);
      TEST_WORKSPACES.forEach((ws) => {
        expect(ws.id).toBeDefined();
        expect(ws.name).toBeDefined();
        expect(ws.type).toBeDefined();
        expect(ws.geo).toBeDefined();
      });
    });

    it('should have valid commitment test data', () => {
      expect(TEST_COMMITMENTS).toHaveLength(8);
      TEST_COMMITMENTS.forEach((commit) => {
        expect(commit.id).toBeDefined();
        expect(['FULFILLED', 'BREACHED', 'PENDING']).toContain(commit.status);
      });
    });

    it('should have expected results matching test data relationships', () => {
      expect(EXPECTED_RESULTS.ridersWithSuccessRate80).toHaveLength(1);
      expect(EXPECTED_RESULTS.actorsWithBreaches).toHaveLength(2);
      expect(EXPECTED_RESULTS.businessesNeedingColdChain).toHaveLength(1);
    });
  });
});
