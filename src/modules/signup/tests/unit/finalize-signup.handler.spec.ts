import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventBus, CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../../core/event-bus';
import { ActorType } from '../../../actor/dto/actor.enums';
import { FinalizeSignUpCommand } from '../../commands/finalize-signup.command';
import { SignUpSessionStatus } from '../../dto/signup.enums';
import { SignUpSessionEntity } from '../../entities/signup-session.entity';
import { FinalizeSignUpCommandHandler } from '../../handlers/finalize-signup.handler';

describe('FinalizeSignUpCommandHandler', () => {
  let handler: FinalizeSignUpCommandHandler;
  let repository: Repository<SignUpSessionEntity>;
  let eventBus: EventBus;
  let commandBus: CommandBus;
  let eventBusService: EventBusService;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockCommandBus = {
    execute: jest.fn(),
  };

  const mockEventBusService = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinalizeSignUpCommandHandler,
        {
          provide: getRepositoryToken(SignUpSessionEntity),
          useValue: mockRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: EventBusService,
          useValue: mockEventBusService,
        },
      ],
    }).compile();

    handler = module.get<FinalizeSignUpCommandHandler>(FinalizeSignUpCommandHandler);
    repository = module.get<Repository<SignUpSessionEntity>>(
      getRepositoryToken(SignUpSessionEntity)
    );
    eventBus = module.get<EventBus>(EventBus);
    commandBus = module.get<CommandBus>(CommandBus);
    eventBusService = module.get<EventBusService>(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully finalize sign-up, create actor and emit events', async () => {
    const sessionId = uuidv4();
    const workspaceIds = [uuidv4()];
    const actorId = uuidv4();

    const session = SignUpSessionEntity.fromDomain({
      sessionId,
      status: SignUpSessionStatus.PARTIAL,
      actorType: ActorType.Rider,
      workspaceIds,
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashedpassword',
      roles: ['Rider'],
      linkedWallets: [],
      completedSteps: ['init', 'step1'],
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    });

    mockRepository.findOne.mockResolvedValue(session);
    mockCommandBus.execute.mockResolvedValue(actorId);

    const command = new FinalizeSignUpCommand({ sessionId });

    const result = await handler.execute(command);

    // Verify actor creation orchestration
    expect(commandBus.execute).toHaveBeenCalled();
    const createActorCommand = (commandBus.execute as jest.Mock).mock.calls[0][0];
    expect(createActorCommand.type).toBe(ActorType.Rider);
    expect(createActorCommand.workspaceId).toBe(workspaceIds[0]);

    // Verify session update
    expect(repository.save).toHaveBeenCalled();
    const saved = (repository.save as jest.Mock).mock.calls[0][0];
    expect(saved.status).toBe(SignUpSessionStatus.COMPLETED);

    // Verify result
    expect(result).toEqual({ actorId, workspaceId: workspaceIds[0] });

    // Verify events
    expect(eventBus.publish).toHaveBeenCalled();
    const event = (eventBus.publish as jest.Mock).mock.calls[0][0];
    expect(event.eventType).toBe('SignUpFinalizedEvent-V1');
    expect(event.sessionId).toBe(sessionId);
    expect(event.actorId).toBe(actorId);

    expect(eventBusService.publish).toHaveBeenCalled();
  });

  it('should throw NotFoundException if session does not exist', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    const command = new FinalizeSignUpCommand({ sessionId: uuidv4() });

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if session is EXPIRED', async () => {
    const session = { status: SignUpSessionStatus.EXPIRED };
    mockRepository.findOne.mockResolvedValue(session);
    const command = new FinalizeSignUpCommand({ sessionId: uuidv4() });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if session is COMPLETED', async () => {
    const session = { status: SignUpSessionStatus.COMPLETED };
    mockRepository.findOne.mockResolvedValue(session);
    const command = new FinalizeSignUpCommand({ sessionId: uuidv4() });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if workspaceIds is missing', async () => {
    const session = {
      status: SignUpSessionStatus.PARTIAL,
      actorType: ActorType.Rider,
      workspaceIds: [],
    };
    mockRepository.findOne.mockResolvedValue(session);
    const command = new FinalizeSignUpCommand({ sessionId: uuidv4() });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow(/missing mandatory field: workspaceIds/);
  });

  it('should throw BadRequestException if session is missing email', async () => {
    const session = {
      status: SignUpSessionStatus.PARTIAL,
      actorType: ActorType.Rider,
      workspaceIds: [uuidv4()],
      email: null,
      username: 'testuser',
      passwordHash: 'hashedpassword',
    };
    mockRepository.findOne.mockResolvedValue(session);
    const command = new FinalizeSignUpCommand({ sessionId: uuidv4() });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow(/missing mandatory field: email/);
  });

  it('should throw BadRequestException if session is missing username', async () => {
    const session = {
      status: SignUpSessionStatus.PARTIAL,
      actorType: ActorType.Rider,
      workspaceIds: [uuidv4()],
      email: 'test@example.com',
      username: null,
      passwordHash: 'hashedpassword',
    };
    mockRepository.findOne.mockResolvedValue(session);
    const command = new FinalizeSignUpCommand({ sessionId: uuidv4() });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow(/missing mandatory field: username/);
  });

  it('should throw BadRequestException if session is missing passwordHash', async () => {
    const session = {
      status: SignUpSessionStatus.PARTIAL,
      actorType: ActorType.Rider,
      workspaceIds: [uuidv4()],
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: null,
    };
    mockRepository.findOne.mockResolvedValue(session);
    const command = new FinalizeSignUpCommand({ sessionId: uuidv4() });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow(/missing mandatory field: passwordHash/);
  });

  it('should rethrow errors from CommandBus (Actor creation failure)', async () => {
    const session = {
      status: SignUpSessionStatus.PARTIAL,
      actorType: ActorType.Rider,
      workspaceIds: [uuidv4()],
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashedpassword',
      roles: [],
      linkedWallets: [],
    };
    mockRepository.findOne.mockResolvedValue(session);
    mockCommandBus.execute.mockRejectedValue(new Error('Workspace not found'));

    const command = new FinalizeSignUpCommand({ sessionId: uuidv4() });

    await expect(handler.execute(command)).rejects.toThrow('Workspace not found');
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
