import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../core/event-bus';
import { CreateRequirementCommand } from '../commands/create-requirement.command';
import { EvaluateFormationCommand } from '../commands/evaluate-formation.command';
import { RequirementEntity } from '../entities/requirement.entity';
import { RequirementCreatedEventV1 } from '../events/requirement-created.event';

@CommandHandler(CreateRequirementCommand)
@Injectable()
export class CreateRequirementCommandHandler
  implements ICommandHandler<CreateRequirementCommand, string>
{
  private readonly logger = new Logger(CreateRequirementCommandHandler.name);

  constructor(
    @InjectRepository(RequirementEntity)
    private readonly requirementRepository: Repository<RequirementEntity>,
    private readonly eventBus: EventBus,
    private readonly commandBus: CommandBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  async execute(command: CreateRequirementCommand): Promise<string> {
    this.logger.log(
      `Creating requirement '${command.key}' for ${command.entityType}:${command.entityId}`
    );

    const requirementId = uuidv4();
    const eventId = uuidv4();
    const now = new Date();

    const entity = RequirementEntity.fromDomain({
      requirementId,
      entityType: command.entityType,
      entityId: command.entityId,
      type: command.type,
      key: command.key,
      description: command.description,
      blocking: command.blocking,
      satisfied: false,
      targetEntityId: command.targetEntityId,
      createdAt: now,
    });

    try {
      await this.requirementRepository.save(entity);

      const event = new RequirementCreatedEventV1({
        eventId,
        requirementId,
        entityType: command.entityType,
        entityId: command.entityId,
        type: command.type,
        key: command.key,
        description: command.description,
        blocking: command.blocking,
        satisfied: false,
        targetEntityId: command.targetEntityId,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);

      if (this.eventBusService) {
        try {
          await this.eventBusService.publishEvent(event);
        } catch (publishError) {
          const err = publishError instanceof Error ? publishError.message : String(publishError);
          this.logger.warn(
            `Failed to publish RequirementCreatedEventV1 via EventBusService: ${err}`
          );
        }
      }

      await this.commandBus.execute(
        new EvaluateFormationCommand({
          entityType: command.entityType,
          entityId: command.entityId,
        })
      );

      return requirementId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to create requirement '${command.key}' for ${command.entityType}:${command.entityId}: ${err.message}`,
        err.stack
      );
      throw error;
    }
  }
}
