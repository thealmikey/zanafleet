import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkspaceEntity } from '../workspace/entities/workspace.entity';

import { ActorController } from './controllers/actor.controller';
import { ActorEntity } from './entities/actor.entity';
import { CreateActorCommandHandler } from './handlers/create-actor.handler';
import { UpdateActorCommandHandler } from './handlers/update-actor.handler';
import { ActorNeo4jProjection, ActorNeo4jInitializer } from './projections/actor-neo4j.projection';

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
    TypeOrmModule.forFeature([ActorEntity]),
    TypeOrmModule.forFeature([WorkspaceEntity]),
  ],
  controllers: [ActorController],
  providers: [
    // Command Handlers
    CreateActorCommandHandler,
    UpdateActorCommandHandler,

    // Event Handlers / Projections
    ActorNeo4jProjection,
    ActorNeo4jInitializer,
  ],
  exports: [
    // Export for use in other modules
    CreateActorCommandHandler,
    UpdateActorCommandHandler,
  ],
})
export class ActorModule implements OnModuleInit {
  constructor(private readonly neo4jInitializer: ActorNeo4jInitializer) {}

  /**
   * Initialize module
   * Sets up Neo4j constraints and indexes
   */
  async onModuleInit(): Promise<void> {
    // Uncomment when Neo4j is fully configured:
    // await this.neo4jInitializer.initialize();
  }
}
