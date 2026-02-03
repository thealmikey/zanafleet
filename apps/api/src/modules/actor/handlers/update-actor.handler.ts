/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { Injectable, Logger, ConflictException, Optional, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { WorkspaceEntity } from '../../workspace/entities/workspace.entity';
import { UpdateActorCommand } from '../commands/update-actor.command';
import { ActorEntity } from '../entities/actor.entity';
import { ActorUpdatedEventV1 } from '../events/actor-updated.event';

/**
 * UpdateActorCommandHandler
 *
 * Handles the UpdateActorCommand by:
 * 1. Finding existing actor
 * 2. Validating workspace existence (if workspaceId provided)
 * 3. Checking for duplicate email (if email changed)
 * 4. Updating in PostgreSQL
 * 5. Emitting ActorUpdatedEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repository and event bus
 * - Atomic operations (persist then emit)
 * - Proper error handling and logging
 * - Deterministic event generation
 */
@CommandHandler(UpdateActorCommand)
@Injectable()
export class UpdateActorCommandHandler implements ICommandHandler<UpdateActorCommand> {
  private readonly logger = new Logger(UpdateActorCommandHandler.name);

  constructor(
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Execute command: Update actor
   *
   * @param command UpdateActorCommand
   * @returns actorId of updated actor
   * @throws NotFoundException if actor does not exist
   * @throws ConflictException if new email already exists
   * @throws NotFoundException if workspace does not exist
   * @throws Error if persistence fails
   */
  async execute(command: UpdateActorCommand): Promise<string> {
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(`Executing UpdateActorCommand for actor: ${command.actorId}`);

    // Step 1: Find existing actor
    const existingActor = await this.actorRepository.findOne({
      where: { id: command.actorId },
    });

    if (!existingActor) {
      this.logger.warn(`Actor not found: ${command.actorId}`);
      throw new NotFoundException(`Actor with ID "${command.actorId}" not found`);
    }

    // Step 2: Validate workspace existence if provided
    if (command.workspaceId !== undefined && command.workspaceId !== null) {
      const workspace = await this.workspaceRepository.findOne({
        where: { id: command.workspaceId },
      });

      if (!workspace) {
        this.logger.warn(`Workspace not found: ${command.workspaceId}`);
        throw new NotFoundException(`Workspace with ID "${command.workspaceId}" not found`);
      }
    }

    // Step 3: Check for duplicate email if email is being changed
    if (command.email && command.email !== existingActor.email) {
      const duplicateActor = await this.actorRepository.findOne({
        where: {
          email: command.email,
          id: Not(command.actorId),
        },
      });

      if (duplicateActor) {
        this.logger.warn(`Duplicate email detected: ${command.email}`);
        throw new ConflictException(`Actor with email "${command.email}" already exists`);
      }
    }

    try {
      // Step 4: Update actor entity
      if (command.email !== undefined) {
        existingActor.email = command.email;
      }
      if (command.username !== undefined) {
        existingActor.username = command.username;
      }
      if (command.type !== undefined) {
        existingActor.type = command.type;
      }
      if (command.workspaceId !== undefined) {
        existingActor.workspaceId = command.workspaceId;
      }

      // Step 5: Persist to PostgreSQL
      await this.actorRepository.save(existingActor);
      this.logger.debug(`Actor updated in PostgreSQL: ${command.actorId}`);

      // Step 6: Create and emit event
      const event = new ActorUpdatedEventV1({
        eventId,
        actorId: command.actorId,
        email: command.email,
        username: command.username,
        type: command.type,
        workspaceId: command.workspaceId,
        updatedAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`ActorUpdatedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish(NatsSubjects.Actor.UPDATED_V1, event)
          .catch((err: Error) => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return command.actorId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to update actor: ${err.message}`, err.stack);
      throw error;
    }
  }
}
