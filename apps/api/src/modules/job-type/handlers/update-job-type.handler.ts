/**
 * UpdateJobTypeHandler
 *
 * Handles the UpdateJobTypeCommand by:
 * 1. Finding existing job type
 * 2. Updating the entity
 * 3. Emitting JobTypeUpdatedEvent-V1 to event bus
 */

import { EventBusService } from '@api/core/event-bus';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { UpdateJobTypeCommand } from '../commands/update-job-type.command';
import { JobTypeEntity } from '../entities/job-type.entity';
import { JobTypeWorkerConfigEntity } from '../entities/job-type-worker-config.entity';
import { JobTypeMetadataFieldEntity } from '../entities/job-type-metadata-field.entity';
import { JobTypeUpdatedEventV1 } from '../events/job-type-updated.event';

/**
 * UpdateJobTypeCommandHandler
 *
 * Handles the UpdateJobTypeCommand by:
 * 1. Finding existing job type
 * 2. Updating the entity
 * 3. Emitting JobTypeUpdatedEvent-V1 to event bus
 */
@CommandHandler(UpdateJobTypeCommand)
@Injectable()
export class UpdateJobTypeHandler implements ICommandHandler<UpdateJobTypeCommand> {
  private readonly logger = new Logger(UpdateJobTypeHandler.name);

  constructor(
    @InjectRepository(JobTypeEntity)
    private readonly jobTypeRepository: Repository<JobTypeEntity>,
    @InjectRepository(JobTypeWorkerConfigEntity)
    private readonly workerConfigRepository: Repository<JobTypeWorkerConfigEntity>,
    @InjectRepository(JobTypeMetadataFieldEntity)
    private readonly metadataFieldRepository: Repository<JobTypeMetadataFieldEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  /**
   * Execute command: Update job type
   */
  async execute(command: UpdateJobTypeCommand): Promise<string> {
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(`Executing UpdateJobTypeCommand for job type: ${command.jobTypeId}`);

    // Step 1: Find existing job type
    const existing = await this.jobTypeRepository.findOne({
      where: { id: command.jobTypeId, workspaceId: command.workspaceId },
    });

    if (!existing) {
      throw new NotFoundException(`JobType with ID "${command.jobTypeId}" not found`);
    }

    try {
      // Step 2: Build update payload
      const updatePayload: Partial<JobTypeEntity> = {
        updatedAt: now,
      };

      if (command.name !== undefined) updatePayload.name = command.name;
      if (command.description !== undefined) updatePayload.description = command.description;
      if (command.vertical !== undefined) updatePayload.vertical = command.vertical;
      if (command.mode !== undefined) updatePayload.mode = command.mode;
      if (command.status !== undefined) updatePayload.status = command.status;
      if (command.workflowDefinitionId !== undefined)
        updatePayload.workflowDefinitionId = command.workflowDefinitionId;
      if (command.assignmentStrategy !== undefined)
        updatePayload.assignmentStrategy = command.assignmentStrategy;
      if (command.pricingStrategy !== undefined)
        updatePayload.pricingStrategy = command.pricingStrategy;
      if (command.uiLayoutConfig !== undefined)
        updatePayload.uiLayoutConfig = command.uiLayoutConfig;
      if (command.slaRules !== undefined) updatePayload.slaRules = command.slaRules;
      if (command.supportsMultipleWorkers !== undefined)
        updatePayload.supportsMultipleWorkers = command.supportsMultipleWorkers;
      if (command.supportsMultipleDestinations !== undefined)
        updatePayload.supportsMultipleDestinations = command.supportsMultipleDestinations;
      if (command.verticalSpecificSettings !== undefined)
        updatePayload.verticalSpecificSettings = command.verticalSpecificSettings;

      // Step 3: Update job type
      await this.jobTypeRepository.update(command.jobTypeId, updatePayload);
      this.logger.debug(`JobType updated in PostgreSQL: ${command.jobTypeId}`);

      // Step 4: Handle worker configs update if provided
      if (command.workerConfigs) {
        // Delete existing worker configs
        await this.workerConfigRepository.delete({ jobTypeId: command.jobTypeId });

        // Create new worker configs
        const workerConfigs = command.workerConfigs.map((wc) => {
          const config = new JobTypeWorkerConfigEntity();
          config.id = uuidv4();
          config.jobTypeId = command.jobTypeId;
          config.workerType = wc.workerType;
          config.minWorkers = wc.minWorkers;
          config.maxWorkers = wc.maxWorkers ?? null;
          config.required = wc.required;
          config.qualifications = wc.qualifications ?? null;
          return config;
        });

        if (workerConfigs.length > 0) {
          await this.workerConfigRepository.save(workerConfigs);
        }
        this.logger.debug(`Worker configs updated: ${workerConfigs.length}`);
      }

      // Step 5: Handle metadata fields update if provided
      if (command.metadataFields) {
        // Delete existing metadata fields
        await this.metadataFieldRepository.delete({ jobTypeId: command.jobTypeId });

        // Create new metadata fields
        const metadataFields = command.metadataFields.map((mf) => {
          const field = new JobTypeMetadataFieldEntity();
          field.id = uuidv4();
          field.jobTypeId = command.jobTypeId;
          field.fieldKey = mf.fieldKey;
          field.displayName = mf.displayName;
          field.description = mf.description ?? null;
          field.fieldType = mf.fieldType;
          field.required = mf.required;
          field.isCustomerEditable = mf.isCustomerEditable;
          field.validationRules = mf.validationRules ?? null;
          field.displayOrder = mf.displayOrder ?? null;
          field.uiConfig = mf.uiConfig ?? null;
          return field;
        });

        if (metadataFields.length > 0) {
          await this.metadataFieldRepository.save(metadataFields);
        }
        this.logger.debug(`Metadata fields updated: ${metadataFields.length}`);
      }

      // Step 6: Create and emit event
      const event = new JobTypeUpdatedEventV1({
        eventId,
        jobTypeId: command.jobTypeId,
        workspaceId: command.workspaceId,
        name: command.name,
        description: command.description,
        vertical: command.vertical,
        mode: command.mode,
        status: command.status,
        workflowDefinitionId: command.workflowDefinitionId,
        assignmentStrategy: command.assignmentStrategy,
        pricingStrategy: command.pricingStrategy,
        uiLayoutConfig: command.uiLayoutConfig,
        slaRules: command.slaRules,
        supportsMultipleWorkers: command.supportsMultipleWorkers,
        supportsMultipleDestinations: command.supportsMultipleDestinations,
        verticalSpecificSettings: command.verticalSpecificSettings,
        updatedAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`JobTypeUpdatedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish('jobtype.updated.v1', event)
          .catch((err: Error) => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return command.jobTypeId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to update job type: ${err.message}`, err.stack);
      throw error;
    }
  }
}
