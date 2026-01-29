import { Logger } from '@nestjs/common';

import { PersonaCreatedEventV1 } from '../../events/persona-created.event';
import {
  PersonaNeo4jInitializer,
  PersonaNeo4jProjection,
} from '../../projections/persona-neo4j.projection';

type Neo4jSessionMock = {
  run: jest.Mock<Promise<unknown>, [string, Record<string, unknown>?]>;
  close: jest.Mock<Promise<void>, []>;
};

type Neo4jServiceMock = {
  getSession: jest.Mock<Neo4jSessionMock, []>;
};

describe('PersonaNeo4jProjection', () => {
  let session: Neo4jSessionMock;
  let neo4jService: Neo4jServiceMock;
  let projection: PersonaNeo4jProjection;

  const baseEvent = new PersonaCreatedEventV1({
    eventId: 'event-uuid',
    personaId: 'persona-uuid',
    name: 'Support Agent',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    occurredAt: new Date('2024-01-02T00:00:00.000Z'),
  });

  beforeEach(() => {
    session = {
      run: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
    neo4jService = {
      getSession: jest.fn().mockReturnValue(session),
    };
    projection = new PersonaNeo4jProjection(neo4jService as unknown as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('projects PersonaCreatedEventV1 into Neo4j with correct parameters', async () => {
    await projection.handle(baseEvent);

    expect(neo4jService.getSession).toHaveBeenCalledTimes(1);
    expect(session.run).toHaveBeenCalledWith(
      `
        MERGE (persona:Persona {id: $personaId})
        SET
          persona.name = $name,
          persona.createdAt = datetime($createdAt),
          persona.updatedAt = datetime($updatedAt)
        RETURN persona.id as id
        `,
      {
        personaId: baseEvent.personaId,
        name: baseEvent.name,
        createdAt: baseEvent.createdAt.toISOString(),
        updatedAt: baseEvent.occurredAt.toISOString(),
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
      `Failed to project persona to Neo4j: ${error.message}`,
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

describe('PersonaNeo4jInitializer', () => {
  let session: Neo4jSessionMock;
  let neo4jService: Neo4jServiceMock;
  let initializer: PersonaNeo4jInitializer;

  beforeEach(() => {
    session = {
      run: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
    neo4jService = {
      getSession: jest.fn().mockReturnValue(session),
    };
    initializer = new PersonaNeo4jInitializer(neo4jService as unknown as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates constraint and indexes for Persona nodes', async () => {
    await initializer.initialize();

    expect(neo4jService.getSession).toHaveBeenCalledTimes(1);
    expect(session.run).toHaveBeenNthCalledWith(
      1,
      `CREATE CONSTRAINT persona_id_unique IF NOT EXISTS
         FOR (persona:Persona) REQUIRE persona.id IS UNIQUE`
    );
    expect(session.run).toHaveBeenNthCalledWith(
      2,
      `CREATE INDEX persona_name_index IF NOT EXISTS
         FOR (persona:Persona) ON (persona.name)`
    );
    expect(session.run).toHaveBeenNthCalledWith(
      3,
      `CREATE INDEX persona_createdAt_index IF NOT EXISTS
         FOR (persona:Persona) ON (persona.createdAt)`
    );
    expect(session.run).toHaveBeenNthCalledWith(
      4,
      `CREATE INDEX persona_updatedAt_index IF NOT EXISTS
         FOR (persona:Persona) ON (persona.updatedAt)`
    );
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it('logs error and rethrows when schema initialization fails', async () => {
    const error = new Error('constraint failure');
    session.run.mockRejectedValueOnce(error);
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(initializer.initialize()).rejects.toBe(error);

    expect(errorSpy).toHaveBeenCalledWith(
      `Failed to initialize Persona Neo4j constraints/indexes: ${error.message}`,
      error.stack
    );
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it('always closes the session in finally block', async () => {
    session.run.mockRejectedValueOnce(new Error('unexpected failure'));

    await expect(initializer.initialize()).rejects.toThrow('unexpected failure');

    expect(session.close).toHaveBeenCalledTimes(1);
  });
});
