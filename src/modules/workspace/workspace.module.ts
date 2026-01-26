import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateWorkspaceCommandHandler } from './handlers/create-workspace.handler';
import { WorkspaceNeo4jProjection, WorkspaceNeo4jInitializer } from './projections/workspace-neo4j.projection';
import { WorkspaceEntity } from './entities/workspace.entity';
import { OrganizationEntity } from '../organization/entities/organization.entity';

/**
 * Workspace Module
 *
 * Complete module for managing workspaces in ZanaFleet.
 * Implements event-driven architecture with CQRS pattern.
 *
 * Features:
 * 1. CreateWorkspaceCommand with Zod validation
 * 2. WorkspaceCreatedEvent-V1 (append-only, deterministic)
 * 3. PostgreSQL persistence via TypeORM
 * 4. Neo4j graph projections with PART_OF relationship to Organization
 * 5. Foreign key validation against Organization
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
    TypeOrmModule.forFeature([WorkspaceEntity, OrganizationEntity]),
  ],
  providers: [
    // Command Handlers
    CreateWorkspaceCommandHandler,

    // Event Handlers / Projections
    WorkspaceNeo4jProjection,
    WorkspaceNeo4jInitializer,
  ],
  exports: [
    // Export for use in other modules
    CreateWorkspaceCommandHandler,
  ],
})
export class WorkspaceModule implements OnModuleInit {
  constructor(private readonly neo4jInitializer: WorkspaceNeo4jInitializer) {}

  /**
   * Initialize module
   * Sets up Neo4j constraints and indexes
   */
  async onModuleInit(): Promise<void> {
    // Uncomment when Neo4j is fully configured:
    // await this.neo4jInitializer.initialize();
  }
}
