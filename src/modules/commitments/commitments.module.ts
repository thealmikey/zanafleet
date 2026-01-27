import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActorEntity } from '../actor/entities/actor.entity';
import { WorkspaceEntity } from '../workspace/entities/workspace.entity';

import { CommitmentEntity } from './entities/commitment.entity';
import { CreateCommitmentCommandHandler } from './handlers/create-commitment.handler';

/**
 * Commitments Module
 *
 * Complete module for managing commitments in ZanaFleet.
 * Implements event-driven architecture with CQRS pattern.
 *
 * Features:
 * 1. CreateCommitmentCommand with Zod validation
 * 2. CommitmentCreatedEvent-V1 (append-only, deterministic)
 * 3. PostgreSQL persistence via TypeORM
 * 4. Foreign key validation against Actor and Workspace
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
    TypeOrmModule.forFeature([CommitmentEntity, ActorEntity, WorkspaceEntity]),
  ],
  providers: [
    CreateCommitmentCommandHandler,
  ],
  exports: [
    CreateCommitmentCommandHandler,
  ],
})
export class CommitmentsModule {}
