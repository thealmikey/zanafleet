/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { EventBusService } from '@api/core/event-bus';
import { Injectable, Logger, ConflictException, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';

import { CreateInteractionStreamCommand } from '../commands/create-interaction-stream.command';
import { InteractionStreamCreatedEventV1 } from '../events/interaction-stream-created.event';
import { InteractionStreamRepository } from '../repositories/interaction-stream.repository';

/**
 * CreateInteractionStreamCommandHandler
 *
 * Handles the CreateInteractionStreamCommand by:
 * 1. Checking for existing stream with same context
 * 2. Creating stream entity
 * 3. Persisting to PostgreSQL
 * 4. Emitting InteractionStreamCreatedEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repository and event bus
 * - Atomic operations (persist then emit)
 * - Proper error handling and logging
 * - Deterministic event generation
 */
@CommandHandler(CreateInteractionStreamCommand)
@Injectable()
export class CreateInteractionStreamCommandHandler
  implements ICommandHandler<CreateInteractionStreamCommand>
{
  private readonly logger = new Logger(CreateInteractionStreamCommandHandler.name);

  constructor(
    private readonly streamRepository: InteractionStreamRepository,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  /**
   * Execute command: Create interaction stream
   *
   * @param command CreateInteractionStreamCommand
   * @returns streamId of created stream
   * @throws ConflictException if stream with same context exists
   * @throws Error if persistence fails
   */
  async execute(command: CreateInteractionStreamCommand): Promise<string> {
    const streamId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(
      `Executing CreateInteractionStreamCommand: ${command.contextType}/${command.contextId}`,
    );

    // Step 1: Check for existing stream with same context
    const existing = await this.streamRepository.findByContext(
      command.contextType,
      command.contextId,
    );

    if (existing) {
      this.logger.warn(
        `Stream already exists for ${command.contextType}/${command.contextId}: ${existing.id}`,
      );
      throw new ConflictException(
        `Interaction stream for ${command.contextType}/${command.contextId} already exists`,
      );
    }

    try {
      // Step 2: Create stream entity
      const stream = await this.streamRepository.create({
        id: streamId,
        contextType: command.contextType,
        contextId: command.contextId,
        participantIds: command.participantIds,
        metadata: command.metadata,
        state: command.state,
      });

      this.logger.debug(`Stream persisted to PostgreSQL: ${streamId}`);

      // Step 3: Create and emit event
      const event = new InteractionStreamCreatedEventV1({
        eventId,
        streamId,
        contextType: command.contextType,
        contextId: command.contextId,
        participantIds: command.participantIds,
        metadata: command.metadata,
        state: command.state,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`InteractionStreamCreatedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        // TODO: Add Interaction NATS subjects when needed
        this.logger.debug(`Skipping NATS publish for stream created event: ${eventId}`);
      }

      return streamId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to create stream: ${err.message}`, err.stack);
      throw error;
    }
  }
}
