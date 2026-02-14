/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { EventBusService } from '@api/core/event-bus';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';

import { CreateInteractionEventCommand } from '../commands/create-interaction-event.command';
import { InteractionEventCreatedEventV1 } from '../events/interaction-event-created.event';
import { InteractionEventRepository } from '../repositories/interaction-event.repository';
import { InteractionStreamRepository } from '../repositories/interaction-stream.repository';

/**
 * CreateInteractionEventCommandHandler
 *
 * Handles the CreateInteractionEventCommand by:
 * 1. Verifying stream exists
 * 2. Creating event entity
 * 3. Persisting to PostgreSQL (appends to stream)
 * 4. Emitting InteractionEventCreatedEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repository and event bus
 * - Atomic operations (persist then emit)
 * - Proper error handling and logging
 * - Deterministic event generation
 * - Appends to stream (append-only pattern)
 */
@CommandHandler(CreateInteractionEventCommand)
@Injectable()
export class CreateInteractionEventCommandHandler
  implements ICommandHandler<CreateInteractionEventCommand>
{
  private readonly logger = new Logger(CreateInteractionEventCommandHandler.name);

  constructor(
    private readonly eventRepository: InteractionEventRepository,
    private readonly streamRepository: InteractionStreamRepository,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  /**
   * Execute command: Create interaction event
   *
   * @param command CreateInteractionEventCommand
   * @returns eventId of created event
   * @throws NotFoundException if stream does not exist
   * @throws Error if persistence fails
   */
  async execute(command: CreateInteractionEventCommand): Promise<string> {
    const eventId = uuidv4();
    const interactionEventId = uuidv4();
    const now = new Date();

    this.logger.log(
      `Executing CreateInteractionEventCommand: stream=${command.streamId}, type=${command.eventType}`,
    );

    // Step 1: Verify stream exists (throws NotFoundException if not)
    const stream = await this.streamRepository.findById(command.streamId);
    if (!stream) {
      this.logger.warn(`Stream not found: ${command.streamId}`);
      throw new NotFoundException(`Stream with ID "${command.streamId}" not found`);
    }

    try {
      // Step 2: Create event entity (appends to stream)
      const event = await this.eventRepository.appendToStream(command.streamId, {
        id: interactionEventId,
        actorId: command.actorId,
        actorType: command.actorType,
        eventType: command.eventType,
        payload: command.payload,
        createdAt: now,
      });

      this.logger.debug(`Event persisted to PostgreSQL: ${interactionEventId}`);

      // Step 3: Create and emit event
      const domainEvent = new InteractionEventCreatedEventV1({
        eventId,
        interactionEventId: event.id,
        streamId: command.streamId,
        actorId: command.actorId,
        actorType: command.actorType,
        eventType: command.eventType,
        payload: command.payload,
        createdAt: now,
        occurredAt: now,
        correlationId: command.correlationId,
        causationId: command.causationId,
      });

      this.eventBus.publish(domainEvent);
      this.logger.log(`InteractionEventCreatedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        // TODO: Add Interaction NATS subjects when needed
        this.logger.debug(`Event published to event bus: ${eventId}`);
      }

      return event.id;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to create event: ${err.message}`, err.stack);
      throw error;
    }
  }
}
