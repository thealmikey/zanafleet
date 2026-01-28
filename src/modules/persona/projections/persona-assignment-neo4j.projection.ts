import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Neo4jService } from '../../../core/neo4j';
import { PersonaAssignedToActorEventV1 } from '../events/persona-assigned-to-actor.event';

@EventsHandler(PersonaAssignedToActorEventV1)
@Injectable()
export class PersonaAssignmentNeo4jProjection
  implements IEventHandler<PersonaAssignedToActorEventV1>
{
  private readonly logger = new Logger(PersonaAssignmentNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async handle(event: PersonaAssignedToActorEventV1): Promise<void> {
    this.logger.log(
      `Handling PersonaAssignedToActorEvent-V1 for actor: ${event.actorId}, workspace: ${event.workspaceId}, persona: ${event.personaId}`,
    );

    const session = this.neo4j.getSession();

    try {
      await session.run(
        `
        MERGE (actor:Actor {id: $actorId})
        MERGE (persona:Persona {id: $personaId})
        SET persona.updatedAt = datetime($assignedAt)
        MERGE (workspace:Workspace {id: $workspaceId})
        MERGE (actor)-[rel:HAS_PERSONA]->(persona)
        SET rel.assignedAt = datetime($assignedAt)
        MERGE (persona)-[workspaceRel:IN_WORKSPACE]->(workspace)
        SET workspaceRel.assignedAt = datetime($assignedAt)
        RETURN actor.id as actorId
        `,
        {
          actorId: event.actorId,
          personaId: event.personaId,
          workspaceId: event.workspaceId,
          assignedAt: event.assignedAt.toISOString(),
        },
      );

      this.logger.debug(
        `Persona assignment relationships projected to Neo4j: actor=${event.actorId}, workspace=${event.workspaceId}, persona=${event.personaId}`,
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to project persona assignment to Neo4j: ${err.message}`,
        err.stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
