/**
 * EnableJobTypeHandler
 *
 * Handles enabling a job type for a workspace
 */

import { EventBusService } from '@api/core/event-bus';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { JobTypeEntity } from '../entities/job-type.entity';
import { JobTypeEnabledEventV1 } from '../events/job-type-enabled.event';

/**
 * EnableJobTypeCommand
 */
export class EnableJobTypeCommand {
  readonly jobTypeId: string;
  readonly workspaceId: string;
  readonly enabledBy: string | null;

  constructor(input: { jobTypeId: string; workspaceId: string; enabledBy?: string | null }) {
    this.jobTypeId = input.jobTypeId;
    this.workspaceId = input.workspaceId;
    this.enabledBy = input.enabledBy ?? null;
  }
}

/**
 * EnableJobTypeCommandHandler
 */
@CommandHandler(EnableJobTypeCommand)
@Injectable()
export class EnableJobTypeHandler implements ICommandHandler<EnableJobTypeCommand> {
  private readonly logger = new Logger(EnableJobTypeHandler.name);

  constructor(
    @InjectRepository(JobTypeEntity)
    private readonly jobTypeRepository: Repository<JobTypeEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Execute command: Enable job type for workspace
   */
  async execute(command: EnableJobTypeCommand): Promise<void> {
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(`Executing EnableJobTypeCommand for job type: ${command.jobTypeId}`);

    // Step 1: Find existing job type
    const existing = await this.jobTypeRepository.findOne({
      where: { id: command.jobTypeId },
    });

    if (!existing) {
      throw new NotFoundException(`JobType with ID "${command.jobTypeId}" not found`);
    }

    // Step 2: Emit event
    const event = new JobTypeEnabledEventV1({
      eventId,
      jobTypeId: command.jobTypeId,
      workspaceId: command.workspaceId,
      enabledAt: now,
      enabledBy: command.enabledBy,
      occurredAt: now,
    });

    this.eventBus.publish(event);
    this.logger.log(`JobTypeEnabledEvent-V1 emitted to event bus: ${eventId}`);

    if (this.eventBusService) {
      await this.eventBusService
        .publish('jobtype.enabled.v1', event)
        .catch((err: Error) => this.logger.warn(`NATS publish failed: ${err.message}`));
    }
  }
}
