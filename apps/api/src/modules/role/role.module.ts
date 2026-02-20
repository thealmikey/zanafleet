import { createTypeOrmFallbackProviders } from '@api/core/sandbox';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoleEntity } from './entities/role.entity';
import { CreateRoleCommandHandler } from './handlers/create-role.handler';
import { RoleNeo4jProjection, RoleNeo4jInitializer } from './projections/role-neo4j.projection';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] RoleModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([RoleEntity])];
}

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
  imports: [CqrsModule, ...getTypeOrmImports()],
  providers: [
    // Command Handlers
    CreateRoleCommandHandler,

    // Event Handlers / Projections
    RoleNeo4jProjection,
    RoleNeo4jInitializer,
    ...createTypeOrmFallbackProviders(RoleEntity),
  ],
  exports: [CreateRoleCommandHandler],
})
export class RoleModule implements OnModuleInit {
  private readonly logger = new Logger(RoleModule.name);

  constructor(private readonly neo4jInitializer: RoleNeo4jInitializer) {}

  /**
   * Initialize module
   * Sets up Neo4j constraints and indexes
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.neo4jInitializer.initialize();
    } catch (error) {
      this.logger.error('Failed to initialize Neo4j constraints', error);
      if (process.env.NEO4J_STRICT_MODE === 'true') {
        throw error;
      }
    }
  }
}
