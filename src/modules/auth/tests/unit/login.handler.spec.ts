import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ActorEntity } from '../../../actor/entities/actor.entity';
import { ActorType } from '../../../actor/dto/actor.enums';
import { LoginCommand } from '../../commands/login.command';
import { LoginCommandHandler } from '../../handlers/login.handler';

describe('LoginCommandHandler', () => {
  let handler: LoginCommandHandler;

  const mockRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginCommandHandler,
        {
          provide: getRepositoryToken(ActorEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<LoginCommandHandler>(LoginCommandHandler);
    
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully login by actorId (UUID)', async () => {
    const actorId = uuidv4();
    const workspaceId = uuidv4();
    const actor = {
      id: actorId,
      type: ActorType.Rider,
      workspaceId,
      linkedWallets: [],
      toDomain: () => ({
        actorId,
        workspaceId,
        type: ActorType.Rider,
      }),
    } as any;

    mockRepository.findOne.mockResolvedValue(actor);

    const command = new LoginCommand({ identifier: actorId });
    const result = await handler.execute(command);

    expect(result).toEqual({
      actorId,
      workspaceId,
      type: ActorType.Rider,
    });
    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { id: actorId },
    });
  });

  it('should successfully login by wallet address', async () => {
    const actorId = uuidv4();
    const workspaceId = uuidv4();
    const walletAddress = '0x1234567890abcdef';
    const actor = {
      id: actorId,
      type: ActorType.Rider,
      workspaceId,
      linkedWallets: [walletAddress],
      toDomain: () => ({
        actorId,
        workspaceId,
        type: ActorType.Rider,
      }),
    } as any;

    // Case 1: not a UUID
    mockQueryBuilder.getOne.mockResolvedValue(actor);

    const command = new LoginCommand({ identifier: walletAddress });
    const result = await handler.execute(command);

    expect(result).toEqual({
      actorId,
      workspaceId,
      type: ActorType.Rider,
    });
    expect(mockRepository.findOne).not.toHaveBeenCalled(); // because '0x123...' is not a UUID
    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      ':identifier = ANY(actor.linkedWallets)',
      { identifier: walletAddress },
    );
  });

  it('should successfully login by wallet address even if it is a UUID but not found as actor ID', async () => {
    const actorId = uuidv4();
    const workspaceId = uuidv4();
    const walletAddressAsUuid = uuidv4();
    const actor = {
      id: actorId,
      type: ActorType.Rider,
      workspaceId,
      linkedWallets: [walletAddressAsUuid],
      toDomain: () => ({
        actorId,
        workspaceId,
        type: ActorType.Rider,
      }),
    } as any;

    mockRepository.findOne.mockResolvedValue(null);
    mockQueryBuilder.getOne.mockResolvedValue(actor);

    const command = new LoginCommand({ identifier: walletAddressAsUuid });
    const result = await handler.execute(command);

    expect(result).toEqual({
      actorId,
      workspaceId,
      type: ActorType.Rider,
    });
    expect(mockRepository.findOne).toHaveBeenCalled();
    expect(mockQueryBuilder.getOne).toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if actor not found', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    mockQueryBuilder.getOne.mockResolvedValue(null);

    const command = new LoginCommand({ identifier: 'non-existent' });

    await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
  });
});
