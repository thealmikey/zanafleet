import { Test, TestingModule } from '@nestjs/testing';

import { Neo4jModule, Neo4jService } from '../../../../core/neo4j';
import { EvidenceNeo4jInitializer } from '../../projections/evidence-neo4j.projection';

const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

/**
 * Evidence Neo4j Initialization Integration Tests
 *
 * Tests the Neo4j constraint and index creation for Evidence module.
 *
 * Prerequisites:
 * - Docker services running: `docker-compose -f docker-compose.test.yml up -d`
 * - Neo4j available at bolt://localhost:7687
 *
 * Run: `npm run test:integration -- --testPathPattern=evidence-neo4j-init.integration.spec`
 */
describeIntegration('EvidenceNeo4jInitializer Integration', () => {
  let module: TestingModule;
  let neo4jService: Neo4jService;
  let initializer: EvidenceNeo4jInitializer;
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
        providers: [EvidenceNeo4jInitializer],
      }).compile();

      await module.init();
      neo4jService = module.get<Neo4jService>(Neo4jService);
      initializer = module.get<EvidenceNeo4jInitializer>(EvidenceNeo4jInitializer);
    } catch (error) {
      console.warn(
        'Failed to initialize Neo4j integration test module:',
        error instanceof Error ? error.message : String(error)
      );
      moduleInitializationFailed = true;
    }
  });

  beforeEach((): void => {
    if (moduleInitializationFailed) {
      throw new Error(
        'Neo4j integration test module failed to initialize. Ensure Neo4j is running.'
      );
    }
  });

  afterAll(async () => {
    if (!moduleInitializationFailed) {
      await module.close();
    }
  });

  async function constraintExists(name: string): Promise<boolean> {
    const session = neo4jService.getSession();
    try {
      const result = await session.run(
        'SHOW CONSTRAINTS YIELD name WHERE name = $name RETURN name',
        { name }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  async function indexExists(name: string): Promise<boolean> {
    const session = neo4jService.getSession();
    try {
      const result = await session.run(
        'SHOW INDEXES YIELD name WHERE name = $name RETURN name',
        { name }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  describe('constraint and index creation', () => {
    it('should create all expected constraints and indexes', async () => {
      await initializer.initialize();

      expect(await constraintExists('evidence_id_unique')).toBe(true);
      expect(await indexExists('evidence_type_index')).toBe(true);
      expect(await indexExists('evidence_createdAt_index')).toBe(true);
      expect(await indexExists('evidence_type_createdAt_index')).toBe(true);
    });
  });

  describe('idempotency', () => {
    it('should be safe to run initialize() multiple times', async () => {
      await expect(initializer.initialize()).resolves.not.toThrow();
      await expect(initializer.initialize()).resolves.not.toThrow();

      expect(await constraintExists('evidence_id_unique')).toBe(true);
      expect(await indexExists('evidence_type_index')).toBe(true);
      expect(await indexExists('evidence_createdAt_index')).toBe(true);
      expect(await indexExists('evidence_type_createdAt_index')).toBe(true);
    });
  });

  describe('connection failure handling', () => {
    it('should throw error when Neo4j is unavailable', async () => {
      const badModule = await Test.createTestingModule({
        imports: [
          Neo4jModule.forRoot({
            uri: 'bolt://invalid-host:7687',
            database: 'neo4j',
          }),
        ],
        providers: [EvidenceNeo4jInitializer],
      }).compile();

      const badInitializer = badModule.get<EvidenceNeo4jInitializer>(EvidenceNeo4jInitializer);

      await expect(badInitializer.initialize()).rejects.toThrow();

      await badModule.close();
    });
  });
});
