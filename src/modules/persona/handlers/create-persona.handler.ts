import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EventBusService } from '../../../core/event-bus';
import { CreatePersonaCommand } from '../commands/create-persona.command';
import { PersonaEntity } from '../entities/persona.entity';
import { PersonaCreatedEventV1 } from '../events/persona-created.event';

@CommandHandler(CreatePersonaCommand)
@Injectable()
export class CreatePersonaCommandHandler
  implements ICommandHandler<CreatePersonaCommand>
{
  private readonly logger = new Logger(CreatePersonaCommandHandler.name);

  constructor(
    @InjectRepository(PersonaEntity)
    private readonly personaRepository: Repository<PersonaEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async execute(command: CreatePersonaCommand): Promise<string> {
    const personaId = uuidv4();
    const now = new Date();
    const eventId = uuidv4();

    this.logger.log(
      `Executing CreatePersonaCommand for persona: ${personaId}`,
    );

    try {
      const entity = PersonaEntity.fromDomain({
        personaId,
        name: command.name,
        createdAt: now,
      });

      await this.personaRepository.save(entity);
      this.logger.debug(`Persona persisted to PostgreSQL: ${personaId}`);

      const event = new PersonaCreatedEventV1({
        eventId,
        personaId,
        name: command.name,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(
        `PersonaCreatedEvent-V1 emitted to event bus: ${eventId}`,
      );

      if (this.eventBusService) {
        try {
          await this.eventBusService.publish('persona.created.v1', event);
        } catch (publishError) {
          const err =
            publishError instanceof Error
              ? publishError
              : new Error(String(publishError));
          this.logger.warn(`NATS publish failed: ${err.message}`);
        }
      }

      return personaId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to create persona: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }
}
