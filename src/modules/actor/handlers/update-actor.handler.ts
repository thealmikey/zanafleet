import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';
import { UpdateActorCommand } from '../commands/update-actor.command';
import { ActorEntity } from '../entities/actor.entity';
import { ActorUpdatedEventV1, ActorUpdatedEventV1Changes } from '../events/actor-updated.event';

/**
 * UpdateActorCommandHandler
 *
 * Handles UpdateActorCommand by updating the ActorEntity in PostgreSQL
 * and emitting ActorUpdatedEventV1 to both internal and external event buses.
 */
@CommandHandler(UpdateActorCommand)
@Injectable()
export class UpdateActorCommandHandler implements ICommandHandler<UpdateActorCommand> {
  private readonly logger = new Logger(UpdateActorCommandHandler.name);

  constructor(
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Execute actor update logic
   */
  async execute(command: UpdateActorCommand): Promise<void> {
    const { actorId, ...updates } = command;
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(`Executing UpdateActorCommand for actor: ${actorId}`);

    // Step 1: Find existing actor
    const actor = await this.actorRepository.findOne({
      where: { id: actorId },
    });

    if (!actor) {
      this.logger.error(`Actor not found: ${actorId}`);
      throw new NotFoundException(`Actor with ID ${actorId} not found`);
    }

    // Step 2: Track changes for the event and update entity
    const changes: ActorUpdatedEventV1Changes = {};
    if (updates.roles !== undefined) {
      changes.roles = updates.roles;
      actor.roles = updates.roles;
    }
    if (updates.linkedWallets !== undefined) {
      changes.linkedWallets = updates.linkedWallets;
      actor.linkedWallets = updates.linkedWallets;
    }

    // If no actual fields were provided for update, skip
    if (Object.keys(changes).length === 0) {
      this.logger.debug(`No updates requested for actor: ${actorId}`);
      return;
    }

    // Step 3: Persist changes to PostgreSQL
    await this.actorRepository.save(actor);
    this.logger.debug(`Actor updated in PostgreSQL: ${actorId}`);

    // Step 4: Create update event
    const event = new ActorUpdatedEventV1({
      eventId,
      actorId,
      changes,
      updatedAt: now,
      occurredAt: now,
    });

    // Step 5: Emit event to internal CQRS event bus (for local projections)
    this.eventBus.publish(event);
    this.logger.log(`ActorUpdatedEvent-V1 emitted to internal event bus: ${eventId}`);

    // Step 6: Publish to NATS external event bus (for other modules)
    if (this.eventBusService) {
      try {
        await this.eventBusService.publish(NatsSubjects.Actor.UPDATED_V1, event);
        this.logger.log(`ActorUpdatedEvent-V1 published to NATS: ${NatsSubjects.Actor.UPDATED_V1}`);
      } catch (publishError: unknown) {
        const err = publishError instanceof Error ? publishError : new Error(String(publishError));
        this.logger.warn(`NATS publish failed for actor ${actorId}: ${err.message}`);
      }
    }
  }
}
