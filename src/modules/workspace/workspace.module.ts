import { Module, OnModuleInit } from '@nestjs/common';
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
    TypeOrmModule.forFeature([WorkspaceEntity, MembershipEntity, OrganizationEntity, ActorEntity]),
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
  constructor(
    private readonly workspaceNeo4jInitializer: WorkspaceNeo4jInitializer,
    private readonly membershipNeo4jInitializer: MembershipNeo4jInitializer
  ) {}

  /**
   * Initialize module
   * Sets up Neo4j constraints and indexes for Workspace nodes and MEMBER_OF relationships
   */
  async onModuleInit(): Promise<void> {
    // Uncomment when Neo4j is fully configured:
    // await this.workspaceNeo4jInitializer.initialize();
    // await this.membershipNeo4jInitializer.initialize();
  }
}
