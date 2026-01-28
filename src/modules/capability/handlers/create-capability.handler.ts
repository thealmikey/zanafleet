import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';
import { CreateCapabilityCommand } from '../commands/create-capability.command';
import { CapabilityEntity } from '../entities/capability.entity';
import { CapabilityCreatedEventV1 } from '../events/capability-created.event';

@CommandHandler(CreateCapabilityCommand)
@Injectable()
export class CreateCapabilityCommandHandler
  implements ICommandHandler<CreateCapabilityCommand, string>
{
  private readonly logger = new Logger(CreateCapabilityCommandHandler.name);

  constructor(
    @InjectRepository(CapabilityEntity)
    private readonly capabilityRepository: Repository<CapabilityEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async execute(command: CreateCapabilityCommand): Promise<string> {
    const capabilityId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(
      `Executing CreateCapabilityCommand for capability: ${capabilityId}`,
    );

    try {
      const capabilityEntity = CapabilityEntity.fromDomain({
        capabilityId,
        name: command.name,
        createdAt: now,
      });

      await this.capabilityRepository.save(capabilityEntity);

      this.logger.debug(`Capability persisted to PostgreSQL: ${capabilityId}`);

      const event = new CapabilityCreatedEventV1({
        eventId,
        capabilityId,
        name: command.name,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);

      this.logger.log(
        `CapabilityCreatedEvent-V1 emitted to internal event bus: ${eventId}`,
      );

      if (this.eventBusService) {
        try {
          await this.eventBusService.publish(
            NatsSubjects.Capability.CREATED_V1,
            event,
          );
        } catch (publishError: unknown) {
          const err =
            publishError instanceof Error
              ? publishError
              : new Error(String(publishError));
          this.logger.warn(`NATS publish failed: ${err.message}`);
        }
      }

      return capabilityId;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to create capability: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }
}
