import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActorEntity } from '../actor/entities/actor.entity';
import { OrganizationEntity } from '../organization/entities/organization.entity';

import { WorkspaceController } from './controllers/workspace.controller';
import { MembershipEntity } from './entities/membership.entity';
import { WorkspaceEntity } from './entities/workspace.entity';
import { AddActorToWorkspaceCommandHandler } from './handlers/add-actor-to-workspace.handler';
import { CreateWorkspaceCommandHandler } from './handlers/create-workspace.handler';
import { RemoveActorFromWorkspaceCommandHandler } from './handlers/remove-actor-from-workspace.handler';
import { UpdateWorkspaceCommandHandler } from './handlers/update-workspace.handler';
import {
  MembershipNeo4jProjection,
  MembershipNeo4jInitializer,
} from './projections/membership-neo4j.projection';
import {
  WorkspaceNeo4jProjection,
  WorkspaceNeo4jInitializer,
} from './projections/workspace-neo4j.projection';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] WorkspaceModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([WorkspaceEntity, MembershipEntity, OrganizationEntity, ActorEntity])];
}

/**
 * Workspace Module
 *
 * Complete module for managing workspaces in ZanaFleet.
 * Implements event-driven architecture with CQRS pattern.
 *
 * Features:
 * 1. CreateWorkspaceCommand with Zod validation
 * 2. AddActorToWorkspaceCommand with membership management
 * 3. WorkspaceCreatedEvent-V1 (append-only, deterministic)
 * 4. ActorAddedToWorkspaceEvent-V1 for membership events
 * 5. PostgreSQL persistence via TypeORM
 * 6. Neo4j graph projections with PART_OF relationship to Organization
 * 7. Foreign key validation against Organization and Actor
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
  controllers: [WorkspaceController],
  providers: [
    // Command Handlers
    CreateWorkspaceCommandHandler,
    UpdateWorkspaceCommandHandler,
    AddActorToWorkspaceCommandHandler,
    RemoveActorFromWorkspaceCommandHandler,

    // Event Handlers / Projections
    WorkspaceNeo4jProjection,
    WorkspaceNeo4jInitializer,
    MembershipNeo4jProjection,
    MembershipNeo4jInitializer,
  ],
  exports: [
    // Export for use in other modules
    CreateWorkspaceCommandHandler,
    UpdateWorkspaceCommandHandler,
    AddActorToWorkspaceCommandHandler,
    RemoveActorFromWorkspaceCommandHandler,
  ],
})
export class WorkspaceModule implements OnModuleInit {
  private readonly logger = new Logger(WorkspaceModule.name);

  constructor(
    private readonly workspaceNeo4jQuery: WorkspaceNeo4jQuery,
    private readonly membershipNeo4jQuery: MembershipNeo4jQuery
  ) {}

  /**
   * Initialize module
   * Sets up Neo4j constraints and indexes for Workspace nodes and MEMBER_OF relationships
   */
  async onModuleInit(): Promise<void> {
    try {
      await Promise.all([
        this.workspaceNeo4jQuery.initialize(),
        this.membershipNeo4jQuery.initialize(),
      ]);
    } catch (error) {
      this.logger.error('Failed to initialize Neo4j constraints', error);
      if (process.env.NEO4J_STRICT_MODE?.toLowerCase() === 'true') {
        throw error;
      }
    }
  }
}
