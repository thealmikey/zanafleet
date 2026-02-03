import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { PersonaEntity } from '@api/modules/persona/entities/persona.entity';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { GrantCapabilityToPersonaCommand } from '../commands/grant-capability-to-persona.command';
import { CapabilityEntity } from '../entities/capability.entity';
import { PersonaCapabilityEntity } from '../entities/persona-capability.entity';
import { CapabilityGrantedToPersonaEventV1 } from '../events/capability-granted-to-persona.event';

@CommandHandler(GrantCapabilityToPersonaCommand)
@Injectable()
export class GrantCapabilityToPersonaCommandHandler
  implements ICommandHandler<GrantCapabilityToPersonaCommand, void>
{
  private readonly logger = new Logger(GrantCapabilityToPersonaCommandHandler.name);

  constructor(
    @InjectRepository(CapabilityEntity)
    private readonly capabilityRepository: Repository<CapabilityEntity>,
    @InjectRepository(PersonaEntity)
    private readonly personaRepository: Repository<PersonaEntity>,
    @InjectRepository(PersonaCapabilityEntity)
    private readonly personaCapabilityRepository: Repository<PersonaCapabilityEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  async execute(command: GrantCapabilityToPersonaCommand): Promise<void> {
    this.logger.log(`Granting capability ${command.capabilityId} to persona ${command.personaId}`);

    const capability = await this.capabilityRepository.findOne({
      where: { id: command.capabilityId },
    });

    if (!capability) {
      this.logger.warn(`Capability not found for granting to persona: ${command.capabilityId}`);
      throw new NotFoundException(`Capability not found: ${command.capabilityId}`);
    }

    const persona = await this.personaRepository.findOne({
      where: { id: command.personaId },
    });

    if (!persona) {
      this.logger.warn(`Persona not found for capability grant: ${command.personaId}`);
      throw new NotFoundException(`Persona not found: ${command.personaId}`);
    }

    const eventId = uuidv4();
    const now = new Date();

    const personaCapability = PersonaCapabilityEntity.fromDomain({
      personaId: command.personaId,
      capabilityId: command.capabilityId,
      grantedAt: now,
    });

    const event = new CapabilityGrantedToPersonaEventV1({
      eventId,
      personaId: command.personaId,
      capabilityId: command.capabilityId,
      grantedAt: now,
      occurredAt: now,
    });

    try {
      await this.personaCapabilityRepository.save(personaCapability);

      this.logger.debug(
        `Capability ${command.capabilityId} granted to persona ${command.personaId} in PostgreSQL`
      );

      this.eventBus.publish(event);

      this.logger.log(
        `CapabilityGrantedToPersonaEvent-V1 emitted to internal event bus: ${eventId}`
      );

      if (this.eventBusService) {
        try {
          await this.eventBusService.publish(NatsSubjects.Capability.GRANTED_TO_PERSONA_V1, event);
        } catch (publishError: unknown) {
          const err =
            publishError instanceof Error ? publishError : new Error(String(publishError));
          this.logger.warn(`NATS publish failed: ${err.message}`);
        }
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to grant capability to persona: ${err.message}`, err.stack);
      throw err;
    }
  }
}
