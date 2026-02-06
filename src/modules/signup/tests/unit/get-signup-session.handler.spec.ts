import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ActorType } from '../../../actor/dto/actor.enums';
import { SignUpSessionStatus } from '../../dto/signup.enums';
import { SignUpSessionEntity } from '../../entities/signup-session.entity';
import { GetSignUpSessionQueryHandler } from '../../handlers/get-signup-session.handler';
import { GetSignUpSessionQuery } from '../../queries/get-signup-session.query';

describe('GetSignUpSessionQueryHandler', () => {
  let handler: GetSignUpSessionQueryHandler;

  const mockRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSignUpSessionQueryHandler,
        {
          provide: getRepositoryToken(SignUpSessionEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<GetSignUpSessionQueryHandler>(GetSignUpSessionQueryHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return session data when session exists', async () => {
    const sessionId = uuidv4();
    const workspaceIds = [uuidv4()];
    const now = new Date();
    const expiresAt = new Date(Date.now() + 86400000);

    const mockSession = {
      id: sessionId,
      status: SignUpSessionStatus.PARTIAL,
      actorType: ActorType.Rider,
      workspaceIds,
      roles: ['Rider'],
      linkedWallets: [],
      idempotencyKey: null,
      completedSteps: ['init'],
      expiresAt,
      createdAt: now,
      updatedAt: now,
      toDomain: jest.fn().mockReturnValue({
        sessionId,
        status: SignUpSessionStatus.PARTIAL,
        actorType: ActorType.Rider,
        workspaceIds,
        roles: ['Rider'],
        linkedWallets: [],
        idempotencyKey: null,
        completedSteps: ['init'],
        expiresAt,
        createdAt: now,
        updatedAt: now,
      }),
    };

    mockRepository.findOne.mockResolvedValue(mockSession);

    const query = new GetSignUpSessionQuery({ sessionId });
    const result = await handler.execute(query);

    expect(result.sessionId).toBe(sessionId);
    expect(result.status).toBe(SignUpSessionStatus.PARTIAL);
    expect(result.actorType).toBe(ActorType.Rider);
    expect(result.workspaceIds).toEqual(workspaceIds);
    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { id: sessionId },
    });
    expect(mockSession.toDomain).toHaveBeenCalled();
  });

  it('should throw NotFoundException when session does not exist', async () => {
    const sessionId = uuidv4();
    mockRepository.findOne.mockResolvedValue(null);

    const query = new GetSignUpSessionQuery({ sessionId });

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow(`SignUp session ${sessionId} not found`);
  });
});
