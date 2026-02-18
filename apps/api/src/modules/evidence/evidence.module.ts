import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvidenceEntity } from './entities/evidence.entity';
import { CreateEvidenceCommandHandler } from './handlers/create-evidence.handler';
import {
  EvidenceNeo4jProjection,
  EvidenceNeo4jInitializer,
} from './projections/evidence-neo4j.projection';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] EvidenceModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([EvidenceEntity])];
}

/**
 * Evidence Module
 *
 * Complete module for managing evidence records in ZanaFleet.
 * Implements event-driven architecture with CQRS pattern.
 *
 * Features:
 * 1. CreateEvidenceCommand with Zod validation
 * 2. EvidenceCreatedEvent-V1 (append-only, deterministic)
 * 3. PostgreSQL persistence via TypeORM
 * 4. Neo4j graph projections with RECORDED and ABOUT relationships
 * 5. Idempotency via commandId (unique constraint)
 * 6. Immutable records (create only, no updates)
 *
 * Graph Structure:
 * (:Actor)-[:RECORDED]->(:Evidence)-[:ABOUT]->(:Workspace)
 *
 * Evidence records represent immutable facts:
 * - Customer feedback
 * - SACCO visits
 * - Ops issues
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
  providers: [CreateEvidenceCommandHandler, EvidenceNeo4jProjection, EvidenceNeo4jInitializer],
  exports: [CreateEvidenceCommandHandler],
})
export class EvidenceModule implements OnModuleInit {
  private readonly logger = new Logger(EvidenceModule.name);

  constructor(private readonly evidenceNeo4jInitializer: EvidenceNeo4jInitializer) {}

  /**
   * Initialize module
   * Sets up Neo4j constraints and indexes for Evidence nodes
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.evidenceNeo4jInitializer.initialize();
    } catch (error) {
      this.logger.error('Failed to initialize Neo4j constraints', error);
      if (process.env.NEO4J_STRICT_MODE === 'true') {
        throw error;
      }
    }
  }
}
