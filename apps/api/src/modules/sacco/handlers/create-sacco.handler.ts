/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { EventBusService } from '@api/core/event-bus';
import { ConflictException, Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { CreateSaccoCommand } from '../commands/create-sacco.command';
import { SaccoEntity } from '../entities/sacco.entity';
import { SaccoCreatedEventV1 } from '../events/sacco-created.event';

/**
 * CreateSaccoCommandHandler
 *
 * Handles the CreateSaccoCommand by:
 * 1. Checking for duplicate sacco name
 * 2. Persisting to PostgreSQL
 * 3. Emitting SaccoCreatedEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repository and event bus
 * - Atomic operations (persist then emit)
 * - Proper error handling and logging
 * - Deterministic event generation
 */
@CommandHandler(CreateSaccoCommand)
@Injectable()
export class CreateSaccoCommandHandler implements ICommandHandler<CreateSaccoCommand> {
  private readonly logger = new Logger(CreateSaccoCommandHandler.name);

  constructor(
    @InjectRepository(SaccoEntity)
    private readonly saccoRepository: Repository<SaccoEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Execute command: Create sacco
   *
   * @param command CreateSaccoCommand
   * @returns saccoId of created sacco
   * @throws ConflictException if sacco with same name exists
   * @throws Error if persistence fails
   */
  async execute(command: CreateSaccoCommand): Promise<string> {
    const saccoId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(`Executing CreateSaccoCommand for sacco: ${command.name}`);

    // Step 1: Check for duplicate name
    const existingSacco = await this.saccoRepository.findOne({
      where: { name: command.name },
    });

    if (existingSacco) {
      this.logger.warn(`Duplicate sacco detected: ${command.name}`);
      throw new ConflictException(`Sacco with name "${command.name}" already exists`);
    }

    try {
      // Step 2: Create sacco entity
      const entity = SaccoEntity.fromDomain({
        saccoId,
        name: command.name,
        location: command.location,
        contactPhone: command.contactPhone,
        createdAt: now,
      });

      // Step 3: Persist to PostgreSQL
      await this.saccoRepository.save(entity);
      this.logger.debug(`Sacco persisted to PostgreSQL: ${saccoId}`);

      // Step 4: Create and emit event
      const event = new SaccoCreatedEventV1({
        eventId,
        saccoId,
        name: command.name,
        location: command.location,
        contactPhone: command.contactPhone,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`SaccoCreatedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish('sacco.created.v1', event)
          .catch((err: Error) => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return saccoId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to create sacco: ${err.message}`, err.stack);
      throw error;
    }
  }
}
