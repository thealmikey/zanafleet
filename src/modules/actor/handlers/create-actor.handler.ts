import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';
import { WorkspaceEntity } from '../../workspace/entities/workspace.entity';
import { CreateActorCommand } from '../commands/create-actor.command';
import { ActorEntity } from '../entities/actor.entity';
import { ActorOnboardedEventV1 } from '../events/actor-onboarded.event';

/**
 * CreateActorCommandHandler
 *
 * Handles the CreateActorCommand by:
 * 1. Validating workspace exists
 * 2. Validating all roles are valid for the workspace
 * 3. Persisting to PostgreSQL
 * 4. Emitting ActorOnboardedEventV1 to event bus
 *
 * Best Practices:
 * - Uses dependency injection for repositories and event bus
 * - Cross-module validation via workspace repository
 * - Atomic operations (validate, persist, emit)
 * - Proper error handling and logging
 */
@CommandHandler(CreateActorCommand)
@Injectable()
export class CreateActorCommandHandler implements ICommandHandler<CreateActorCommand> {
  private readonly logger = new Logger(CreateActorCommandHandler.name);

  constructor(
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Execute command: Create actor
   *
   * @param command CreateActorCommand
   * @returns actorId of created actor
   * @throws NotFoundException if workspace does not exist
   * @throws BadRequestException if roles are not valid for the workspace
   */
  async execute(command: CreateActorCommand): Promise<string> {
    const actorId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(`Executing CreateActorCommand for actor: ${actorId}`);

    // Step 1: Validate workspace exists
    const workspace = await this.workspaceRepository.findOne({
      where: { id: command.workspaceId },
    });

    if (!workspace) {
      this.logger.warn(`Workspace not found: ${command.workspaceId}`);
      throw new NotFoundException(`Workspace with ID ${command.workspaceId} does not exist`);
    }

    // Step 2: Validate all roles exist in workspace's roleTemplates
    const invalidRoles = command.roles.filter((role) => !workspace.roleTemplates.includes(role));

    if (invalidRoles.length > 0) {
      this.logger.warn(
        `Invalid roles for workspace ${command.workspaceId}: ${invalidRoles.join(', ')}`
      );
      throw new BadRequestException(
        `The following roles are not valid for workspace ${
          command.workspaceId
        }: ${invalidRoles.join(', ')}`
      );
    }

    try {
      // Step 3: Create actor entity
      const entity = ActorEntity.fromDomain({
        actorId,
        type: command.type,
        roles: command.roles,
        workspaceId: command.workspaceId,
        linkedWallets: command.linkedWallets,
        createdAt: now,
      });

      // Step 4: Persist to PostgreSQL
      await this.actorRepository.save(entity);
      this.logger.debug(`Actor persisted to PostgreSQL: ${actorId}`);

      // Step 5: Create and emit event
      const event = new ActorOnboardedEventV1({
        eventId,
        actorId,
        type: command.type,
        roles: command.roles,
        workspaceId: command.workspaceId,
        linkedWallets: command.linkedWallets,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`ActorOnboardedEventV1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish(NatsSubjects.Actor.ONBOARDED_V1, event)
          .catch((err: Error) => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return actorId;
    } catch (error) {
      this.logger.error(
        `Failed to create actor: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }
}
