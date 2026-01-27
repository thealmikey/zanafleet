import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvidenceEntity } from './entities/evidence.entity';
import { CreateEvidenceCommandHandler } from './handlers/create-evidence.handler';

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
 * 4. Idempotency via commandId (unique constraint)
 * 5. Immutable records (create only, no updates)
 *
 * Evidence records represent immutable facts:
 * - Customer feedback
 * - SACCO visits
 * - Ops issues
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
    TypeOrmModule.forFeature([EvidenceEntity]),
  ],
  providers: [
    CreateEvidenceCommandHandler,
  ],
  exports: [
    CreateEvidenceCommandHandler,
  ],
})
export class EvidenceModule {}
