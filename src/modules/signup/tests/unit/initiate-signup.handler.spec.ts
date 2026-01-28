import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { EventBusService } from '../../../../core/event-bus';
import { ActorType } from '../../../actor/dto/actor.enums';
import { InitiateSignUpCommand } from '../../commands/initiate-signup.command';
import { InitiateSignUpCommandHandler } from '../../handlers/initiate-signup.handler';
import { SignUpSessionEntity } from '../../entities/signup-session.entity';
import { SignUpSessionStatus } from '../../dto/signup.enums';

describe('InitiateSignUpCommandHandler', () => {
  let handler: InitiateSignUpCommandHandler;
  let repository: Repository<SignUpSessionEntity>;
  let eventBus: EventBus;
  let eventBusService: EventBusService;

  const mockRepository = {
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockEventBusService = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InitiateSignUpCommandHandler,
        {
          provide: getRepositoryToken(SignUpSessionEntity),
          useValue: mockRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: EventBusService,
          useValue: mockEventBusService,
        },
      ],
    }).compile();

    handler = module.get<InitiateSignUpCommandHandler>(
      InitiateSignUpCommandHandler,
    );
    repository = module.get<Repository<SignUpSessionEntity>>(
      getRepositoryToken(SignUpSessionEntity),
    );
    eventBus = module.get<EventBus>(EventBus);
    eventBusService = module.get<EventBusService>(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully initiate sign-up and emit events', async () => {
    const command = new InitiateSignUpCommand({
      actorType: ActorType.Rider,
      idempotencyKey: 'test-idempotency-key',
    });

    const sessionId = await handler.execute(command);

    // Verify session ID returned
    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');

    // Verify persistence
    expect(repository.save).toHaveBeenCalled();
    const savedEntity = (repository.save as jest.Mock).mock.calls[0][0];
    expect(savedEntity.status).toBe(SignUpSessionStatus.INITIATED);
    expect(savedEntity.actorType).toBe(ActorType.Rider);
    expect(savedEntity.idempotencyKey).toBe('test-idempotency-key');
    expect(savedEntity.expiresAt).toBeInstanceOf(Date);

    // Verify event publication
    expect(eventBus.publish).toHaveBeenCalled();
    expect(eventBusService.publish).toHaveBeenCalled();

    // Verify event payload
    const event = (eventBus.publish as jest.Mock).mock.calls[0][0];
    expect(event.eventType).toBe('SignUpInitiatedEvent-V1');
    expect(event.sessionId).toBe(sessionId);
    expect(event.actorType).toBe(ActorType.Rider);
  });

  it('should throw and not emit events if repository fails', async () => {
    const command = new InitiateSignUpCommand({
      actorType: ActorType.Internal,
    });

    jest
      .spyOn(repository, 'save')
      .mockRejectedValueOnce(new Error('Postgres connection failed'));

    await expect(handler.execute(command)).rejects.toThrow(
      'Postgres connection failed',
    );
    expect(eventBus.publish).not.toHaveBeenCalled();
    expect(eventBusService.publish).not.toHaveBeenCalled();
  });

  it('should successfully return sessionId even if NATS publication fails', async () => {
    const command = new InitiateSignUpCommand({
      actorType: ActorType.BusinessOwner,
    });

    jest
      .spyOn(eventBusService, 'publish')
      .mockRejectedValueOnce(new Error('NATS timed out'));

    const sessionId = await handler.execute(command);

    expect(sessionId).toBeDefined();
    expect(repository.save).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
    expect(eventBusService.publish).toHaveBeenCalled(); // Still tried to call it
  });
});
