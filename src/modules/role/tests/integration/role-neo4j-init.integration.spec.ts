import { Test, TestingModule } from '@nestjs/testing';

import { Neo4jModule } from '../../../../core/neo4j';
import { RoleNeo4jInitializer } from '../../projections/role-neo4j.projection';

const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

/**
 * Role Neo4j Initialization Integration Tests
 *
 * Tests the Neo4j initialization for Role module.
 *
 * NOTE: RoleNeo4jInitializer is currently a stub implementation that only logs.
 * Actual constraint/index verification tests will be added when the stub is implemented.
 *
 * Prerequisites:
 * - Docker services running: `docker-compose -f docker-compose.test.yml up -d`
 * - Neo4j available at bolt://localhost:7687
 *
 * Run: `npm run test:integration -- --testPathPattern=role-neo4j-init.integration.spec`
 */
describeIntegration('RoleNeo4jInitializer Integration', () => {
  let module: TestingModule;
  let initializer: RoleNeo4jInitializer;
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
        providers: [RoleNeo4jInitializer],
      }).compile();

      await module.init();
      initializer = module.get<RoleNeo4jInitializer>(RoleNeo4jInitializer);
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

  describe('stub initialization', () => {
    // NOTE: RoleNeo4jInitializer is a stub that only logs.
    // When implemented, add tests for:
    // - Constraint: role_id_unique
    // - Index: role_scope_index
    // - Index: role_name_index
    // - Index: role_createdAt_index

    it('should execute initialize() without error', async () => {
      await expect(initializer.initialize()).resolves.not.toThrow();
    });
  });

  describe('idempotency', () => {
    it('should be safe to run initialize() multiple times', async () => {
      await expect(initializer.initialize()).resolves.not.toThrow();
      await expect(initializer.initialize()).resolves.not.toThrow();
    });
  });
});
