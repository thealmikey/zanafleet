import { WorkspaceEntity } from '@api/modules/workspace/entities/workspace.entity';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';

import { ActorController } from './controllers/actor.controller';
import { ActorEntity } from './entities/actor.entity';
import { CreateActorCommandHandler } from './handlers/create-actor.handler';
import { UpdateActorCommandHandler } from './handlers/update-actor.handler';
import { ActorNeo4jProjection, ActorNeo4jInitializer } from './projections/actor-neo4j.projection';
import { TestAccountSeederService } from './services/test-account-seeder.service';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] ActorModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [
    TypeOrmModule.forFeature([ActorEntity]),
    TypeOrmModule.forFeature([WorkspaceEntity]),
  ];
}

/**
 * Provide fallback mock repository for sandbox mode
 * This satisfies @InjectRepository() which uses getRepositoryToken()
 */
function getSandboxFallbackProviders() {
  if (!isSandBoxMode) {
    return [];
  }
  
  console.log('[DEBUG] ActorModule: Using fallback mock repositories in sandbox mode');
  
  // Create mock repositories
  const createMockRepository = (): Record<string, unknown> => ({
    save: async (entity: unknown): Promise<unknown> => entity,
    find: async (): Promise<unknown[]> => [],
    findOne: async (): Promise<unknown> => null,
    create: (data: unknown): unknown => data,
    merge: (entity: unknown, ...updates: unknown[]): unknown => ({ ...entity as object, ...updates as object }),
    delete: async (): Promise<{ affected: number }> => ({ affected: 1 }),
    createQueryBuilder: () => null,
  });
  
  return [
    {
      provide: getRepositoryToken(ActorEntity),
      useValue: createMockRepository(),
    },
    {
      provide: getRepositoryToken(WorkspaceEntity),
      useValue: createMockRepository(),
    },
  ];
}

/**
 * Actor Module
 *
 * Complete module for managing actors in ZanaFleet.
 * Implements event-driven architecture with CQRS pattern.
 *
 * Features:
 * 1. CreateActorCommand with Zod validation
 * 2. ActorOnboardedEventV1 (append-only, deterministic)
 * 3. PostgreSQL persistence via TypeORM
 * 4. Neo4j graph projections with MEMBER_OF relationship to Workspace
 * 5. Cross-module validation (workspace existence, role validation)
 *
 * Dependencies:
 * - @nestjs/cqrs: Command/Event handling
 * - @nestjs/typeorm: PostgreSQL ORM
 * - neo4j-driver: Graph database (via core/neo4j module)
 * - zod: Input validation
 * - uuid: ID generation
 */
@Module({
  imports: [
    CqrsModule,
    ...getTypeOrmImports(),
  ],
  controllers: [ActorController],
  providers: [
    // Command Handlers
    CreateActorCommandHandler,
    UpdateActorCommandHandler,

    // Event Handlers / Projections
    ActorNeo4jProjection,
    ActorNeo4jInitializer,

    // Services
    TestAccountSeederService,

    // Fallback providers for sandbox mode
    ...getSandboxFallbackProviders(),
  ],
  exports: [
    // Export for use in other modules
    CreateActorCommandHandler,
    UpdateActorCommandHandler,
  ],
})
export class ActorModule implements OnModuleInit {
  private readonly logger = new Logger(ActorModule.name);

  constructor(
    private readonly neo4jInitializer: ActorNeo4jInitializer,
    private readonly testAccountSeeder: TestAccountSeederService,
  ) {}

  /**
   * Initialize module
   * Sets up Neo4j constraints and indexes
   * Seeds test accounts in dev/test mode
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.neo4jInitializer.initialize();
    } catch (error) {
      this.logger.error('Failed to initialize Neo4j constraints', error);
      if (process.env.NEO4J_STRICT_MODE?.toLowerCase() === 'true') {
        throw error;
      }
    }

    await this.testAccountSeeder.onModuleInit();
  }
}
