/**
 * CreateJobTypeHandler
 *
 * Handles the CreateJobTypeCommand by:
 * 1. Validating the input
 * 2. Persisting to PostgreSQL
 * 3. Emitting JobTypeCreatedEvent-V1 to event bus
 */

import { EventBusService } from '@api/core/event-bus';
import { ConflictException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { CreateJobTypeCommand } from '../commands/create-job-type.command';
import { JobTypeEntity } from '../entities/job-type.entity';
import { JobTypeWorkerConfigEntity } from '../entities/job-type-worker-config.entity';
import { JobTypeMetadataFieldEntity } from '../entities/job-type-metadata-field.entity';
import { JobTypeCreatedEventV1 } from '../events/job-type-created.event';

/**
 * CreateJobTypeCommandHandler
 *
 * Handles the CreateJobTypeCommand by:
 * 1. Creating the job type entity
 * 2. Persisting worker configs and metadata fields
 * 3. Emitting JobTypeCreatedEvent-V1 to event bus
 */
@CommandHandler(CreateJobTypeCommand)
@Injectable()
export class CreateJobTypeHandler implements ICommandHandler<CreateJobTypeCommand> {
  private readonly logger = new Logger(CreateJobTypeHandler.name);

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
   * Execute command: Create job type
   */
  async execute(command: CreateJobTypeCommand): Promise<string> {
    const jobTypeId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(`Executing CreateJobTypeCommand for job type: ${command.name}`);

    try {
      // Step 1: Create main job type entity
      const jobTypeEntity = new JobTypeEntity();
      jobTypeEntity.id = jobTypeId;
      jobTypeEntity.workspaceId = command.workspaceId;
      jobTypeEntity.name = command.name;
      jobTypeEntity.description = command.description;
      jobTypeEntity.vertical = command.vertical;
      jobTypeEntity.mode = command.mode;
      jobTypeEntity.status = command.status;
      jobTypeEntity.workflowDefinitionId = command.workflowDefinitionId;
      jobTypeEntity.assignmentStrategy = command.assignmentStrategy;
      jobTypeEntity.pricingStrategy = command.pricingStrategy;
      jobTypeEntity.uiLayoutConfig = command.uiLayoutConfig;
      jobTypeEntity.slaRules = command.slaRules;
      jobTypeEntity.supportsMultipleWorkers = command.supportsMultipleWorkers;
      jobTypeEntity.supportsMultipleDestinations = command.supportsMultipleDestinations;
      jobTypeEntity.verticalSpecificSettings = command.verticalSpecificSettings;
      jobTypeEntity.createdAt = now;
      jobTypeEntity.updatedAt = now;

      // Step 2: Save job type first to get ID
      await this.jobTypeRepository.save(jobTypeEntity);
      this.logger.debug(`JobType persisted to PostgreSQL: ${jobTypeId}`);

      // Step 3: Create worker configs
      const workerConfigs = command.workerConfigs.map((wc) => {
        const config = new JobTypeWorkerConfigEntity();
        config.id = uuidv4();
        config.jobTypeId = jobTypeId;
        config.workerType = wc.workerType;
        config.minWorkers = wc.minWorkers;
        config.maxWorkers = wc.maxWorkers ?? null;
        config.required = wc.required;
        config.qualifications = wc.qualifications ?? null;
        return config;
      });

      if (workerConfigs.length > 0) {
        await this.workerConfigRepository.save(workerConfigs);
        this.logger.debug(`Worker configs created: ${workerConfigs.length}`);
      }

      // Step 4: Create metadata fields
      const metadataFields = command.metadataFields.map((mf) => {
        const field = new JobTypeMetadataFieldEntity();
        field.id = uuidv4();
        field.jobTypeId = jobTypeId;
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
        this.logger.debug(`Metadata fields created: ${metadataFields.length}`);
      }

      // Step 5: Create and emit event
      const event = new JobTypeCreatedEventV1({
        eventId,
        jobTypeId,
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
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`JobTypeCreatedEvent-V1 emitted to event bus: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish('jobtype.created.v1', event)
          .catch((err: Error) => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return jobTypeId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to create job type: ${err.message}`, err.stack);
      throw error;
    }
  }
}
