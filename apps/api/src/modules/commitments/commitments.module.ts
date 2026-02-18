import { ActorEntity } from '@api/modules/actor/entities/actor.entity';
import { WorkspaceEntity } from '@api/modules/workspace/entities/workspace.entity';
import { Logger, Module, OnModuleInit, Type } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommitmentEntity } from './entities/commitment.entity';
import { CreateCommitmentCommandHandler } from './handlers/create-commitment.handler';
import { UpdateCommitmentStatusCommandHandler } from './handlers/update-commitment-status.handler';
import {
  CommitmentNeo4jProjection,
  CommitmentNeo4jInitializer,
} from './projections/commitment-neo4j.projection';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] CommitmentsModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([CommitmentEntity, ActorEntity, WorkspaceEntity])];
}

/**
 * Get exports - conditionally based on mode
 */
function getExports(): Array<Type<unknown> | string> {
  return [CreateCommitmentCommandHandler, UpdateCommitmentStatusCommandHandler];
}

/**
 * Commitments Module
 *
 * Complete module for managing commitments in ZanaFleet.
 * Implements event-driven architecture with CQRS pattern.
 *
 * Features:
 * 1. CreateCommitmentCommand with Zod validation
 * 2. UpdateCommitmentStatusCommand with status transition validation
 * 3. CommitmentCreatedEvent-V1 (append-only, deterministic)
 * 4. CommitmentStatusChangedEvent-V1 for status transitions
 * 5. PostgreSQL persistence via TypeORM
 * 6. Neo4j graph projections with COMMITTED and IN_WORKSPACE relationships
 * 7. Foreign key validation against Actor and Workspace
 *
 * Dependencies:
 * - @nestjs/cqrs: Command/Event handling
 * - @nestjs/typeorm: PostgreSQL ORM
 * - neo4j-driver: Graph database (via core/neo4j module)
 * - zod: Input validation
 * - uuid: ID generation
 */
@Module({
  imports: [CqrsModule, ...getTypeOrmImports()],
  providers: [
    // Command Handlers
    CreateCommitmentCommandHandler,
    UpdateCommitmentStatusCommandHandler,

    // Event Handlers / Projections
    CommitmentNeo4jProjection,
    CommitmentNeo4jInitializer,
  ],
  exports: getExports(),
})
export class CommitmentsModule implements OnModuleInit {
  private readonly logger = new Logger(CommitmentsModule.name);

  constructor(private readonly commitmentNeo4jInitializer: CommitmentNeo4jInitializer) {}

  /**
   * Initialize module
   * Sets up Neo4j constraints and indexes for Commitment nodes
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.commitmentNeo4jInitializer.initialize();
    } catch (error) {
      this.logger.error('Failed to initialize Neo4j constraints', error);
      if (process.env.NEO4J_STRICT_MODE === 'true') {
        throw error;
      }
    }
  }
}
