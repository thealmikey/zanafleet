import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../../core/event-bus';
import { ActorEntity } from '../../../actor/entities/actor.entity';
import { WorkspaceEntity } from '../../../workspace/entities/workspace.entity';
import { AssignPersonaToActorCommand } from '../../commands/assign-persona-to-actor.command';
import { ActorPersonaEntity } from '../../entities/actor-persona.entity';
import { PersonaEntity } from '../../entities/persona.entity';
import { PersonaAssignedToActorEventV1 } from '../../events/persona-assigned-to-actor.event';
import { AssignPersonaToActorCommandHandler } from '../../handlers/assign-persona-to-actor.handler';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

type ActorRepositoryMock = {
  findOne: jest.Mock<Promise<ActorEntity | null>, [unknown]>;
};

type WorkspaceRepositoryMock = {
  findOne: jest.Mock<Promise<WorkspaceEntity | null>, [unknown]>;
};

type PersonaRepositoryMock = {
  findOne: jest.Mock<Promise<PersonaEntity | null>, [unknown]>;
};

type ActorPersonaRepositoryMock = {
  findOne: jest.Mock<Promise<ActorPersonaEntity | null>, [unknown]>;
  save: jest.Mock<Promise<ActorPersonaEntity>, [ActorPersonaEntity]>;
};

type EventBusMock = {
  publish: jest.Mock<void, [unknown]>;
};

type EventBusServiceMock = {
  publish: jest.Mock<Promise<void>, [string, unknown]>;
};

const uuidMock = uuidv4 as unknown as jest.Mock<string, []>;

