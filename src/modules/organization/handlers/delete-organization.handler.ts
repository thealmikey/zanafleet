import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';
import { DeleteOrganizationCommand } from '../commands/delete-organization.command';
import { OrganizationEntity } from '../entities/organization.entity';
import { OrganizationStatus } from '../dto/organization.enums';
import { OrganizationDeletedEventV1 } from '../events/organization-deleted.event';

@CommandHandler(DeleteOrganizationCommand)
@Injectable()
export class DeleteOrganizationCommandHandler
  implements ICommandHandler<DeleteOrganizationCommand>
{
  private readonly logger = new Logger(DeleteOrganizationCommandHandler.name);

  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async execute(command: DeleteOrganizationCommand): Promise<void> {
    this.logger.log(
      `Executing DeleteOrganizationCommand for organization: ${command.organizationId}`,
    );

    const organization = await this.organizationRepository.findOne({
      where: { id: command.organizationId },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization ${command.organizationId} not found`,
      );
    }

    organization.status = OrganizationStatus.DELETED;

    const updatedOrganization = await this.organizationRepository.save(
      organization,
    );
    this.logger.debug(
      `Organization soft-deleted in PostgreSQL: ${command.organizationId}`,
    );

    const deletedAt = updatedOrganization.updatedAt ?? new Date();

    const event = new OrganizationDeletedEventV1({
      eventId: uuidv4(),
      organizationId: updatedOrganization.id,
      deletedAt,
      deletedByActorId: command.deletedByActorId,
      occurredAt: deletedAt,
    });

    this.eventBus.publish(event);
    this.logger.log(
      `OrganizationDeletedEvent-V1 emitted to event bus for: ${command.organizationId}`,
    );

    if (this.eventBusService) {
      try {
        await this.eventBusService.publish(
          NatsSubjects.Organization.DELETED_V1,
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
