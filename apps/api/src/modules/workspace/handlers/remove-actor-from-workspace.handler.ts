import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../core/event-bus';
import { RemoveActorFromWorkspaceCommand } from '../commands/remove-actor-from-workspace.command';
import { MembershipEntity } from '../entities/membership.entity';
import { ActorRemovedFromWorkspaceEventV1 } from '../events/actor-removed-from-workspace.event';

/**
 * RemoveActorFromWorkspaceCommandHandler
 *
 * Handles the RemoveActorFromWorkspaceCommand by:
 * 1. Validating membership exists
 * 2. Deleting membership from PostgreSQL
 * 3. Emitting ActorRemovedFromWorkspaceEvent-V1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repositories and event bus
 * - Validates membership exists before deletion
 * - Atomic operations (validate, delete, then emit)
 * - Proper error handling and logging
 */
@CommandHandler(RemoveActorFromWorkspaceCommand)
@Injectable()
export class RemoveActorFromWorkspaceCommandHandler
  implements ICommandHandler<RemoveActorFromWorkspaceCommand>
{
  private readonly logger = new Logger(RemoveActorFromWorkspaceCommandHandler.name);

  constructor(
    @InjectRepository(MembershipEntity)
    private readonly membershipRepository: Repository<MembershipEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Execute command: Remove actor from workspace
   *
   * @param command RemoveActorFromWorkspaceCommand
   * @returns void
   * @throws NotFoundException if membership does not exist
   */
  async execute(command: RemoveActorFromWorkspaceCommand): Promise<void> {
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(
      `Executing RemoveActorFromWorkspaceCommand: actor=${command.actorId}, workspace=${command.workspaceId}`
    );

    try {
      // Step 1: Validate membership exists
      const membership = await this.membershipRepository.findOne({
        where: {
          actorId: command.actorId,
          workspaceId: command.workspaceId,
        },
      });

      if (!membership) {
        this.logger.warn(
          `Membership not found: actor=${command.actorId}, workspace=${command.workspaceId}`
        );
        throw new NotFoundException(
          `Actor '${command.actorId}' is not a member of workspace '${command.workspaceId}'`
        );
      }

      this.logger.debug(
        `Membership validated: actor=${command.actorId}, workspace=${command.workspaceId}`
      );

      // Step 2: Delete membership from PostgreSQL
      await this.membershipRepository.remove(membership);
      this.logger.debug(
        `Membership deleted: actor=${command.actorId}, workspace=${command.workspaceId}`
      );

      // Step 3: Create and emit event
      const event = new ActorRemovedFromWorkspaceEventV1({
        eventId,
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        removedAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`ActorRemovedFromWorkspaceEvent-V1 emitted: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish('workspace.events.member-removed-v1', event)
          .catch((err: unknown) => {
            const error = err instanceof Error ? err : new Error(String(err));
            this.logger.warn(`NATS publish failed: ${error.message}`);
          });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to remove actor from workspace: ${err.message}`, err.stack);
      throw error;
    }
  }
}