describe('AssignPersonaToActorCommandHandler', () => {
  const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
  const WORKSPACE_ID = '22222222-2222-4222-8222-222222222222';
  const PERSONA_ID = '33333333-3333-4333-8333-333333333333';

  let actorRepository: ActorRepositoryMock;
  let workspaceRepository: WorkspaceRepositoryMock;
  let personaRepository: PersonaRepositoryMock;
  let actorPersonaRepository: ActorPersonaRepositoryMock;
  let eventBus: EventBusMock;
  let eventBusService: EventBusServiceMock;
  let handler: AssignPersonaToActorCommandHandler;

  beforeEach(() => {
    actorRepository = {
      findOne: jest.fn(),
    };
    workspaceRepository = {
      findOne: jest.fn(),
    };
    personaRepository = {
      findOne: jest.fn(),
    };
    actorPersonaRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (entity) => entity),
    };
    eventBus = {
      publish: jest.fn(),
    };
    eventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    handler = new AssignPersonaToActorCommandHandler(
      actorRepository as unknown as Repository<ActorEntity>,
      workspaceRepository as unknown as Repository<WorkspaceEntity>,
      personaRepository as unknown as Repository<PersonaEntity>,
      actorPersonaRepository as unknown as Repository<ActorPersonaEntity>,
      eventBus as unknown as EventBus,
      eventBusService as unknown as EventBusService,
    );

    uuidMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('successfully assigns a persona when actor, workspace, and persona exist', async () => {
    jest.useFakeTimers();
    const now = new Date('2024-04-01T00:00:00.000Z');
    jest.setSystemTime(now);

    actorRepository.findOne.mockResolvedValue({
      id: ACTOR_ID,
    } as ActorEntity);
    workspaceRepository.findOne.mockResolvedValue({
      id: WORKSPACE_ID,
    } as WorkspaceEntity);
    personaRepository.findOne.mockResolvedValue({
      id: PERSONA_ID,
    } as PersonaEntity);
    actorPersonaRepository.findOne.mockResolvedValue(null);

    uuidMock.mockReturnValueOnce('event-uuid');

    const command = new AssignPersonaToActorCommand({
      actorId: ACTOR_ID,
      workspaceId: WORKSPACE_ID,
      personaId: PERSONA_ID,
    });

    await expect(handler.execute(command)).resolves.toEqual({
      actorId: ACTOR_ID,
      workspaceId: WORKSPACE_ID,
      personaId: PERSONA_ID,
    });

    expect(actorRepository.findOne).toHaveBeenCalledWith({
      where: { id: ACTOR_ID },
    });
    expect(workspaceRepository.findOne).toHaveBeenCalledWith({
      where: { id: WORKSPACE_ID },
    });
    expect(personaRepository.findOne).toHaveBeenCalledWith({
      where: { id: PERSONA_ID },
    });
    expect(actorPersonaRepository.findOne).toHaveBeenCalledWith({
      where: { actorId: ACTOR_ID, workspaceId: WORKSPACE_ID, personaId: PERSONA_ID },
    });

    expect(actorPersonaRepository.save).toHaveBeenCalledTimes(1);
    const savedEntity =
      actorPersonaRepository.save.mock.calls[0][0] as ActorPersonaEntity;
    expect(savedEntity).toBeInstanceOf(ActorPersonaEntity);
    expect(savedEntity.actorId).toBe(ACTOR_ID);
    expect(savedEntity.workspaceId).toBe(WORKSPACE_ID);
    expect(savedEntity.personaId).toBe(PERSONA_ID);
    expect(savedEntity.assignedAt.toISOString()).toBe(now.toISOString());

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent =
      eventBus.publish.mock.calls[0][0] as PersonaAssignedToActorEventV1;
    expect(publishedEvent).toBeInstanceOf(PersonaAssignedToActorEventV1);
    expect(publishedEvent.actorId).toBe(ACTOR_ID);
    expect(publishedEvent.workspaceId).toBe(WORKSPACE_ID);
    expect(publishedEvent.personaId).toBe(PERSONA_ID);
    expect(publishedEvent.assignedAt.toISOString()).toBe(now.toISOString());
    expect(publishedEvent.eventId).toBe('event-uuid');

    expect(eventBusService.publish).toHaveBeenCalledWith(
      'persona.assigned-to-actor.v1',
      expect.any(PersonaAssignedToActorEventV1),
    );
  });

  it('throws NotFoundException when actor does not exist', async () => {
    actorRepository.findOne.mockResolvedValue(null);

    const command = new AssignPersonaToActorCommand({
      actorId: ACTOR_ID,
      workspaceId: WORKSPACE_ID,
      personaId: PERSONA_ID,
    });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(NotFoundException);

    expect(workspaceRepository.findOne).not.toHaveBeenCalled();
    expect(personaRepository.findOne).not.toHaveBeenCalled();
    expect(actorPersonaRepository.findOne).not.toHaveBeenCalled();
    expect(actorPersonaRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
    expect(eventBusService.publish).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when workspace does not exist', async () => {
    actorRepository.findOne.mockResolvedValue({ id: ACTOR_ID } as ActorEntity);
    workspaceRepository.findOne.mockResolvedValue(null);

    const command = new AssignPersonaToActorCommand({
      actorId: ACTOR_ID,
      workspaceId: WORKSPACE_ID,
      personaId: PERSONA_ID,
    });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(NotFoundException);

    expect(personaRepository.findOne).not.toHaveBeenCalled();
    expect(actorPersonaRepository.findOne).not.toHaveBeenCalled();
    expect(actorPersonaRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
    expect(eventBusService.publish).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when persona does not exist', async () => {
    actorRepository.findOne.mockResolvedValue({ id: ACTOR_ID } as ActorEntity);
    workspaceRepository.findOne.mockResolvedValue({
      id: WORKSPACE_ID,
    } as WorkspaceEntity);
    personaRepository.findOne.mockResolvedValue(null);

    const command = new AssignPersonaToActorCommand({
      actorId: ACTOR_ID,
      workspaceId: WORKSPACE_ID,
      personaId: PERSONA_ID,
    });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(NotFoundException);

    expect(actorPersonaRepository.findOne).not.toHaveBeenCalled();
    expect(actorPersonaRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
    expect(eventBusService.publish).not.toHaveBeenCalled();
  });

  it('throws ConflictException when assignment already exists', async () => {
    actorRepository.findOne.mockResolvedValue({ id: ACTOR_ID } as ActorEntity);
    workspaceRepository.findOne.mockResolvedValue({
      id: WORKSPACE_ID,
    } as WorkspaceEntity);
    personaRepository.findOne.mockResolvedValue({
      id: PERSONA_ID,
    } as PersonaEntity);
    actorPersonaRepository.findOne.mockResolvedValue({
      actorId: ACTOR_ID,
      workspaceId: WORKSPACE_ID,
      personaId: PERSONA_ID,
    } as ActorPersonaEntity);

    const command = new AssignPersonaToActorCommand({
      actorId: ACTOR_ID,
      workspaceId: WORKSPACE_ID,
      personaId: PERSONA_ID,
    });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(ConflictException);

    expect(actorPersonaRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
    expect(eventBusService.publish).not.toHaveBeenCalled();
  });

  it('continues execution when NATS publish fails', async () => {
    jest.useFakeTimers();
    const now = new Date('2024-05-05T00:00:00.000Z');
    jest.setSystemTime(now);

    actorRepository.findOne.mockResolvedValue({ id: ACTOR_ID } as ActorEntity);
    workspaceRepository.findOne.mockResolvedValue({
      id: WORKSPACE_ID,
    } as WorkspaceEntity);
    personaRepository.findOne.mockResolvedValue({
      id: PERSONA_ID,
    } as PersonaEntity);
    actorPersonaRepository.findOne.mockResolvedValue(null);
    eventBusService.publish.mockRejectedValueOnce(new Error('NATS failure'));

    uuidMock.mockReturnValueOnce('event-uuid');

    const command = new AssignPersonaToActorCommand({
      actorId: ACTOR_ID,
      workspaceId: WORKSPACE_ID,
      personaId: PERSONA_ID,
    });

    await expect(handler.execute(command)).resolves.toEqual({
      actorId: ACTOR_ID,
      workspaceId: WORKSPACE_ID,
      personaId: PERSONA_ID,
    });

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBusService.publish).toHaveBeenCalledTimes(1);
  });

  it('does not attempt NATS publish when EventBusService is not provided', async () => {
    jest.useFakeTimers();
    const now = new Date('2024-06-06T00:00:00.000Z');
    jest.setSystemTime(now);

    actorRepository.findOne.mockResolvedValue({ id: ACTOR_ID } as ActorEntity);
    workspaceRepository.findOne.mockResolvedValue({
      id: WORKSPACE_ID,
    } as WorkspaceEntity);
    personaRepository.findOne.mockResolvedValue({
      id: PERSONA_ID,
    } as PersonaEntity);
    actorPersonaRepository.findOne.mockResolvedValue(null);

    uuidMock.mockReturnValueOnce('event-uuid');

    const handlerWithoutEventBusService = new AssignPersonaToActorCommandHandler(
      actorRepository as unknown as Repository<ActorEntity>,
      workspaceRepository as unknown as Repository<WorkspaceEntity>,
      personaRepository as unknown as Repository<PersonaEntity>,
      actorPersonaRepository as unknown as Repository<ActorPersonaEntity>,
      eventBus as unknown as EventBus,
    );

    const command = new AssignPersonaToActorCommand({
      actorId: ACTOR_ID,
      workspaceId: WORKSPACE_ID,
      personaId: PERSONA_ID,
    });

    await expect(handlerWithoutEventBusService.execute(command)).resolves.toEqual({
      actorId: ACTOR_ID,
      workspaceId: WORKSPACE_ID,
      personaId: PERSONA_ID,
    });

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBusService.publish).not.toHaveBeenCalled();
  });
});
