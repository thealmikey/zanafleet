import { Test, TestingModule } from '@nestjs/testing';

import { Neo4jModule, Neo4jService } from '../../index';

const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

/**
 * Neo4j Integration Tests
 *
 * Tests the Neo4j driver integration with actual database connection.
 *
 * Prerequisites:
 * - Docker services running: `docker-compose -f docker-compose.test.yml up -d`
 * - Neo4j available at bolt://localhost:7687 with no authentication
 *
 * Run: `npm run test:integration -- --testPathPattern=neo4j.integration.spec`
 */
describeIntegration('Neo4jModule Integration', () => {
  let module!: TestingModule;
  let neo4jService!: Neo4jService;
  let moduleInitializationFailed = false;

  beforeAll(async () => {
    try {
      module = await Test.createTestingModule({
        imports: [
          Neo4jModule.forRoot({
            uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
            database: process.env.NEO4J_DATABASE || 'neo4j',
          }),
        ],
      }).compile();

      await module.init();
      neo4jService = module.get<Neo4jService>(Neo4jService);
    } catch (error) {
      console.warn(
        'Failed to initialize Neo4j integration test module (Neo4j may not be available):',
        error instanceof Error ? error.message : String(error)
      );
      moduleInitializationFailed = true;
    }
  });

  beforeEach((): void => {
    if (moduleInitializationFailed) {
      throw new Error(
        'Neo4j integration test module failed to initialize. Ensure Neo4j is running (docker-compose -f docker-compose.test.yml up -d).'
      );
    }
  });

  afterAll(async () => {
    if (!moduleInitializationFailed) {
      await module.close();
    }
  });

  describe('connection', () => {
    it('should connect to Neo4j and run a simple query', async () => {
      const session = neo4jService.getSession();

      try {
        const result = await session.run('RETURN 1 as n');
        const record = result.records[0];

        expect(record).toBeDefined();
        expect(record.get('n').toNumber()).toBe(1);
      } finally {
        await session.close();
      }
    });

    it('should return driver instance', () => {
      const driver = neo4jService.getDriver();
      expect(driver).toBeDefined();
    });
  });

  describe('session modes', () => {
    it('should create read session', async () => {
      const session = neo4jService.getReadSession();

      try {
        const result = await session.run('RETURN "read" as mode');
        const record = result.records[0];

        expect(record.get('mode')).toBe('read');
      } finally {
        await session.close();
      }
    });

    it('should create write session', async () => {
      const session = neo4jService.getWriteSession();

      try {
        const result = await session.run('RETURN "write" as mode');
        const record = result.records[0];

        expect(record.get('mode')).toBe('write');
      } finally {
        await session.close();
      }
    });

    it('should create default session (write mode)', async () => {
      const session = neo4jService.getSession();

      try {
        const result = await session.run('CREATE (n:TestNode {id: $id}) RETURN n.id as id', {
          id: 'integration-test-node',
        });
        const record = result.records[0];

        expect(record.get('id')).toBe('integration-test-node');

        // Cleanup
        await session.run('MATCH (n:TestNode {id: $id}) DELETE n', {
          id: 'integration-test-node',
        });
      } finally {
        await session.close();
      }
    });
  });

  describe('graceful shutdown', () => {
    it('should close module without throwing', async () => {
      const testModule = await Test.createTestingModule({
        imports: [
          Neo4jModule.forRoot({
            uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
            database: process.env.NEO4J_DATABASE || 'neo4j',
          }),
        ],
      }).compile();

      await testModule.init();

      await expect(testModule.close()).resolves.not.toThrow();
    });
  });

  describe('multiple sessions', () => {
    it('should handle multiple concurrent sessions', async () => {
      const sessions = [
        neo4jService.getSession(),
        neo4jService.getSession(),
        neo4jService.getSession(),
      ];

      try {
        const results = await Promise.all(
          sessions.map((session, index) => session.run('RETURN $index as idx', { index }))
        );

        results.forEach((result, index) => {
          expect(result.records[0].get('idx').toNumber()).toBe(index);
        });
      } finally {
        await Promise.all(sessions.map((session) => session.close()));
      }
    });
  });
});
