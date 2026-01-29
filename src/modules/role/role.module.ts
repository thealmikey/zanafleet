import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoleEntity } from './entities/role.entity';
import { CreateRoleCommandHandler } from './handlers/create-role.handler';
import { RoleNeo4jProjection, RoleNeo4jInitializer } from './projections/role-neo4j.projection';

/**
 * Role Module
 *
 * Complete module for managing roles in ZanaFleet.
 * Implements event-driven architecture with CQRS pattern.
 *
 * Features:
 * 1. CreateRoleCommand with Zod validation
 * 2. RoleCreatedEvent-V1 (append-only, deterministic)
 * 3. PostgreSQL persistence via TypeORM
 * 4. Neo4j graph projections (stub)
 * 5. Duplicate (name, scope) prevention
 * 6. Comprehensive unit and integration tests
 *
 * Dependencies:
 * - @nestjs/cqrs: Command/Event handling
 * - @nestjs/typeorm: PostgreSQL ORM
 * - zod: Input validation
 * - uuid: ID generation
 */
@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([RoleEntity]),
  ],
  providers: [
    // Command Handlers
    CreateRoleCommandHandler,

    // Event Handlers / Projections
    RoleNeo4jProjection,
    RoleNeo4jInitializer,
  ],
  exports: [
    CreateRoleCommandHandler,
  ],
})
export class RoleModule implements OnModuleInit {
  constructor(private readonly neo4jInitializer: RoleNeo4jInitializer) {}

  /**
   * Initialize module
   * Sets up Neo4j constraints and indexes when implemented
   */
  async onModuleInit(): Promise<void> {
    // TODO: Uncomment when Neo4j projection is fully implemented:
    // await this.neo4jInitializer.initialize();
  }
}
