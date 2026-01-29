import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../core/event-bus';
import { UpdateWorkspaceCommand } from '../commands/update-workspace.command';
import { WorkspaceEntity } from '../entities/workspace.entity';
import {
  WorkspaceUpdatedEventV1,
  WorkspaceUpdatedEventV1Changes,
} from '../events/workspace-updated.event';

/**
 * UpdateWorkspaceCommandHandler
 * 
 * Handles UpdateWorkspaceCommand by updating the WorkspaceEntity in PostgreSQL
 * and emitting WorkspaceUpdatedEventV1 to both internal and external event buses.
 */
@CommandHandler(UpdateWorkspaceCommand)
@Injectable()
export class UpdateWorkspaceCommandHandler
  implements ICommandHandler<UpdateWorkspaceCommand>
{
  private readonly logger = new Logger(UpdateWorkspaceCommandHandler.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  /**
   * Execute workspace update logic
   */
  async execute(command: UpdateWorkspaceCommand): Promise<void> {
    const { workspaceId, ...updates } = command;
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(`Executing UpdateWorkspaceCommand for workspace: ${workspaceId}`);

    // Step 1: Find existing workspace
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      this.logger.error(`Workspace not found: ${workspaceId}`);
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Step 2: Track changes for the event and update entity
    const changes: WorkspaceUpdatedEventV1Changes = {};
    if (updates.name !== undefined) {
      changes.name = updates.name;
      workspace.name = updates.name;
    }
    if (updates.status !== undefined) {
      changes.status = updates.status;
      workspace.status = updates.status;
    }
    if (updates.roleTemplates !== undefined) {
      changes.roleTemplates = updates.roleTemplates;
      workspace.roleTemplates = updates.roleTemplates;
    }

    // If no actual fields were provided for update, skip
    if (Object.keys(changes).length === 0) {
      this.logger.debug(`No updates requested for workspace: ${workspaceId}`);
      return;
    }

    // Step 3: Persist changes to PostgreSQL
    await this.workspaceRepository.save(workspace);
    this.logger.debug(`Workspace updated in PostgreSQL: ${workspaceId}`);

    // Step 4: Create update event
    const event = new WorkspaceUpdatedEventV1({
      eventId,
      workspaceId,
      changes,
      updatedAt: now,
      occurredAt: now,
    });

    // Step 5: Emit event to internal CQRS event bus (for local projections)
    this.eventBus.publish(event);
    this.logger.log(`WorkspaceUpdatedEvent-V1 emitted to internal event bus: ${eventId}`);

    // Step 6: Publish to NATS external event bus (for other modules)
    if (this.eventBusService) {
      try {
        await this.eventBusService.publish(
          NatsSubjects.Workspace.UPDATED_V1,
          event,
        );
        this.logger.log(`WorkspaceUpdatedEvent-V1 published to NATS: ${NatsSubjects.Workspace.UPDATED_V1}`);
      } catch (publishError: unknown) {
        const err =
          publishError instanceof Error
            ? publishError
            : new Error(String(publishError));
        this.logger.warn(`NATS publish failed for workspace ${workspaceId}: ${err.message}`);
      }
    }
  }
}
