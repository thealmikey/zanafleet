import { Logger } from '@nestjs/common';

import { PersonaAssignedToActorEventV1 } from '../../events/persona-assigned-to-actor.event';
import { PersonaAssignmentNeo4jProjection } from '../../projections/persona-assignment-neo4j.projection';

type Neo4jSessionMock = {
  run: jest.Mock<Promise<unknown>, [string, Record<string, unknown>?]>;
  close: jest.Mock<Promise<void>, []>;
};

type Neo4jServiceMock = {
  getSession: jest.Mock<Neo4jSessionMock, []>;
};

describe('PersonaAssignmentNeo4jProjection', () => {
  let session: Neo4jSessionMock;
  let neo4jService: Neo4jServiceMock;
  let projection: PersonaAssignmentNeo4jProjection;

  const baseEvent = new PersonaAssignedToActorEventV1({
    eventId: 'event-uuid',
    actorId: 'actor-uuid',
    workspaceId: 'workspace-uuid',
    personaId: 'persona-uuid',
    assignedAt: new Date('2024-04-01T00:00:00.000Z'),
    occurredAt: new Date('2024-04-02T00:00:00.000Z'),
  });

  beforeEach(() => {
    session = {
      run: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
    neo4jService = {
      getSession: jest.fn().mockReturnValue(session),
    };
    projection = new PersonaAssignmentNeo4jProjection(neo4jService as unknown as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('projects PersonaAssignedToActorEventV1 into Neo4j with correct query and parameters', async () => {
    await projection.handle(baseEvent);

    expect(neo4jService.getSession).toHaveBeenCalledTimes(1);
    expect(session.run).toHaveBeenCalledWith(
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
        actorId: baseEvent.actorId,
        personaId: baseEvent.personaId,
        workspaceId: baseEvent.workspaceId,
        assignedAt: baseEvent.assignedAt.toISOString(),
      }
    );
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it('logs error and rethrows when session.run fails', async () => {
    const error = new Error('Neo4j failure');
    session.run.mockRejectedValueOnce(error);
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(projection.handle(baseEvent)).rejects.toBe(error);

    expect(errorSpy).toHaveBeenCalledWith(
      `Failed to project persona assignment to Neo4j: ${error.message}`,
      error.stack
    );
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it('always closes the session in finally block', async () => {
    session.run.mockRejectedValueOnce(new Error('unexpected'));

    await expect(projection.handle(baseEvent)).rejects.toThrow('unexpected');

    expect(session.close).toHaveBeenCalledTimes(1);
  });
});
