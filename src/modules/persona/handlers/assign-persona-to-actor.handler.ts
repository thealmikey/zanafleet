import {
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
import { WorkspaceEntity } from '../../workspace/entities/workspace.entity';
import { AssignPersonaToActorCommand } from '../commands/assign-persona-to-actor.command';
import { ActorPersonaEntity } from '../entities/actor-persona.entity';
import { PersonaEntity } from '../entities/persona.entity';
import { PersonaAssignedToActorEventV1 } from '../events/persona-assigned-to-actor.event';

@CommandHandler(AssignPersonaToActorCommand)
@Injectable()
export class AssignPersonaToActorCommandHandler
  implements
    ICommandHandler<
      AssignPersonaToActorCommand,
      { actorId: string; workspaceId: string; personaId: string }
    >
{
  private readonly logger = new Logger(AssignPersonaToActorCommandHandler.name);

  constructor(
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(PersonaEntity)
    private readonly personaRepository: Repository<PersonaEntity>,
    @InjectRepository(ActorPersonaEntity)
    private readonly actorPersonaRepository: Repository<ActorPersonaEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async execute(
    command: AssignPersonaToActorCommand,
  ): Promise<{ actorId: string; workspaceId: string; personaId: string }> {
    const { actorId, workspaceId, personaId } = command;

    this.logger.log(
      `Executing AssignPersonaToActorCommand for actor: ${actorId}, workspace: ${workspaceId}, persona: ${personaId}`,
    );

    try {
      const actor = await this.actorRepository.findOne({
        where: { id: actorId },
      });

      if (!actor) {
        this.logger.warn(`Actor not found: ${actorId}`);
        throw new NotFoundException(
          `Actor with ID '${actorId}' does not exist`,
        );
      }

      const workspace = await this.workspaceRepository.findOne({
        where: { id: workspaceId },
      });

      if (!workspace) {
        this.logger.warn(`Workspace not found: ${workspaceId}`);
        throw new NotFoundException(
          `Workspace with ID '${workspaceId}' does not exist`,
        );
      }

      const persona = await this.personaRepository.findOne({
        where: { id: personaId },
      });

      if (!persona) {
        this.logger.warn(`Persona not found: ${personaId}`);
        throw new NotFoundException(
          `Persona with ID '${personaId}' does not exist`,
        );
      }

      const existingAssignment = await this.actorPersonaRepository.findOne({
        where: { actorId, workspaceId, personaId },
      });

      if (existingAssignment) {
        this.logger.warn(
          `Duplicate persona assignment detected for actor: ${actorId}, workspace: ${workspaceId}, persona: ${personaId}`,
        );
        throw new ConflictException(
          'Persona is already assigned to this actor within the specified workspace',
        );
      }

      const assignedAt = new Date();
      const entity = ActorPersonaEntity.fromDomain({
        actorId,
        workspaceId,
        personaId,
        assignedAt,
      });

      await this.actorPersonaRepository.save(entity);
      this.logger.debug(
        `ActorPersona persisted: actor=${actorId}, workspace=${workspaceId}, persona=${personaId}`,
      );

      const eventId = uuidv4();
      const event = new PersonaAssignedToActorEventV1({
        eventId,
        actorId,
        workspaceId,
        personaId,
        assignedAt,
        occurredAt: assignedAt,
      });

      this.eventBus.publish(event);
      this.logger.log(
        `PersonaAssignedToActorEvent-V1 emitted to event bus: ${eventId}`,
      );

      if (this.eventBusService) {
        try {
          await this.eventBusService.publish(
            'persona.assigned-to-actor.v1',
            event,
          );
        } catch (publishError) {
          const err =
            publishError instanceof Error
              ? publishError
              : new Error(String(publishError));
          this.logger.warn(`NATS publish failed: ${err.message}`);
        }
      }

      return { actorId, workspaceId, personaId };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to assign persona to actor: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }
}
