import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService, NatsSubjects } from '../../../../core/event-bus';
import { CreateCapabilityCommand } from '../../commands/create-capability.command';
import { CapabilityEntity } from '../../entities/capability.entity';
import { CapabilityCreatedEventV1 } from '../../events/capability-created.event';
import { CreateCapabilityCommandHandler } from '../../handlers/create-capability.handler';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

type RepositoryMock = {
  save: jest.Mock<Promise<CapabilityEntity>, [CapabilityEntity]>;
};

type EventBusMock = {
  publish: jest.Mock<void, [unknown]>;
};

type EventBusServiceMock = {
  publish: jest.Mock<Promise<void>, [string, unknown]>;
};

describe('CreateCapabilityCommandHandler', () => {
  const uuidMock = uuidv4 as unknown as jest.Mock<string, []>;
  let repository: RepositoryMock;
  let eventBus: EventBusMock;
  let eventBusService: EventBusServiceMock;
  let handler: CreateCapabilityCommandHandler;

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

    handler = new CreateCapabilityCommandHandler(
      repository as unknown as Repository<CapabilityEntity>,
      eventBus as unknown as EventBus,
      eventBusService as unknown as EventBusService,
    );

    uuidMock.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('persists the capability and publishes events', async () => {
    uuidMock.mockReturnValueOnce('capability-uuid');
    uuidMock.mockReturnValueOnce('event-uuid');

    const command = new CreateCapabilityCommand({ name: 'manage_users' });

    const capabilityId = await handler.execute(command);

    expect(capabilityId).toBe('capability-uuid');
    expect(repository.save).toHaveBeenCalledTimes(1);

    const savedEntity = repository.save.mock.calls[0][0] ;
    expect(savedEntity).toBeInstanceOf(CapabilityEntity);
    expect(savedEntity).toMatchObject({
      id: 'capability-uuid',
      name: 'manage_users',
    });
    expect(savedEntity.createdAt).toBeInstanceOf(Date);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent =
      eventBus.publish.mock.calls[0][0] as CapabilityCreatedEventV1;
    expect(publishedEvent).toBeInstanceOf(CapabilityCreatedEventV1);
    expect(publishedEvent.capabilityId).toBe('capability-uuid');
    expect(publishedEvent.name).toBe('manage_users');
    expect(publishedEvent.createdAt).toBe(savedEntity.createdAt);

    expect(eventBusService.publish).toHaveBeenCalledWith(
      NatsSubjects.Capability.CREATED_V1,
      expect.any(CapabilityCreatedEventV1),
    );
  });

  it('continues execution when NATS publish fails', async () => {
    uuidMock.mockReturnValueOnce('capability-uuid');
    uuidMock.mockReturnValueOnce('event-uuid');

    eventBusService.publish.mockRejectedValueOnce(new Error('NATS failure'));

    const command = new CreateCapabilityCommand({ name: 'manage_users' });

    await expect(handler.execute(command)).resolves.toBe('capability-uuid');

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBusService.publish).toHaveBeenCalledTimes(1);
  });

  it('does not attempt to publish to NATS when service is not provided', async () => {
    handler = new CreateCapabilityCommandHandler(
      repository as unknown as Repository<CapabilityEntity>,
      eventBus as unknown as EventBus,
    );

    uuidMock.mockReturnValueOnce('capability-uuid');
    uuidMock.mockReturnValueOnce('event-uuid');

    const command = new CreateCapabilityCommand({ name: 'manage_users' });

    await expect(handler.execute(command)).resolves.toBe('capability-uuid');

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBusService.publish).not.toHaveBeenCalled();
  });
});
