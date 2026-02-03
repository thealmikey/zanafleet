/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { Injectable, Logger, ConflictException, Optional, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { WorkspaceEntity } from '../../workspace/entities/workspace.entity';
import { CreateActorCommand } from '../commands/create-actor.command';
import { ActorEntity } from '../entities/actor.entity';
import { ActorOnboardedEventV1 } from '../events/actor-onboarded.event';

/**
 * CreateActorCommandHandler
 *
 * Handles the CreateActorCommand by:
 * 1. Validating workspace existence (if workspaceId provided)
 * 2. Checking for duplicate email
 * 3. Persisting to PostgreSQL
 * 4. Emitting ActorOnboardedEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repository and event bus
 * - Atomic operations (persist then emit)
 * - Proper error handling and logging
 * - Deterministic event generation
 */
@CommandHandler(CreateActorCommand)
@Injectable()
export class CreateActorCommandHandler implements ICommandHandler<CreateActorCommand> {
  private readonly logger = new Logger(CreateActorCommandHandler.name);

  constructor(
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Execute command: Create actor
   *
   * @param command CreateActorCommand
   * @returns actorId of created actor
   * @throws ConflictException if actor with same email exists
   * @throws NotFoundException if workspace does not exist
   * @throws Error if persistence fails
   */
  async execute(command: CreateActorCommand): Promise<string> {
    const actorId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(`Executing CreateActorCommand for actor: ${command.email} (type: ${command.type})`);

    // Step 1: Validate workspace existence if provided
    if (command.workspaceId) {
      const workspace = await this.workspaceRepository.findOne({
        where: { id: command.workspaceId },
      });

      if (!workspace) {
        this.logger.warn(`Workspace not found: ${command.workspaceId}`);
        throw new NotFoundException(`Workspace with ID "${command.workspaceId}" not found`);
      }
    }

    // Step 2: Check for duplicate email
    const existingActor = await this.actorRepository.findOne({
      where: { email: command.email },
    });

    if (existingActor) {
      this.logger.warn(`Duplicate actor detected: ${command.email}`);
      throw new ConflictException(`Actor with email "${command.email}" already exists`);
    }

    try {
      // Step 3: Create actor entity
      const entity = ActorEntity.fromDomain({
        actorId,
        email: command.email,
        username: command.username,
        type: command.type,
        workspaceId: command.workspaceId,
        createdAt: now,
      });

      // Step 4: Persist to PostgreSQL
      await this.actorRepository.save(entity);
      this.logger.debug(`Actor persisted to PostgreSQL: ${actorId}`);

      // Step 5: Create and emit event
      const event = new ActorOnboardedEventV1({
        eventId,
        actorId,
        email: command.email,
        username: command.username,
        type: command.type,
        workspaceId: command.workspaceId,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`ActorOnboardedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish(NatsSubjects.Actor.ONBOARDED_V1, event)
          .catch((err: Error) => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return actorId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to create actor: ${err.message}`, err.stack);
      throw error;
    }
  }
}
