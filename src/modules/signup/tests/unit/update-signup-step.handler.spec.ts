import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../../core/event-bus';
import { ActorType } from '../../../actor/dto/actor.enums';
import { UpdateSignUpStepCommand } from '../../commands/update-signup-step.command';
import { SignUpSessionStatus } from '../../dto/signup.enums';
import { SignUpSessionEntity } from '../../entities/signup-session.entity';
import { UpdateSignUpStepCommandHandler } from '../../handlers/update-signup-step.handler';

describe('UpdateSignUpStepCommandHandler', () => {
  let handler: UpdateSignUpStepCommandHandler;
  let repository: Repository<SignUpSessionEntity>;
  let eventBus: EventBus;
  let eventBusService: EventBusService;

  const mockRepository = {
    findOne: jest.fn(),
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
        UpdateSignUpStepCommandHandler,
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

    handler = module.get<UpdateSignUpStepCommandHandler>(
      UpdateSignUpStepCommandHandler,
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

  it('should successfully update session and emit event', async () => {
    const sessionId = uuidv4();
    const workspaceId = uuidv4();
    const session = SignUpSessionEntity.fromDomain({
      sessionId,
      status: SignUpSessionStatus.INITIATED,
      actorType: ActorType.Rider,
      roles: [],
      linkedWallets: [],
      completedSteps: [],
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    });

    mockRepository.findOne.mockResolvedValue(session);

    const command = new UpdateSignUpStepCommand({
      sessionId,
      stepName: 'work-info',
      workspaceId,
      roles: ['Rider'],
      linkedWallets: [],
      idempotencyKey: 'key-1',
    });

    await handler.execute(command);

    // Verify persistence
    expect(repository.save).toHaveBeenCalled();
    const saved = (repository.save as jest.Mock).mock.calls[0][0];
    expect(saved.workspaceId).toBe(workspaceId);
    expect(saved.roles).toEqual(['Rider']);
    expect(saved.completedSteps).toContain('work-info');
    expect(saved.status).toBe(SignUpSessionStatus.PARTIAL);
    expect(saved.idempotencyKey).toBe('key-1');

    // Verify events
    expect(eventBus.publish).toHaveBeenCalled();
    expect(eventBusService.publish).toHaveBeenCalled();

    const event = (eventBus.publish as jest.Mock).mock.calls[0][0];
    expect(event.eventType).toBe('SignUpStepCompletedEvent-V1');
    expect(event.sessionId).toBe(sessionId);
    expect(event.stepName).toBe('work-info');
    expect(event.changes).toHaveProperty('workspaceId', workspaceId);
  });

  it('should throw NotFoundException if session does not exist', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    const command = new UpdateSignUpStepCommand({
      sessionId: uuidv4(),
      stepName: 'test',
      roles: [],
      linkedWallets: [],
    });

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if session is EXPIRED', async () => {
    const session = { status: SignUpSessionStatus.EXPIRED };
    mockRepository.findOne.mockResolvedValue(session);
    const command = new UpdateSignUpStepCommand({
      sessionId: uuidv4(),
      stepName: 'test',
      roles: [],
      linkedWallets: [],
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if session is COMPLETED', async () => {
    const session = { status: SignUpSessionStatus.COMPLETED };
    mockRepository.findOne.mockResolvedValue(session);
    const command = new UpdateSignUpStepCommand({
      sessionId: uuidv4(),
      stepName: 'test',
      roles: [],
      linkedWallets: [],
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should return early without error if idempotencyKey matches and no changes', async () => {
    const sessionId = uuidv4();
    const session = SignUpSessionEntity.fromDomain({
      sessionId,
      status: SignUpSessionStatus.PARTIAL,
      actorType: ActorType.Rider,
      roles: ['Rider'],
      linkedWallets: [],
      completedSteps: ['init', 'step1'],
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      idempotencyKey: 'key-1',
    });

    mockRepository.findOne.mockResolvedValue(session);

    const command = new UpdateSignUpStepCommand({
      sessionId,
      stepName: 'step1', // Already in completedSteps
      roles: ['Rider'], // Same as in session
      linkedWallets: [],
      idempotencyKey: 'key-1',
    });

    await handler.execute(command);

    expect(repository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
    expect(eventBusService.publish).not.toHaveBeenCalled();
  });

  it('should proceed if idempotencyKey matches but there ARE changes', async () => {
    const sessionId = uuidv4();
    const session = SignUpSessionEntity.fromDomain({
      sessionId,
      status: SignUpSessionStatus.PARTIAL,
      actorType: ActorType.Rider,
      roles: ['Rider'],
      linkedWallets: [],
      completedSteps: ['init'],
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      idempotencyKey: 'key-1',
    });

    mockRepository.findOne.mockResolvedValue(session);

    const command = new UpdateSignUpStepCommand({
      sessionId,
      stepName: 'step1', // New step -> Change detected
      roles: ['Rider'],
      linkedWallets: [],
      idempotencyKey: 'key-1',
    });

    await handler.execute(command);

    expect(repository.save).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });
});
