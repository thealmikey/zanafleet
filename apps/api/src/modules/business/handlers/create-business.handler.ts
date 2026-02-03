/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { ConflictException, Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '@api/core/event-bus';
import { CreateBusinessCommand } from '../commands/create-business.command';
import { BusinessEntity } from '../entities/business.entity';
import { BusinessOnboardedEventV1 } from '../events/business-onboarded.event';

/**
 * CreateBusinessCommandHandler
 *
 * Handles the CreateBusinessCommand by:
 * 1. Checking for duplicate phone (primary identity)
 * 2. Persisting to PostgreSQL
 * 3. Emitting BusinessOnboardedEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repository and event bus
 * - Atomic operations (persist then emit)
 * - Proper error handling and logging
 * - Deterministic event generation
 */
@CommandHandler(CreateBusinessCommand)
@Injectable()
export class CreateBusinessCommandHandler implements ICommandHandler<CreateBusinessCommand> {
  private readonly logger = new Logger(CreateBusinessCommandHandler.name);

  constructor(
    @InjectRepository(BusinessEntity)
    private readonly businessRepository: Repository<BusinessEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Execute command: Create business
   *
   * @param command CreateBusinessCommand
   * @returns businessId of created business
   * @throws ConflictException if business with same phone exists
   * @throws Error if persistence fails
   */
  async execute(command: CreateBusinessCommand): Promise<string> {
    const businessId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(`Executing CreateBusinessCommand for business: ${command.phone}`);

    // Step 1: Check for duplicate phone (primary identity)
    const existingBusiness = await this.businessRepository.findOne({
      where: { phone: command.phone },
    });

    if (existingBusiness) {
      this.logger.warn(`Duplicate business phone detected: ${command.phone}`);
      throw new ConflictException(`Business with phone "${command.phone}" already exists`);
    }

    try {
      // Step 2: Create business entity
      const entity = BusinessEntity.fromDomain({
        businessId,
        businessName: command.businessName,
        phone: command.phone,
        location: command.location,
        businessType: command.businessType,
        email: command.email,
        createdAt: now,
      });

      // Step 3: Persist to PostgreSQL
      await this.businessRepository.save(entity);
      this.logger.debug(`Business persisted to PostgreSQL: ${businessId}`);

      // Step 4: Create and emit event
      const event = new BusinessOnboardedEventV1({
        eventId,
        businessId,
        businessName: command.businessName,
        phone: command.phone,
        location: command.location,
        businessType: command.businessType,
        email: command.email,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`BusinessOnboardedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish('business.onboarded.v1', event)
          .catch((err: Error) => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return businessId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to create business: ${err.message}`, err.stack);
      throw error;
    }
  }
}
