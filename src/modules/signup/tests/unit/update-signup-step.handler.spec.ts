import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../../core/event-bus';
import * as passwordUtil from '../../../../core/utils/password.util';
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

    handler = module.get<UpdateSignUpStepCommandHandler>(UpdateSignUpStepCommandHandler);
    repository = module.get<Repository<SignUpSessionEntity>>(
      getRepositoryToken(SignUpSessionEntity)
    );
    eventBus = module.get<EventBus>(EventBus);
    eventBusService = module.get<EventBusService>(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully update session and emit event', async () => {
    const sessionId = uuidv4();
    const workspaceIds = [uuidv4()];
    const session = SignUpSessionEntity.fromDomain({
      sessionId,
      status: SignUpSessionStatus.INITIATED,
      actorType: ActorType.Rider,
      workspaceIds: [],
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
      workspaceIds,
      roles: ['Rider'],
      linkedWallets: [],
      idempotencyKey: 'key-1',
    });

    const result = await handler.execute(command);

    // Verify persistence
    expect(repository.save).toHaveBeenCalled();
    expect(result.sessionId).toBe(sessionId);
    expect(result.status).toBe(SignUpSessionStatus.PARTIAL);
    expect(result.completedSteps).toContain('work-info');
    const saved = (repository.save as jest.Mock).mock.calls[0][0];
    expect(saved.workspaceIds).toEqual(workspaceIds);
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
    expect(event.changes).toHaveProperty('workspaceIds', workspaceIds);
  });

  it('should throw NotFoundException if session does not exist', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    const command = new UpdateSignUpStepCommand({
      sessionId: uuidv4(),
      stepName: 'test',
      workspaceIds: [],
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
      workspaceIds: [],
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
      workspaceIds: [],
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
      workspaceIds: [],
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
      workspaceIds: [],
      roles: ['Rider'], // Same as in session
      linkedWallets: [],
      idempotencyKey: 'key-1',
    });

    const result = await handler.execute(command);

    expect(repository.save).not.toHaveBeenCalled();
    expect(result.sessionId).toBe(sessionId);
    expect(result.status).toBe(SignUpSessionStatus.PARTIAL);
    expect(result.completedSteps).toEqual(['init', 'step1']);
    expect(eventBus.publish).not.toHaveBeenCalled();
    expect(eventBusService.publish).not.toHaveBeenCalled();
  });

  it('should proceed if idempotencyKey matches but there ARE changes', async () => {
    const sessionId = uuidv4();
    const session = SignUpSessionEntity.fromDomain({
      sessionId,
      status: SignUpSessionStatus.PARTIAL,
      actorType: ActorType.Rider,
      workspaceIds: [],
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
      workspaceIds: [],
      roles: ['Rider'],
      linkedWallets: [],
      idempotencyKey: 'key-1',
    });

    const result = await handler.execute(command);

    expect(repository.save).toHaveBeenCalled();
    expect(result.completedSteps).toContain('step1');
    expect(eventBus.publish).toHaveBeenCalled();
  });

  describe('identity fields', () => {
    it('should set email, username on a session and track changes', async () => {
      const sessionId = uuidv4();
      const session = SignUpSessionEntity.fromDomain({
        sessionId,
        status: SignUpSessionStatus.INITIATED,
        actorType: ActorType.Rider,
        workspaceIds: [],
        roles: [],
        linkedWallets: [],
        completedSteps: [],
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(session);

      const command = new UpdateSignUpStepCommand({
        sessionId,
        stepName: 'identity',
        workspaceIds: [],
        roles: [],
        linkedWallets: [],
        email: 'rider@example.com',
        username: 'john_rider',
      });

      const result = await handler.execute(command);

      expect(repository.save).toHaveBeenCalled();
      expect(result.completedSteps).toContain('identity');

      const saved = (repository.save as jest.Mock).mock.calls[0][0];
      expect(saved.email).toBe('rider@example.com');
      expect(saved.username).toBe('john_rider');

      const event = (eventBus.publish as jest.Mock).mock.calls[0][0];
      expect(event.changes).toHaveProperty('email', 'rider@example.com');
      expect(event.changes).toHaveProperty('username', 'john_rider');
    });

    it('should hash password and store as passwordHash', async () => {
      const sessionId = uuidv4();
      const hashedPassword = '$2b$10$hashedpasswordvalue';
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue(hashedPassword);

      const session = SignUpSessionEntity.fromDomain({
        sessionId,
        status: SignUpSessionStatus.INITIATED,
        actorType: ActorType.Rider,
        workspaceIds: [],
        roles: [],
        linkedWallets: [],
        completedSteps: [],
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(session);

      const command = new UpdateSignUpStepCommand({
        sessionId,
        stepName: 'identity',
        workspaceIds: [],
        roles: [],
        linkedWallets: [],
        password: 'plainTextPassword123',
      });

      await handler.execute(command);

      expect(passwordUtil.hashPassword).toHaveBeenCalledWith('plainTextPassword123');
      expect(repository.save).toHaveBeenCalled();

      const saved = (repository.save as jest.Mock).mock.calls[0][0];
      expect(saved.passwordHash).toBe(hashedPassword);
      expect(saved.passwordHash).not.toBe('plainTextPassword123');

      const event = (eventBus.publish as jest.Mock).mock.calls[0][0];
      expect(event.changes).toHaveProperty('passwordHash', true);
    });

    it('should set location and workspaceName on a session', async () => {
      const sessionId = uuidv4();
      const session = SignUpSessionEntity.fromDomain({
        sessionId,
        status: SignUpSessionStatus.INITIATED,
        actorType: ActorType.BusinessOwner,
        workspaceIds: [],
        roles: [],
        linkedWallets: [],
        completedSteps: [],
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(session);

      const command = new UpdateSignUpStepCommand({
        sessionId,
        stepName: 'workspace-info',
        workspaceIds: [],
        roles: [],
        linkedWallets: [],
        location: 'Nairobi, Kenya',
        workspaceName: 'My Fleet Company',
      });

      const result = await handler.execute(command);

      expect(repository.save).toHaveBeenCalled();
      expect(result.completedSteps).toContain('workspace-info');

      const saved = (repository.save as jest.Mock).mock.calls[0][0];
      expect(saved.location).toBe('Nairobi, Kenya');
      expect(saved.workspaceName).toBe('My Fleet Company');

      const event = (eventBus.publish as jest.Mock).mock.calls[0][0];
      expect(event.changes).toHaveProperty('location', 'Nairobi, Kenya');
      expect(event.changes).toHaveProperty('workspaceName', 'My Fleet Company');
    });

    it('should handle all identity fields together', async () => {
      const sessionId = uuidv4();
      const hashedPassword = '$2b$10$hashedpasswordvalue';
      jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue(hashedPassword);

      const session = SignUpSessionEntity.fromDomain({
        sessionId,
        status: SignUpSessionStatus.INITIATED,
        actorType: ActorType.BusinessOwner,
        workspaceIds: [],
        roles: [],
        linkedWallets: [],
        completedSteps: [],
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(session);

      const command = new UpdateSignUpStepCommand({
        sessionId,
        stepName: 'complete-profile',
        workspaceIds: [],
        roles: [],
        linkedWallets: [],
        email: 'owner@example.com',
        username: 'fleet_owner',
        password: 'securePass123',
        location: 'Mombasa, Kenya',
        workspaceName: 'Coastal Fleet',
      });

      await handler.execute(command);

      const saved = (repository.save as jest.Mock).mock.calls[0][0];
      expect(saved.email).toBe('owner@example.com');
      expect(saved.username).toBe('fleet_owner');
      expect(saved.passwordHash).toBe(hashedPassword);
      expect(saved.location).toBe('Mombasa, Kenya');
      expect(saved.workspaceName).toBe('Coastal Fleet');

      const event = (eventBus.publish as jest.Mock).mock.calls[0][0];
      expect(event.changes).toHaveProperty('email', 'owner@example.com');
      expect(event.changes).toHaveProperty('username', 'fleet_owner');
      expect(event.changes).toHaveProperty('passwordHash', true);
      expect(event.changes).toHaveProperty('location', 'Mombasa, Kenya');
      expect(event.changes).toHaveProperty('workspaceName', 'Coastal Fleet');
    });

    it('should not track changes for identity fields that have not changed', async () => {
      const sessionId = uuidv4();
      const session = SignUpSessionEntity.fromDomain({
        sessionId,
        status: SignUpSessionStatus.PARTIAL,
        actorType: ActorType.Rider,
        email: 'existing@example.com',
        username: 'existing_user',
        location: 'Nairobi, Kenya',
        workspaceName: 'Existing Fleet',
        workspaceIds: [],
        roles: [],
        linkedWallets: [],
        completedSteps: ['init'],
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      });

      mockRepository.findOne.mockResolvedValue(session);

      const command = new UpdateSignUpStepCommand({
        sessionId,
        stepName: 'verify',
        workspaceIds: [],
        roles: [],
        linkedWallets: [],
        email: 'existing@example.com',
        username: 'existing_user',
        location: 'Nairobi, Kenya',
        workspaceName: 'Existing Fleet',
      });

      await handler.execute(command);

      const event = (eventBus.publish as jest.Mock).mock.calls[0][0];
      expect(event.changes).not.toHaveProperty('email');
      expect(event.changes).not.toHaveProperty('username');
      expect(event.changes).not.toHaveProperty('location');
      expect(event.changes).not.toHaveProperty('workspaceName');
      expect(event.changes).toHaveProperty('stepName', 'verify');
    });
  });
});
