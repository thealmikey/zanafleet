import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';

import { OrganizationEntity } from '../../organization/entities/organization.entity';

import { CreateWorkspaceCommand } from '../commands/create-workspace.command';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { WorkspaceCreatedEventV1 } from '../events/workspace-created.event';

/**
 * CreateWorkspaceCommandHandler
 *
 * Handles the CreateWorkspaceCommand by:
 * 1. Validating organization exists
 * 2. Persisting workspace to PostgreSQL
 * 3. Emitting WorkspaceCreatedEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repositories and event bus
 * - Validates foreign key references before persistence
 * - Atomic operations (validate, persist, then emit)
 * - Proper error handling and logging
 * - Deterministic event generation
 */
@CommandHandler(CreateWorkspaceCommand)
@Injectable()
export class CreateWorkspaceCommandHandler
  implements ICommandHandler<CreateWorkspaceCommand>
{
  private readonly logger = new Logger(CreateWorkspaceCommandHandler.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  /**
   * Execute command: Create workspace
   *
   * @param command CreateWorkspaceCommand
   * @returns workspaceId of created workspace
   * @throws NotFoundException if organization does not exist
   * @throws Error if persistence fails
   */
  async execute(command: CreateWorkspaceCommand): Promise<string> {
    const workspaceId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(
      `Executing CreateWorkspaceCommand for workspace: ${workspaceId}, orgId: ${command.orgId}`,
    );

    try {
      // Step 1: Validate organization exists
      const organization = await this.organizationRepository.findOne({
        where: { id: command.orgId },
      });

      if (!organization) {
        this.logger.warn(
          `Organization not found: ${command.orgId}`,
        );
        throw new NotFoundException(
          `Organization with ID '${command.orgId}' does not exist`,
        );
      }

      this.logger.debug(
        `Organization validated: ${command.orgId}`,
      );

      // Step 2: Create workspace entity
      const entity = WorkspaceEntity.fromDomain({
        workspaceId,
        orgId: command.orgId,
        name: command.name,
        type: command.type,
        status: command.status,
        createdAt: now,
      });

      // Step 3: Persist to PostgreSQL
      await this.workspaceRepository.save(entity);
      this.logger.debug(
        `Workspace persisted to PostgreSQL: ${workspaceId}`,
      );

      // Step 4: Create and emit event
      const event = new WorkspaceCreatedEventV1({
        eventId,
        workspaceId,
        orgId: command.orgId,
        name: command.name,
        type: command.type,
        status: command.status,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(
        `WorkspaceCreatedEvent-V1 emitted to event bus: ${eventId}`,
      );

      if (this.eventBusService) {
        await this.eventBusService.publish(
          NatsSubjects.Workspace.CREATED_V1,
          event,
        ).catch(err => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return workspaceId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to create workspace: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }
}
