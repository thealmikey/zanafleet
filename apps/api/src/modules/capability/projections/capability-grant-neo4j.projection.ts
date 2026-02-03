import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { CapabilityGrantedToPersonaEventV1 } from '../events/capability-granted-to-persona.event';

@EventsHandler(CapabilityGrantedToPersonaEventV1)
@Injectable()
export class CapabilityGrantNeo4jProjection
  implements IEventHandler<CapabilityGrantedToPersonaEventV1>
{
  private readonly logger = new Logger(CapabilityGrantNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async handle(event: CapabilityGrantedToPersonaEventV1): Promise<void> {
    this.logger.log(
      `Handling CapabilityGrantedToPersonaEvent-V1 for persona: ${event.personaId}, capability: ${event.capabilityId}`
    );

    const session = this.neo4j.getSession();

    try {
      await session.run(
        `
        MERGE (persona:Persona {id: $personaId})
        SET persona.updatedAt = datetime($occurredAt)
        MERGE (capability:Capability {id: $capabilityId})
        SET capability.updatedAt = datetime($occurredAt)
        MERGE (persona)-[rel:GRANTS]->(capability)
        SET rel.grantedAt = datetime($grantedAt)
        RETURN persona.id as personaId
        `,
        {
          personaId: event.personaId,
          capabilityId: event.capabilityId,
          grantedAt: event.grantedAt.toISOString(),
          occurredAt: event.occurredAt.toISOString(),
        }
      );

      this.logger.debug(
        `Projected capability grant to Neo4j: persona=${event.personaId}, capability=${event.capabilityId}`
      );
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to project capability grant to Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }
}
