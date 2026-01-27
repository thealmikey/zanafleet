import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../core/event-bus';
import { ActorEntity } from '../../actor/entities/actor.entity';
import { WorkspaceEntity } from '../../workspace/entities/workspace.entity';

import { CreateCommitmentCommand } from '../commands/create-commitment.command';
import { CommitmentEntity } from '../entities/commitment.entity';
import { CommitmentCreatedEventV1 } from '../events/commitment-created.event';

/**
 * CreateCommitmentCommandHandler
 *
 * Handles the CreateCommitmentCommand by:
 * 1. Validating actor exists
 * 2. Validating workspace exists
 * 3. Persisting commitment to PostgreSQL
 * 4. Emitting CommitmentCreatedEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repositories and event bus
 * - Validates foreign key references before persistence
 * - Atomic operations (validate, persist, then emit)
 * - Proper error handling and logging
 * - Deterministic event generation
 */
@CommandHandler(CreateCommitmentCommand)
@Injectable()
export class CreateCommitmentCommandHandler
  implements ICommandHandler<CreateCommitmentCommand>
{
  private readonly logger = new Logger(CreateCommitmentCommandHandler.name);

  constructor(
    @InjectRepository(CommitmentEntity)
    private readonly commitmentRepository: Repository<CommitmentEntity>,
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  /**
   * Execute command: Create commitment
   *
   * @param command CreateCommitmentCommand
   * @returns commitmentId of created commitment
   * @throws NotFoundException if actor or workspace does not exist
   * @throws Error if persistence fails
   */
  async execute(command: CreateCommitmentCommand): Promise<string> {
    const commitmentId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(
      `Executing CreateCommitmentCommand for commitment: ${commitmentId}, actor: ${command.actorId}, workspace: ${command.workspaceId}`,
    );

    try {
      // Step 1: Validate actor exists
      const actor = await this.actorRepository.findOne({
        where: { id: command.actorId },
      });

      if (!actor) {
        this.logger.warn(`Actor not found: ${command.actorId}`);
        throw new NotFoundException(
          `Actor with ID '${command.actorId}' does not exist`,
        );
      }

      this.logger.debug(`Actor validated: ${command.actorId}`);

      // Step 2: Validate workspace exists
      const workspace = await this.workspaceRepository.findOne({
        where: { id: command.workspaceId },
      });

      if (!workspace) {
        this.logger.warn(`Workspace not found: ${command.workspaceId}`);
        throw new NotFoundException(
          `Workspace with ID '${command.workspaceId}' does not exist`,
        );
      }

      this.logger.debug(`Workspace validated: ${command.workspaceId}`);

      // Step 3: Create commitment entity
      const entity = CommitmentEntity.fromDomain({
        commitmentId,
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        type: command.type,
        status: command.status,
        description: command.description,
        dueAt: command.dueAt,
        createdAt: now,
      });

      // Step 4: Persist to PostgreSQL
      await this.commitmentRepository.save(entity);
      this.logger.debug(`Commitment persisted to PostgreSQL: ${commitmentId}`);

      // Step 5: Create and emit event
      const event = new CommitmentCreatedEventV1({
        eventId,
        commitmentId,
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        type: command.type,
        status: command.status,
        description: command.description,
        dueAt: command.dueAt,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`CommitmentCreatedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish('commitment.events.created-v1', event)
          .catch((err: Error) =>
            this.logger.warn(`NATS publish failed: ${err.message}`),
          );
      }

      return commitmentId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to create commitment: ${err.message}`, err.stack);
      throw error;
    }
  }
}
