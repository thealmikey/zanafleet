import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ActorType } from '../../../actor/dto/actor.enums';
import { ActorEntity } from '../../../actor/entities/actor.entity';
import { JwtPayload, JwtStrategy } from '../../strategies/jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let actorRepository: { findOne: jest.Mock };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'auth.jwt.secret': 'test-secret-key-for-testing',
        'auth.jwt.issuer': 'zanafleet',
        'keycloak.authServerUrl': 'http://localhost:8080',
        'keycloak.realm': 'zanafleet',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    actorRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(ActorEntity),
          useValue: actorRepository,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return actor payload when actor exists', async () => {
      const actorId = uuidv4();
      const workspaceId = uuidv4();
      const payload: JwtPayload = {
        sub: actorId,
        email: 'test@example.com',
        workspaceId,
        roles: ['user'],
        iss: 'zanafleet',
      };

      const mockActor = {
        id: actorId,
        email: 'test@example.com',
        username: 'testuser',
        type: ActorType.INDIVIDUAL,
        workspaceId,
        roles: ['user'],
      };

      actorRepository.findOne.mockResolvedValue(mockActor);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        actorId,
        email: 'test@example.com',
        workspaceId,
        roles: ['user'],
      });
      expect(actorRepository.findOne).toHaveBeenCalledWith({
        where: { id: actorId },
      });
    });

    it('should accept tokens from Keycloak issuer', async () => {
      const actorId = uuidv4();
      const workspaceId = uuidv4();
      const payload: JwtPayload = {
        sub: actorId,
        email: 'keycloak@example.com',
        workspaceId,
        roles: ['admin'],
        iss: 'http://localhost:8080/realms/zanafleet',
      };

      const mockActor = {
        id: actorId,
        email: 'keycloak@example.com',
        username: 'keycloakuser',
        type: ActorType.INDIVIDUAL,
        workspaceId,
        roles: ['admin'],
      };

      actorRepository.findOne.mockResolvedValue(mockActor);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        actorId,
        email: 'keycloak@example.com',
        workspaceId,
        roles: ['admin'],
      });
    });

    it('should accept tokens without issuer claim', async () => {
      const actorId = uuidv4();
      const workspaceId = uuidv4();
      const payload: JwtPayload = {
        sub: actorId,
        email: 'noissuer@example.com',
        workspaceId,
        roles: [],
      };

      const mockActor = {
        id: actorId,
        email: 'noissuer@example.com',
        username: 'noissueruser',
        type: ActorType.INDIVIDUAL,
        workspaceId,
        roles: [],
      };

      actorRepository.findOne.mockResolvedValue(mockActor);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        actorId,
        email: 'noissuer@example.com',
        workspaceId,
        roles: [],
      });
    });

    it('should throw UnauthorizedException when actor does not exist', async () => {
      const payload: JwtPayload = {
        sub: uuidv4(),
        email: 'nonexistent@example.com',
        workspaceId: uuidv4(),
        roles: [],
        iss: 'zanafleet',
      };

      actorRepository.findOne.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow('Actor not found');
    });

    it('should throw UnauthorizedException for invalid issuer', async () => {
      const payload: JwtPayload = {
        sub: uuidv4(),
        email: 'invalid@example.com',
        workspaceId: uuidv4(),
        roles: [],
        iss: 'malicious-issuer',
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Invalid token issuer',
      );
    });
  });
});
