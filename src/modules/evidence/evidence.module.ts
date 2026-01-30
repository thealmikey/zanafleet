import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvidenceEntity } from './entities/evidence.entity';
import { CreateEvidenceCommandHandler } from './handlers/create-evidence.handler';
import {
  EvidenceNeo4jProjection,
  EvidenceNeo4jInitializer,
} from './projections/evidence-neo4j.projection';

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
  imports: [CqrsModule, TypeOrmModule.forFeature([EvidenceEntity])],
  providers: [CreateEvidenceCommandHandler, EvidenceNeo4jProjection, EvidenceNeo4jInitializer],
  exports: [CreateEvidenceCommandHandler],
})
export class EvidenceModule implements OnModuleInit {
  constructor(private readonly evidenceNeo4jInitializer: EvidenceNeo4jInitializer) {}

  /**
   * Initialize module
   * Sets up Neo4j constraints and indexes for Evidence nodes
   */
  async onModuleInit(): Promise<void> {
    await this.evidenceNeo4jInitializer.initialize();
  }
}
