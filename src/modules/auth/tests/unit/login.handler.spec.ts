jest.mock('../../../../core/utils/password.util', () => ({
  verifyPassword: jest.fn(),
}));

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';

import { verifyPassword } from '../../../../core/utils/password.util';
import { ActorType } from '../../../actor/dto/actor.enums';
import { ActorEntity } from '../../../actor/entities/actor.entity';
import { LoginCommand } from '../../commands/login.command';
import { LoginCommandHandler } from '../../handlers/login.handler';

const mockVerifyPassword = verifyPassword as jest.MockedFunction<typeof verifyPassword>;

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

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('1h'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginCommandHandler,
        {
          provide: getRepositoryToken(ActorEntity),
          useValue: mockRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
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
      email: 'test@example.com',
      roles: ['user'],
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

    expect(result).toMatchObject({
      actorId,
      workspaceId,
      type: ActorType.Rider,
      token: 'mock-jwt-token',
    });
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { id: actorId },
    });
    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: actorId,
      email: 'test@example.com',
      workspaceId,
      roles: ['user'],
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
      email: 'wallet@example.com',
      roles: [],
      linkedWallets: [walletAddress],
      toDomain: () => ({
        actorId,
        workspaceId,
        type: ActorType.Rider,
      }),
    } as any;

    mockQueryBuilder.getOne.mockResolvedValue(actor);

    const command = new LoginCommand({ identifier: walletAddress });
    const result = await handler.execute(command);

    expect(result).toMatchObject({
      actorId,
      workspaceId,
      type: ActorType.Rider,
      token: 'mock-jwt-token',
    });
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(mockRepository.findOne).not.toHaveBeenCalled();
    expect(mockQueryBuilder.where).toHaveBeenCalledWith(':identifier = ANY(actor.linkedWallets)', {
      identifier: walletAddress,
    });
  });

  it('should successfully login by wallet address even if it is a UUID but not found as actor ID', async () => {
    const actorId = uuidv4();
    const workspaceId = uuidv4();
    const walletAddressAsUuid = uuidv4();
    const actor = {
      id: actorId,
      type: ActorType.Rider,
      workspaceId,
      email: 'uuid-wallet@example.com',
      roles: [],
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

    expect(result).toMatchObject({
      actorId,
      workspaceId,
      type: ActorType.Rider,
      token: 'mock-jwt-token',
    });
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(mockRepository.findOne).toHaveBeenCalled();
    expect(mockQueryBuilder.getOne).toHaveBeenCalled();
  });

  it('should successfully login with valid email+password', async () => {
    const actorId = uuidv4();
    const workspaceId = uuidv4();
    const actor = {
      id: actorId,
      type: ActorType.Rider,
      workspaceId,
      email: 'user@example.com',
      passwordHash: '$2b$10$hashedpassword',
      roles: ['user'],
      linkedWallets: [],
      toDomain: () => ({
        actorId,
        workspaceId,
        type: ActorType.Rider,
      }),
    } as any;

    mockRepository.findOne.mockResolvedValue(actor);
    mockVerifyPassword.mockResolvedValue(true);

    const command = new LoginCommand({ identifier: actorId, password: 'correctpassword' });
    const result = await handler.execute(command);

    expect(result).toMatchObject({
      actorId,
      workspaceId,
      type: ActorType.Rider,
      token: 'mock-jwt-token',
    });
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(mockVerifyPassword).toHaveBeenCalledWith('correctpassword', '$2b$10$hashedpassword');
  });

  it('should throw UnauthorizedException for invalid password', async () => {
    const actorId = uuidv4();
    const workspaceId = uuidv4();
    const actor = {
      id: actorId,
      type: ActorType.Rider,
      workspaceId,
      email: 'user@example.com',
      passwordHash: '$2b$10$hashedpassword',
      roles: ['user'],
      linkedWallets: [],
      toDomain: () => ({
        actorId,
        workspaceId,
        type: ActorType.Rider,
      }),
    } as any;

    mockRepository.findOne.mockResolvedValue(actor);
    mockVerifyPassword.mockResolvedValue(false);

    const command = new LoginCommand({ identifier: actorId, password: 'wrongpassword' });

    await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
    await expect(handler.execute(command)).rejects.toThrow('Invalid credentials');
  });

  it('should throw UnauthorizedException if actor not found', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    mockQueryBuilder.getOne.mockResolvedValue(null);

    const command = new LoginCommand({ identifier: 'non-existent' });

    await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
  });
});
