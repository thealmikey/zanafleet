import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreateOrganizationCommand } from '../commands/create-organization.command';
import { OrganizationCreatedEventV1 } from '../events/organization-created.event';
import { OrganizationEntity } from '../entities/organization.entity';
import { EventBusService, NatsSubjects } from '../../../core/event-bus';

/**
 * CreateOrganizationCommandHandler
 * 
 * Handles the CreateOrganizationCommand by:
 * 1. Validating input (already done in command)
 * 2. Persisting to PostgreSQL
 * 3. Emitting OrganizationCreatedEvent-V1 to NATS event bus
 * 
 * Best Practices:
 * - Uses dependency injection for repository and event bus
 * - Atomic operations (persist then emit)
 * - Proper error handling and logging
 * - Deterministic event generation
 */
@CommandHandler(CreateOrganizationCommand)
@Injectable()
export class CreateOrganizationCommandHandler
  implements ICommandHandler<CreateOrganizationCommand>
{
  private readonly logger = new Logger(CreateOrganizationCommandHandler.name);

  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  /**
   * Execute command: Create organization
   * 
   * @param command CreateOrganizationCommand
   * @returns organizationId of created organization
   * @throws Error if persistence fails
   */
  async execute(command: CreateOrganizationCommand): Promise<string> {
    const organizationId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(
      `Executing CreateOrganizationCommand for organization: ${organizationId}`,
    );

    try {
      // Step 1: Create organization entity
      const entity = OrganizationEntity.fromDomain({
        organizationId,
        name: command.name,
        type: command.type,
        status: command.status,
        linkedWallets: command.linkedWallets,
        createdAt: now,
      });

      // Step 2: Persist to PostgreSQL
      await this.organizationRepository.save(entity);
      this.logger.debug(
        `Organization persisted to PostgreSQL: ${organizationId}`,
      );

      // Step 3: Create and emit event
      const event = new OrganizationCreatedEventV1({
        eventId,
        organizationId,
        name: command.name,
        type: command.type,
        status: command.status,
        linkedWallets: command.linkedWallets,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(
        `OrganizationCreatedEvent-V1 emitted to event bus: ${eventId}`,
      );

      if (this.eventBusService) {
        try {
          await this.eventBusService.publish(
            NatsSubjects.Organization.CREATED_V1,
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

      return organizationId;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to create organization: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }
}
