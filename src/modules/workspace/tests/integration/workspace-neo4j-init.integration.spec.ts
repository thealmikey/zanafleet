import { Test, TestingModule } from '@nestjs/testing';

import { Neo4jModule, Neo4jService } from '../../../../core/neo4j';
import { MembershipNeo4jInitializer } from '../../projections/membership-neo4j.projection';
import { WorkspaceNeo4jInitializer } from '../../projections/workspace-neo4j.projection';

const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

/**
 * Workspace Neo4j Initialization Integration Tests
 *
 * Tests the Neo4j constraint and index creation for Workspace and Membership.
 *
 * Prerequisites:
 * - Docker services running: `docker-compose -f docker-compose.test.yml up -d`
 * - Neo4j available at bolt://localhost:7687
 *
 * Run: `npm run test:integration -- --testPathPattern=workspace-neo4j-init.integration.spec`
 */
describeIntegration('Workspace Neo4j Initializers Integration', () => {
  let module: TestingModule;
  let neo4jService: Neo4jService;
  let workspaceInitializer: WorkspaceNeo4jInitializer;
  let membershipInitializer: MembershipNeo4jInitializer;
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
        providers: [WorkspaceNeo4jInitializer, MembershipNeo4jInitializer],
      }).compile();

      await module.init();
      neo4jService = module.get<Neo4jService>(Neo4jService);
      workspaceInitializer = module.get<WorkspaceNeo4jInitializer>(WorkspaceNeo4jInitializer);
      membershipInitializer = module.get<MembershipNeo4jInitializer>(MembershipNeo4jInitializer);
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
      const result = await session.run('SHOW INDEXES YIELD name WHERE name = $name RETURN name', {
        name,
      });
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  describe('WorkspaceNeo4jInitializer', () => {
    describe('constraint and index creation', () => {
      it('should create all expected constraints and indexes', async () => {
        await workspaceInitializer.initialize();

        expect(await constraintExists('workspace_id_unique')).toBe(true);
        expect(await indexExists('workspace_orgId_index')).toBe(true);
        expect(await indexExists('workspace_createdAt_index')).toBe(true);
      });
    });

    describe('idempotency', () => {
      it('should be safe to run initialize() multiple times', async () => {
        await expect(workspaceInitializer.initialize()).resolves.not.toThrow();
        await expect(workspaceInitializer.initialize()).resolves.not.toThrow();

        expect(await constraintExists('workspace_id_unique')).toBe(true);
        expect(await indexExists('workspace_orgId_index')).toBe(true);
        expect(await indexExists('workspace_createdAt_index')).toBe(true);
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
          providers: [WorkspaceNeo4jInitializer],
        }).compile();

        const badInitializer = badModule.get<WorkspaceNeo4jInitializer>(WorkspaceNeo4jInitializer);

        await expect(badInitializer.initialize()).rejects.toThrow();

        await badModule.close();
      });
    });
  });

  describe('MembershipNeo4jInitializer', () => {
    describe('relationship index creation', () => {
      it('should create all expected relationship indexes', async () => {
        await membershipInitializer.initialize();

        expect(await indexExists('member_of_role_index')).toBe(true);
        expect(await indexExists('member_of_since_index')).toBe(true);
      });
    });

    describe('idempotency', () => {
      it('should be safe to run initialize() multiple times', async () => {
        await expect(membershipInitializer.initialize()).resolves.not.toThrow();
        await expect(membershipInitializer.initialize()).resolves.not.toThrow();

        expect(await indexExists('member_of_role_index')).toBe(true);
        expect(await indexExists('member_of_since_index')).toBe(true);
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
          providers: [MembershipNeo4jInitializer],
        }).compile();

        const badInitializer = badModule.get<MembershipNeo4jInitializer>(
          MembershipNeo4jInitializer
        );

        await expect(badInitializer.initialize()).rejects.toThrow();

        await badModule.close();
      });
    });
  });
});
