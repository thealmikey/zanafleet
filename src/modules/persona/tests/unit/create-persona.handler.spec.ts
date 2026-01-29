import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../../core/event-bus';
import { CreatePersonaCommand } from '../../commands/create-persona.command';
import { PersonaEntity } from '../../entities/persona.entity';
import { PersonaCreatedEventV1 } from '../../events/persona-created.event';
import { CreatePersonaCommandHandler } from '../../handlers/create-persona.handler';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

type RepositoryMock = {
  save: jest.Mock<Promise<PersonaEntity>, [PersonaEntity]>;
};

type EventBusMock = {
  publish: jest.Mock<void, [unknown]>;
};

type EventBusServiceMock = {
  publish: jest.Mock<Promise<void>, [string, unknown]>;
};

describe('CreatePersonaCommandHandler', () => {
  const uuidMock = uuidv4 as unknown as jest.Mock<string, []>;
  let repository: RepositoryMock;
  let eventBus: EventBusMock;
  let eventBusService: EventBusServiceMock;
  let handler: CreatePersonaCommandHandler;
  let fromDomainSpy: jest.SpyInstance<
    PersonaEntity,
    [
      {
        personaId: string;
        name: string;
        createdAt: Date;
      }
    ]
  >;

  beforeEach(() => {
    repository = {
      save: jest.fn(async (entity) => entity),
    };
    eventBus = {
      publish: jest.fn(),
    };
    eventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    handler = new CreatePersonaCommandHandler(
      repository as unknown as Repository<PersonaEntity>,
      eventBus as unknown as EventBus,
      eventBusService as unknown as EventBusService
    );

    fromDomainSpy = jest.spyOn(PersonaEntity, 'fromDomain');
    uuidMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    fromDomainSpy.mockRestore();
  });

  it('persists the persona and publishes events', async () => {
    jest.useFakeTimers();
    const now = new Date('2024-01-01T00:00:00.000Z');
    jest.setSystemTime(now);

    uuidMock.mockReturnValueOnce('persona-uuid');
    uuidMock.mockReturnValueOnce('event-uuid');

    const command = new CreatePersonaCommand({ name: 'Support Agent' });

    const personaId = await handler.execute(command);

    expect(personaId).toBe('persona-uuid');

    expect(fromDomainSpy).toHaveBeenCalledWith({
      personaId: 'persona-uuid',
      name: 'Support Agent',
      createdAt: now,
    });

    expect(repository.save).toHaveBeenCalledTimes(1);
    const savedEntity = repository.save.mock.calls[0][0];
    expect(savedEntity).toBeInstanceOf(PersonaEntity);
    expect(savedEntity.id).toBe('persona-uuid');
    expect(savedEntity.name).toBe('Support Agent');
    expect(savedEntity.createdAt.toISOString()).toBe(now.toISOString());

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = eventBus.publish.mock.calls[0][0] as PersonaCreatedEventV1;
    expect(publishedEvent).toBeInstanceOf(PersonaCreatedEventV1);
    expect(publishedEvent.personaId).toBe('persona-uuid');
    expect(publishedEvent.name).toBe('Support Agent');
    expect(publishedEvent.createdAt.toISOString()).toBe(now.toISOString());
    expect(publishedEvent.eventId).toBe('event-uuid');

    expect(eventBusService.publish).toHaveBeenCalledWith(
      'persona.created.v1',
      expect.any(PersonaCreatedEventV1)
    );
  });

  it('continues execution when NATS publish fails', async () => {
    jest.useFakeTimers();
    const now = new Date('2024-02-02T00:00:00.000Z');
    jest.setSystemTime(now);

    uuidMock.mockReturnValueOnce('persona-uuid');
    uuidMock.mockReturnValueOnce('event-uuid');

    eventBusService.publish.mockRejectedValueOnce(new Error('NATS failure'));

    const command = new CreatePersonaCommand({ name: 'Support Agent' });

    await expect(handler.execute(command)).resolves.toBe('persona-uuid');

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBusService.publish).toHaveBeenCalledTimes(1);
  });

  it('does not attempt to publish to NATS when service is not provided', async () => {
    jest.useFakeTimers();
    const now = new Date('2024-03-03T00:00:00.000Z');
    jest.setSystemTime(now);

    handler = new CreatePersonaCommandHandler(
      repository as unknown as Repository<PersonaEntity>,
      eventBus as unknown as EventBus
    );

    uuidMock.mockReturnValueOnce('persona-uuid');
    uuidMock.mockReturnValueOnce('event-uuid');

    const command = new CreatePersonaCommand({ name: 'Support Agent' });

    await expect(handler.execute(command)).resolves.toBe('persona-uuid');

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBusService.publish).not.toHaveBeenCalled();
  });
});
