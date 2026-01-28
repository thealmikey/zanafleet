import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../../core/event-bus';
import { PersonaEntity } from '../../../persona/entities/persona.entity';
import { GrantCapabilityToPersonaCommand } from '../../commands/grant-capability-to-persona.command';
import { CapabilityEntity } from '../../entities/capability.entity';
import { PersonaCapabilityEntity } from '../../entities/persona-capability.entity';
import { CapabilityGrantedToPersonaEventV1 } from '../../events/capability-granted-to-persona.event';
import { GrantCapabilityToPersonaCommandHandler } from '../../handlers/grant-capability-to-persona.handler';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

type CapabilityRepositoryMock = {
  findOne: jest.Mock<Promise<CapabilityEntity | null>, [unknown]>;
};

type PersonaRepositoryMock = {
  findOne: jest.Mock<Promise<PersonaEntity | null>, [unknown]>;
};

type PersonaCapabilityRepositoryMock = {
  save: jest.Mock<
    Promise<PersonaCapabilityEntity>,
    [PersonaCapabilityEntity]
  >;
};

type EventBusMock = {
  publish: jest.Mock<void, [unknown]>;
};

type EventBusServiceMock = {
  publish: jest.Mock<Promise<void>, [string, unknown]>;
};

const uuidMock = uuidv4 as unknown as jest.Mock<string, []>;

describe('GrantCapabilityToPersonaCommandHandler', () => {
  const PERSONA_ID = '11111111-1111-4111-8111-111111111111';
  const CAPABILITY_ID = '22222222-2222-4222-8222-222222222222';

  let capabilityRepository: CapabilityRepositoryMock;
  let personaRepository: PersonaRepositoryMock;
  let personaCapabilityRepository: PersonaCapabilityRepositoryMock;
  let eventBus: EventBusMock;
  let eventBusService: EventBusServiceMock;
  let handler: GrantCapabilityToPersonaCommandHandler;

  beforeEach(() => {
    capabilityRepository = {
      findOne: jest.fn(),
    };
    personaRepository = {
      findOne: jest.fn(),
    };
    personaCapabilityRepository = {
      save: jest.fn(async (entity) => entity),
    };
    eventBus = {
      publish: jest.fn(),
    };
    eventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    handler = new GrantCapabilityToPersonaCommandHandler(
      capabilityRepository as unknown as Repository<CapabilityEntity>,
      personaRepository as unknown as Repository<PersonaEntity>,
      personaCapabilityRepository as unknown as Repository<PersonaCapabilityEntity>,
      eventBus as unknown as EventBus,
      eventBusService as unknown as EventBusService,
    );

    uuidMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('grants capability when capability and persona exist', async () => {
    jest.useFakeTimers();
    const now = new Date('2024-01-01T00:00:00.000Z');
    jest.setSystemTime(now);

    capabilityRepository.findOne.mockResolvedValue({
      id: CAPABILITY_ID,
    } as CapabilityEntity);
    personaRepository.findOne.mockResolvedValue({
      id: PERSONA_ID,
    } as PersonaEntity);

    uuidMock.mockReturnValueOnce('event-uuid');

    const command = new GrantCapabilityToPersonaCommand({
      personaId: PERSONA_ID,
      capabilityId: CAPABILITY_ID,
    });

    await expect(handler.execute(command)).resolves.toBeUndefined();

    expect(capabilityRepository.findOne).toHaveBeenCalledWith({
      where: { id: CAPABILITY_ID },
    });
    expect(personaRepository.findOne).toHaveBeenCalledWith({
      where: { id: PERSONA_ID },
    });
    expect(personaCapabilityRepository.save).toHaveBeenCalledTimes(1);

    const savedEntity =
      personaCapabilityRepository.save.mock.calls[0][0] as PersonaCapabilityEntity;

    expect(savedEntity).toBeInstanceOf(PersonaCapabilityEntity);
    expect(savedEntity.personaId).toBe(PERSONA_ID);
    expect(savedEntity.capabilityId).toBe(CAPABILITY_ID);
    expect(savedEntity.grantedAt.toISOString()).toBe(now.toISOString());

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const emittedEvent =
      eventBus.publish.mock.calls[0][0] as CapabilityGrantedToPersonaEventV1;
    expect(emittedEvent).toBeInstanceOf(
      CapabilityGrantedToPersonaEventV1,
    );
    expect(emittedEvent.personaId).toBe(PERSONA_ID);
    expect(emittedEvent.capabilityId).toBe(CAPABILITY_ID);
    expect(emittedEvent.grantedAt.toISOString()).toBe(now.toISOString());
    expect(emittedEvent.eventId).toBe('event-uuid');

    expect(eventBusService.publish).toHaveBeenCalledWith(
      NatsSubjects.Capability.GRANTED_TO_PERSONA_V1,
      expect.any(CapabilityGrantedToPersonaEventV1),
    );
  });

  it('throws NotFoundException when capability does not exist', async () => {
    capabilityRepository.findOne.mockResolvedValue(null);

    const command = new GrantCapabilityToPersonaCommand({
      personaId: PERSONA_ID,
      capabilityId: CAPABILITY_ID,
    });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(personaRepository.findOne).not.toHaveBeenCalled();
    expect(personaCapabilityRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when persona does not exist', async () => {
    capabilityRepository.findOne.mockResolvedValue({
      id: CAPABILITY_ID,
    } as CapabilityEntity);
    personaRepository.findOne.mockResolvedValue(null);

    const command = new GrantCapabilityToPersonaCommand({
      personaId: PERSONA_ID,
      capabilityId: CAPABILITY_ID,
    });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(personaCapabilityRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('continues execution when NATS publish fails', async () => {
    jest.useFakeTimers();
    const now = new Date('2024-02-02T00:00:00.000Z');
    jest.setSystemTime(now);

    capabilityRepository.findOne.mockResolvedValue({
      id: CAPABILITY_ID,
    } as CapabilityEntity);
    personaRepository.findOne.mockResolvedValue({
      id: PERSONA_ID,
    } as PersonaEntity);
    eventBusService.publish.mockRejectedValueOnce(new Error('NATS failure'));

    uuidMock.mockReturnValueOnce('event-uuid');

    const command = new GrantCapabilityToPersonaCommand({
      personaId: PERSONA_ID,
      capabilityId: CAPABILITY_ID,
    });

    await expect(handler.execute(command)).resolves.toBeUndefined();

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBusService.publish).toHaveBeenCalledTimes(1);
  });

  it('does not attempt to publish to NATS when service is not provided', async () => {
    jest.useFakeTimers();
    const now = new Date('2024-03-03T00:00:00.000Z');
    jest.setSystemTime(now);

    capabilityRepository.findOne.mockResolvedValue({
      id: CAPABILITY_ID,
    } as CapabilityEntity);
    personaRepository.findOne.mockResolvedValue({
      id: PERSONA_ID,
    } as PersonaEntity);

    uuidMock.mockReturnValueOnce('event-uuid');

    const handlerWithoutNats = new GrantCapabilityToPersonaCommandHandler(
      capabilityRepository as unknown as Repository<CapabilityEntity>,
      personaRepository as unknown as Repository<PersonaEntity>,
      personaCapabilityRepository as unknown as Repository<PersonaCapabilityEntity>,
      eventBus as unknown as EventBus,
    );

    const command = new GrantCapabilityToPersonaCommand({
      personaId: PERSONA_ID,
      capabilityId: CAPABILITY_ID,
    });

    await expect(handlerWithoutNats.execute(command)).resolves.toBeUndefined();

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBusService.publish).not.toHaveBeenCalled();
  });
});
