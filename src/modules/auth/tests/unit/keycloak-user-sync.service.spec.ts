import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ActorType } from '../../../actor/dto/actor.enums';
import { ActorEntity } from '../../../actor/entities/actor.entity';
import {
  KeycloakTokenPayload,
  KeycloakUserSyncService,
} from '../../services/keycloak-user-sync.service';

describe('KeycloakUserSyncService', () => {
  let service: KeycloakUserSyncService;
  let actorRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    actorRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakUserSyncService,
        {
          provide: getRepositoryToken(ActorEntity),
          useValue: actorRepository,
        },
      ],
    }).compile();

    service = module.get<KeycloakUserSyncService>(KeycloakUserSyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncUser', () => {
    it('should create a new Actor on first Keycloak login', async () => {
      const payload: KeycloakTokenPayload = {
        sub: uuidv4(),
        email: 'newuser@example.com',
        preferred_username: 'newuser',
        iss: 'http://localhost:8080/realms/zanafleet',
        realm_access: {
          roles: ['user', 'admin'],
        },
      };

      const createdActor = {
        id: expect.any(String),
        type: ActorType.Rider,
        email: 'newuser@example.com',
        username: 'newuser',
        passwordHash: '',
        roles: ['user', 'admin'],
        workspaceId: expect.any(String),
        linkedWallets: [],
      };

      actorRepository.findOne.mockResolvedValue(null);
      actorRepository.create.mockReturnValue(createdActor);
      actorRepository.save.mockResolvedValue(createdActor);

      const result = await service.syncUser(payload);

      expect(result.created).toBe(true);
      expect(result.actor.email).toBe('newuser@example.com');
      expect(actorRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      });
      expect(actorRepository.create).toHaveBeenCalled();
      expect(actorRepository.save).toHaveBeenCalled();
    });

    it('should update existing Actor roles on subsequent login', async () => {
      const existingActorId = uuidv4();
      const payload: KeycloakTokenPayload = {
        sub: existingActorId,
        email: 'existing@example.com',
        preferred_username: 'existinguser',
        iss: 'http://localhost:8080/realms/zanafleet',
        realm_access: {
          roles: ['user', 'admin', 'manager'],
        },
      };

      const existingActor = {
        id: existingActorId,
        type: ActorType.Rider,
        email: 'existing@example.com',
        username: 'existinguser',
        passwordHash: 'hashedpassword',
        roles: ['user', 'admin'],
        workspaceId: uuidv4(),
        linkedWallets: [],
      };

      actorRepository.findOne.mockResolvedValue(existingActor);
      actorRepository.save.mockResolvedValue({
        ...existingActor,
        roles: ['user', 'admin', 'manager'],
      });

      const result = await service.syncUser(payload);

      expect(result.created).toBe(false);
      expect(actorRepository.save).toHaveBeenCalled();
    });

    it('should not update Actor if roles have not changed', async () => {
      const existingActorId = uuidv4();
      const payload: KeycloakTokenPayload = {
        sub: existingActorId,
        email: 'existing@example.com',
        iss: 'http://localhost:8080/realms/zanafleet',
        realm_access: {
          roles: ['admin', 'user'],
        },
      };

      const existingActor = {
        id: existingActorId,
        email: 'existing@example.com',
        roles: ['user', 'admin'],
      };

      actorRepository.findOne.mockResolvedValue(existingActor);

      const result = await service.syncUser(payload);

      expect(result.created).toBe(false);
      expect(actorRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error if email is missing from token', async () => {
      const payload: KeycloakTokenPayload = {
        sub: uuidv4(),
        iss: 'http://localhost:8080/realms/zanafleet',
      };

      await expect(service.syncUser(payload)).rejects.toThrow(
        'Keycloak token missing email claim',
      );
    });

    it('should use email prefix as username when preferred_username is missing', async () => {
      const payload: KeycloakTokenPayload = {
        sub: uuidv4(),
        email: 'testuser@example.com',
        iss: 'http://localhost:8080/realms/zanafleet',
      };

      const createdActor = {
        id: expect.any(String),
        email: 'testuser@example.com',
        username: 'testuser',
      };

      actorRepository.findOne.mockResolvedValue(null);
      actorRepository.create.mockReturnValue(createdActor);
      actorRepository.save.mockResolvedValue(createdActor);

      await service.syncUser(payload);

      expect(actorRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
        }),
      );
    });

    it('should filter out Keycloak internal roles', async () => {
      const payload: KeycloakTokenPayload = {
        sub: uuidv4(),
        email: 'testuser@example.com',
        iss: 'http://localhost:8080/realms/zanafleet',
        realm_access: {
          roles: ['user', 'uma_authorization', 'offline_access', 'admin'],
        },
      };

      const createdActor = {
        id: expect.any(String),
        email: 'testuser@example.com',
        username: 'testuser',
        roles: ['user', 'admin'],
      };

      actorRepository.findOne.mockResolvedValue(null);
      actorRepository.create.mockReturnValue(createdActor);
      actorRepository.save.mockResolvedValue(createdActor);

      await service.syncUser(payload);

      expect(actorRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ['user', 'admin'],
        }),
      );
    });
  });

  describe('isKeycloakToken', () => {
    it('should return true for Keycloak issuer', () => {
      const result = service.isKeycloakToken({
        iss: 'http://localhost:8080/realms/zanafleet',
      });
      expect(result).toBe(true);
    });

    it('should return false for local issuer', () => {
      const result = service.isKeycloakToken({ iss: 'zanafleet' });
      expect(result).toBe(false);
    });

    it('should return false if no issuer', () => {
      const result = service.isKeycloakToken({});
      expect(result).toBe(false);
    });
  });
});
