import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActorEntity } from '../actor/entities/actor.entity';
import { CreateOrganizationCommandHandler } from './handlers/create-organization.handler';
import { UpdateOrganizationCommandHandler } from './handlers/update-organization.handler';
import { OrganizationNeo4jProjection, OrganizationNeo4jInitializer } from './projections/organization-neo4j.projection';
import { OrganizationEntity } from './entities/organization.entity';

/**
 * Organization Module
 * 
 * Complete module for managing organizations in ZanaFleet.
 * Implements event-driven architecture with CQRS pattern.
 * 
 * Features:
 * 1. CreateOrganizationCommand with Zod validation
 * 2. OrganizationCreatedEvent-V1 (append-only, deterministic)
 * 3. PostgreSQL persistence via TypeORM
 * 4. Neo4j graph projections
 * 5. Comprehensive unit and integration tests
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
    TypeOrmModule.forFeature([OrganizationEntity, ActorEntity]),
    // Neo4j module should be imported at root level
    // Uncomment when Neo4j module is configured:
    // Neo4jModule.forRoot({...}),
  ],
  providers: [
    // Command Handlers
    CreateOrganizationCommandHandler,
    UpdateOrganizationCommandHandler,

    // Event Handlers / Projections
    OrganizationNeo4jProjection,
    OrganizationNeo4jInitializer,
  ],
  exports: [
    // Export for use in other modules
    CreateOrganizationCommandHandler,
    UpdateOrganizationCommandHandler,
  ],
})
export class OrganizationModule implements OnModuleInit {
  constructor(private readonly neo4jInitializer: OrganizationNeo4jInitializer) {}

  /**
   * Initialize module
   * Sets up Neo4j constraints and indexes
   */
  async onModuleInit(): Promise<void> {
    // Uncomment when Neo4j is fully configured:
    // await this.neo4jInitializer.initialize();
  }
}
