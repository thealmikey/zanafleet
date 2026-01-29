import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../core/event-bus';
import { ActorEntity } from '../../actor/entities/actor.entity';
import { AddActorToWorkspaceCommand } from '../commands/add-actor-to-workspace.command';
import { WorkspaceStatus } from '../dto/workspace.enums';
import { MembershipEntity } from '../entities/membership.entity';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { ActorAddedToWorkspaceEventV1 } from '../events/actor-added-to-workspace.event';

/**
 * AddActorToWorkspaceCommandHandler
 *
 * Handles the AddActorToWorkspaceCommand by:
 * 1. Validating workspace exists and is ACTIVE
 * 2. Validating actor exists
 * 3. Checking membership doesn't already exist
 * 4. Persisting membership to PostgreSQL
 * 5. Emitting ActorAddedToWorkspaceEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repositories and event bus
 * - Validates all foreign key references before persistence
 * - Enforces business rules (no duplicates, workspace must be active)
 * - Atomic operations (validate, persist, then emit)
 * - Proper error handling and logging
 */
@CommandHandler(AddActorToWorkspaceCommand)
@Injectable()
export class AddActorToWorkspaceCommandHandler
  implements ICommandHandler<AddActorToWorkspaceCommand>
{
  private readonly logger = new Logger(AddActorToWorkspaceCommandHandler.name);

  constructor(
    @InjectRepository(MembershipEntity)
    private readonly membershipRepository: Repository<MembershipEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  /**
   * Execute command: Add actor to workspace
   *
   * @param command AddActorToWorkspaceCommand
   * @returns void
   * @throws NotFoundException if workspace or actor does not exist
   * @throws BadRequestException if workspace is SUSPENDED
   * @throws ConflictException if actor is already a member
   */
  async execute(command: AddActorToWorkspaceCommand): Promise<void> {
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(
      `Executing AddActorToWorkspaceCommand: actor=${command.actorId}, workspace=${command.workspaceId}, role=${command.role}`,
    );

    try {
      // Step 1: Validate workspace exists
      const workspace = await this.workspaceRepository.findOne({
        where: { id: command.workspaceId },
      });

      if (!workspace) {
        this.logger.warn(`Workspace not found: ${command.workspaceId}`);
        throw new NotFoundException(
          `Workspace with ID '${command.workspaceId}' does not exist`,
        );
      }

      // Step 2: Check workspace is ACTIVE
      if (workspace.status === WorkspaceStatus.SUSPENDED) {
        this.logger.warn(`Workspace is suspended: ${command.workspaceId}`);
        throw new BadRequestException(
          `Cannot add actor to suspended workspace '${command.workspaceId}'`,
        );
      }

      this.logger.debug(`Workspace validated: ${command.workspaceId}`);

      // Step 3: Validate actor exists
      const actor = await this.actorRepository.findOne({
        where: { id: command.actorId },
      });

      if (!actor) {
        this.logger.warn(`Actor not found: ${command.actorId}`);
        throw new NotFoundException(
          `Actor with ID '${command.actorId}' does not exist`,
        );
      }

      this.logger.debug(`Actor validated: ${command.actorId}`);

      // Step 4: Check membership doesn't already exist
      const existingMembership = await this.membershipRepository.findOne({
        where: {
          actorId: command.actorId,
          workspaceId: command.workspaceId,
        },
      });

      if (existingMembership) {
        this.logger.warn(
          `Actor ${command.actorId} is already a member of workspace ${command.workspaceId}`,
        );
        throw new ConflictException(
          `Actor '${command.actorId}' is already a member of workspace '${command.workspaceId}'`,
        );
      }

      // Step 5: Create membership entity
      const membership = MembershipEntity.fromDomain({
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        role: command.role,
        since: now,
      });

      // Step 6: Persist to PostgreSQL
      await this.membershipRepository.save(membership);
      this.logger.debug(
        `Membership persisted: actor=${command.actorId}, workspace=${command.workspaceId}`,
      );

      // Step 7: Create and emit event
      const event = new ActorAddedToWorkspaceEventV1({
        eventId,
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        role: command.role,
        since: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`ActorAddedToWorkspaceEvent-V1 emitted: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish('workspace.events.member-added-v1', event)
          .catch((err: Error) =>
            this.logger.warn(`NATS publish failed: ${err.message}`),
          );
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to add actor to workspace: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }
}
