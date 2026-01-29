import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';
import { AddActorToWorkspaceCommand } from '../../workspace/commands/add-actor-to-workspace.command';
import { CreateWorkspaceCommand } from '../../workspace/commands/create-workspace.command';
import {
  MembershipRole,
  WorkspaceStatus,
  WorkspaceType,
} from '../../workspace/dto/workspace.enums';
import { CreateOrganizationCommand } from '../commands/create-organization.command';
import { OrganizationType } from '../dto/organization.enums';
import { OrganizationEntity } from '../entities/organization.entity';
import { OrganizationCreatedEventV1 } from '../events/organization-created.event';

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
    private readonly commandBus: CommandBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Maps OrganizationType to WorkspaceType for default workspace creation
   * Returns null for organization types that don't get a default workspace
   */
  private mapOrgTypeToWorkspaceType(orgType: OrganizationType): WorkspaceType | null {
    switch (orgType) {
      case OrganizationType.SACCO:
        return WorkspaceType.SACCO;
      case OrganizationType.BUSINESS:
        return WorkspaceType.BUSINESS;
      case OrganizationType.PLATFORM:
      case OrganizationType.INTERNAL:
      default:
        return null;
    }
  }

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

    this.logger.log(`Executing CreateOrganizationCommand for organization: ${organizationId}`);

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
      this.logger.debug(`Organization persisted to PostgreSQL: ${organizationId}`);

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
      this.logger.log(`OrganizationCreatedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        try {
          await this.eventBusService.publish(NatsSubjects.Organization.CREATED_V1, event);
        } catch (publishError: unknown) {
          const errorMessage =
            publishError instanceof Error ? publishError.message : String(publishError);
          this.logger.warn(`NATS publish failed: ${errorMessage}`);
        }
      }

      // Step 4: Orchestrate default workspace and membership creation
      const workspaceType = this.mapOrgTypeToWorkspaceType(command.type);
      if (workspaceType !== null) {
        try {
          // Create default workspace for this organization
          const createWorkspaceCommand = new CreateWorkspaceCommand({
            name: `${command.name} Workspace`,
            orgId: organizationId,
            type: workspaceType,
            status: WorkspaceStatus.ACTIVE,
            roleTemplates: [],
          });

          const workspaceId = await this.commandBus.execute<CreateWorkspaceCommand, string>(
            createWorkspaceCommand
          );
          this.logger.log(
            `Default workspace created: ${workspaceId} for organization: ${organizationId}`
          );

          // If createdByActorId is provided, add the actor as ADMIN
          if (command.createdByActorId) {
            const addActorCommand = new AddActorToWorkspaceCommand({
              actorId: command.createdByActorId,
              workspaceId,
              role: MembershipRole.ADMIN,
            });

            await this.commandBus.execute(addActorCommand);
            this.logger.log(
              `Actor ${command.createdByActorId} added as ADMIN to workspace: ${workspaceId}`
            );
          }
        } catch (orchestrationError: unknown) {
          // Log warning but don't fail - organization was already created successfully
          const errorMessage =
            orchestrationError instanceof Error
              ? orchestrationError.message
              : String(orchestrationError);
          this.logger.warn(
            `Workspace orchestration failed for organization ${organizationId}: ${errorMessage}`
          );
        }
      }

      return organizationId;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to create organization: ${String(err.message)}`, err.stack);
      throw err;
    }
  }
}
