import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';
import { UpdateOrganizationCommand } from '../commands/update-organization.command';
import { OrganizationEntity } from '../entities/organization.entity';
import {
  OrganizationUpdatedEventV1,
  OrganizationUpdatedEventV1Changes,
} from '../events/organization-updated.event';

@CommandHandler(UpdateOrganizationCommand)
@Injectable()
export class UpdateOrganizationCommandHandler
  implements ICommandHandler<UpdateOrganizationCommand>
{
  private readonly logger = new Logger(UpdateOrganizationCommandHandler.name);

  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async execute(command: UpdateOrganizationCommand): Promise<void> {
    this.logger.log(
      `Executing UpdateOrganizationCommand for organization: ${command.organizationId}`,
    );

    const organization = await this.organizationRepository.findOne({
      where: { id: command.organizationId },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization ${command.organizationId} not found`,
      );
    }

    const changes: OrganizationUpdatedEventV1Changes = {};

    if (command.name !== undefined) {
      organization.name = command.name;
      changes.name = command.name;
    }

    if (command.type !== undefined) {
      organization.type = command.type;
      changes.type = command.type;
    }

    if (command.status !== undefined) {
      organization.status = command.status;
      changes.status = command.status;
    }

    if (command.linkedWallets !== undefined) {
      const wallets = [...command.linkedWallets];
      organization.linkedWallets = wallets;
      changes.linkedWallets = wallets;
    }

    const updatedOrganization = await this.organizationRepository.save(
      organization,
    );
    this.logger.debug(
      `Organization updated in PostgreSQL: ${command.organizationId}`,
    );

    const event = new OrganizationUpdatedEventV1({
      eventId: uuidv4(),
      organizationId: updatedOrganization.id,
      changes,
      updatedAt: updatedOrganization.updatedAt ?? new Date(),
      occurredAt: new Date(),
    });

    this.eventBus.publish(event);
    this.logger.log(
      `OrganizationUpdatedEvent-V1 emitted to event bus for: ${command.organizationId}`,
    );

    if (this.eventBusService) {
      try {
        await this.eventBusService.publish(
          NatsSubjects.Organization.UPDATED_V1,
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
  }
}
