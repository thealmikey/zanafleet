/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { ConflictException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '@api/core/event-bus';
import { SaccoEntity } from '../../sacco/entities/sacco.entity';
import { CreateRiderCommand } from '../commands/create-rider.command';
import { RiderEntity } from '../entities/rider.entity';
import { RiderOnboardedEventV1 } from '../events/rider-onboarded.event';

/**
 * CreateRiderCommandHandler
 *
 * Handles the CreateRiderCommand by:
 * 1. Validating Sacco existence (if saccoId provided)
 * 2. Auto-filling location from Sacco if not provided
 * 3. Checking for duplicate phone and nationalId
 * 4. Persisting to PostgreSQL
 * 5. Emitting RiderOnboardedEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repositories and event bus
 * - Validates foreign key existence before persisting
 * - Atomic operations (persist then emit)
 * - Proper error handling and logging
 * - Deterministic event generation
 */
@CommandHandler(CreateRiderCommand)
@Injectable()
export class CreateRiderCommandHandler implements ICommandHandler<CreateRiderCommand> {
  private readonly logger = new Logger(CreateRiderCommandHandler.name);

  constructor(
    @InjectRepository(RiderEntity)
    private readonly riderRepository: Repository<RiderEntity>,
    @InjectRepository(SaccoEntity)
    private readonly saccoRepository: Repository<SaccoEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Execute command: Create rider
   *
   * @param command CreateRiderCommand
   * @returns riderId of created rider
   * @throws ConflictException if rider with same phone or nationalId exists
   * @throws NotFoundException if sacco does not exist
   * @throws Error if persistence fails
   */
  async execute(command: CreateRiderCommand): Promise<string> {
    const riderId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(`Executing CreateRiderCommand for rider: ${command.phone}`);

    // Step 1: Validate Sacco existence and get location if needed
    let location = command.location;
    if (command.saccoId) {
      const sacco = await this.saccoRepository.findOne({
        where: { id: command.saccoId },
      });

      if (!sacco) {
        this.logger.warn(`Sacco not found: ${command.saccoId}`);
        throw new NotFoundException(`Sacco with ID "${command.saccoId}" not found`);
      }

      // Auto-fill location from Sacco if not provided
      if (!location) {
        location = sacco.location;
        this.logger.debug(`Location auto-filled from Sacco: ${location}`);
      }
    } else {
      // Location is required if no Sacco provided
      if (!location) {
        this.logger.warn('Location is required when no Sacco is provided');
        throw new Error('Location is required when no Sacco is provided');
      }
    }

    // Step 2: Check for duplicate phone
    const existingPhone = await this.riderRepository.findOne({
      where: { phone: command.phone },
    });

    if (existingPhone) {
      this.logger.warn(`Duplicate phone detected: ${command.phone}`);
      throw new ConflictException(`Rider with phone "${command.phone}" already exists`);
    }

    // Step 3: Check for duplicate nationalId
    const existingNationalId = await this.riderRepository.findOne({
      where: { nationalId: command.nationalId },
    });

    if (existingNationalId) {
      this.logger.warn(`Duplicate national ID detected: ${command.nationalId}`);
      throw new ConflictException(`Rider with national ID "${command.nationalId}" already exists`);
    }

    try {
      // Step 4: Create rider entity
      const entity = RiderEntity.fromDomain({
        riderId,
        fullName: command.fullName,
        nationalId: command.nationalId,
        phone: command.phone,
        location,
        vehicleType: command.vehicleType,
        saccoId: command.saccoId,
        email: command.email,
        createdAt: now,
      });

      // Step 5: Persist to PostgreSQL
      await this.riderRepository.save(entity);
      this.logger.debug(`Rider persisted to PostgreSQL: ${riderId}`);

      // Step 6: Create and emit event
      const event = new RiderOnboardedEventV1({
        eventId,
        riderId,
        fullName: command.fullName,
        nationalId: command.nationalId,
        phone: command.phone,
        location,
        vehicleType: command.vehicleType,
        saccoId: command.saccoId,
        email: command.email,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`RiderOnboardedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish('rider.onboarded.v1', event)
          .catch((err: Error) => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return riderId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to create rider: ${err.message}`, err.stack);
      throw error;
    }
  }
}
