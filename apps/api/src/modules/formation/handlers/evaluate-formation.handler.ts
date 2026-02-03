import { EventBusService } from '@api/core/event-bus';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EvaluateFormationCommand } from '../commands/evaluate-formation.command';
import { FormationState } from '../dto/formation.enums';
import { FormationStatusEntity } from '../entities/formation-status.entity';
import { RequirementEntity } from '../entities/requirement.entity';
import { FormationStatusChangedEventV1 } from '../events/formation-status-changed.event';
import { FormationService } from '../services/formation.service';

type RequirementDomain = ReturnType<RequirementEntity['toDomain']>;

@CommandHandler(EvaluateFormationCommand)
@Injectable()
export class EvaluateFormationCommandHandler
  implements
    ICommandHandler<
      EvaluateFormationCommand,
      {
        entityType: string;
        entityId: string;
        state: FormationState;
        unsatisfiedRequirements: RequirementDomain[];
      }
    >
{
  private readonly logger = new Logger(EvaluateFormationCommandHandler.name);

  constructor(
    private readonly formationService: FormationService,
    @InjectRepository(FormationStatusEntity)
    private readonly formationStatusRepository: Repository<FormationStatusEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  async execute(command: EvaluateFormationCommand): Promise<{
    entityType: string;
    entityId: string;
    state: FormationState;
    unsatisfiedRequirements: RequirementDomain[];
  }> {
    const { entityType, entityId } = command;

    this.logger.log(`Evaluating formation state for ${entityType}:${entityId}`);

    try {
      const existingStatus = await this.formationStatusRepository.findOne({
        where: { entityType, entityId },
      });

      const state = await this.formationService.evaluateState(entityType, entityId);

      const unsatisfiedRequirements = await this.formationService.getUnsatisfiedRequirements(
        entityType,
        entityId
      );

      const previousState = existingStatus?.state ?? FormationState.DRAFT;
      const now = new Date();
      let statusEntity: FormationStatusEntity;

      if (existingStatus) {
        existingStatus.state = state;
        existingStatus.lastEvaluatedAt = now;
        statusEntity = existingStatus;
      } else {
        statusEntity = FormationStatusEntity.fromDomain({
          formationStatusId: uuidv4(),
          entityType,
          entityId,
          state,
          lastEvaluatedAt: now,
        });
      }

      await this.formationStatusRepository.save(statusEntity);

      if (state !== previousState) {
        const event = new FormationStatusChangedEventV1({
          eventId: uuidv4(),
          entityType,
          entityId,
          previousState,
          newState: state,
          occurredAt: now,
        });

        this.eventBus.publish(event);

        if (this.eventBusService) {
          try {
            await this.eventBusService.publishEvent(event);
          } catch (publishError) {
            const err = publishError instanceof Error ? publishError.message : String(publishError);
            this.logger.warn(
              `Failed to publish FormationStatusChangedEventV1 via EventBusService: ${err}`
            );
          }
        }
      }

      return {
        entityType,
        entityId,
        state,
        unsatisfiedRequirements: unsatisfiedRequirements.map((requirement) =>
          requirement.toDomain()
        ),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to evaluate formation state for ${entityType}:${entityId}: ${err.message}`,
        err.stack
      );
      throw error;
    }
  }
}
