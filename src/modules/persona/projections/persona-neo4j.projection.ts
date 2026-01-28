import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Neo4jService } from '../../../core/neo4j';
import { PersonaCreatedEventV1 } from '../events/persona-created.event';

@EventsHandler(PersonaCreatedEventV1)
@Injectable()
export class PersonaNeo4jProjection
  implements IEventHandler<PersonaCreatedEventV1>
{
  private readonly logger = new Logger(PersonaNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async handle(event: PersonaCreatedEventV1): Promise<void> {
    this.logger.log(
      `Handling PersonaCreatedEvent-V1 for persona: ${event.personaId}`,
    );

    const session = this.neo4j.getSession();

    try {
      await session.run(
        `
        MERGE (persona:Persona {id: $personaId})
        SET
          persona.name = $name,
          persona.createdAt = datetime($createdAt),
          persona.updatedAt = datetime($updatedAt)
        RETURN persona.id as id
        `,
        {
          personaId: event.personaId,
          name: event.name,
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.occurredAt.toISOString(),
        },
      );

      this.logger.debug(
        `Persona node created/updated in Neo4j: ${event.personaId}`,
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to project persona to Neo4j: ${err.message}`,
        err.stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}

@Injectable()
export class PersonaNeo4jInitializer {
  private readonly logger = new Logger(PersonaNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async initialize(): Promise<void> {
    const session = this.neo4j.getSession();

    try {
      await session.run(
        `CREATE CONSTRAINT persona_id_unique IF NOT EXISTS
         FOR (persona:Persona) REQUIRE persona.id IS UNIQUE`,
      );
      this.logger.log('UNIQUE constraint on Persona.id created');

      await session.run(
        `CREATE INDEX persona_name_index IF NOT EXISTS
         FOR (persona:Persona) ON (persona.name)`,
      );
      this.logger.log('Index on Persona.name created');

      await session.run(
        `CREATE INDEX persona_createdAt_index IF NOT EXISTS
         FOR (persona:Persona) ON (persona.createdAt)`,
      );
      this.logger.log('Index on Persona.createdAt created');

      await session.run(
        `CREATE INDEX persona_updatedAt_index IF NOT EXISTS
         FOR (persona:Persona) ON (persona.updatedAt)`,
      );
      this.logger.log('Index on Persona.updatedAt created');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to initialize Persona Neo4j constraints/indexes: ${err.message}`,
        err.stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
