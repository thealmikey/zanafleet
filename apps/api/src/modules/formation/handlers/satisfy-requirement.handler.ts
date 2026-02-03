import { EventBusService } from '@api/core/event-bus';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EvaluateFormationCommand } from '../commands/evaluate-formation.command';
import { SatisfyRequirementCommand } from '../commands/satisfy-requirement.command';
import { RequirementEntity } from '../entities/requirement.entity';
import { RequirementSatisfiedEventV1 } from '../events/requirement-satisfied.event';

@CommandHandler(SatisfyRequirementCommand)
@Injectable()
export class SatisfyRequirementCommandHandler
  implements ICommandHandler<SatisfyRequirementCommand, string>
{
  private readonly logger = new Logger(SatisfyRequirementCommandHandler.name);

  constructor(
    @InjectRepository(RequirementEntity)
    private readonly requirementRepository: Repository<RequirementEntity>,
    private readonly eventBus: EventBus,
    private readonly commandBus: CommandBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  async execute(command: SatisfyRequirementCommand): Promise<string> {
    const { requirementId } = command;

    this.logger.log(`Satisfying requirement ${requirementId}`);

    try {
      const requirement = await this.requirementRepository.findOne({
        where: { requirementId },
      });

      if (!requirement) {
        this.logger.warn(`Requirement not found: ${requirementId}`);
        throw new NotFoundException(`Requirement with ID '${requirementId}' does not exist`);
      }

      const now = new Date();
      requirement.satisfied = true;

      await this.requirementRepository.save(requirement);

      const event = new RequirementSatisfiedEventV1({
        eventId: uuidv4(),
        requirementId: requirement.requirementId,
        entityType: requirement.entityType,
        entityId: requirement.entityId,
        key: requirement.key,
        satisfiedAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);

      if (this.eventBusService) {
        try {
          await this.eventBusService.publishEvent(event);
        } catch (publishError) {
          const err = publishError instanceof Error ? publishError.message : String(publishError);
          this.logger.warn(
            `Failed to publish RequirementSatisfiedEventV1 via EventBusService: ${err}`
          );
        }
      }

      await this.commandBus.execute(
        new EvaluateFormationCommand({
          entityType: requirement.entityType,
          entityId: requirement.entityId,
        })
      );

      return requirement.requirementId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to satisfy requirement ${requirementId}: ${err.message}`,
        err.stack
      );
      throw error;
    }
  }
}
