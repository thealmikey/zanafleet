jest.mock(
  '@nestjs/swagger',
  () => ({
    ApiProperty: () => () => {},
    ApiPropertyOptional: () => () => {},
  }),
  { virtual: true },
);

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';

import { ActorType } from '../../../actor/dto/actor.enums';
import { AuthController } from '../../controllers/auth.controller';
import { KeycloakUserSyncService } from '../../services/keycloak-user-sync.service';

/**
 * Helper to create a mock Keycloak JWT token (header.payload.signature)
 */
function createMockKeycloakToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'mock-signature';
  return `${header}.${body}.${signature}`;
}

describe('AuthController - Keycloak Token Exchange', () => {
  let controller: AuthController;
  let keycloakUserSyncService: { syncUser: jest.Mock; isKeycloakToken: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };

  const mockCommandBus = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    keycloakUserSyncService = {
      syncUser: jest.fn(),
      isKeycloakToken: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('local-jwt-token'),
    };

    configService = {
      get: jest.fn().mockReturnValue('1h'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: KeycloakUserSyncService,
          useValue: keycloakUserSyncService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exchangeKeycloakToken', () => {
    it('should exchange valid Keycloak token for local JWT', async () => {
      const actorId = uuidv4();
      const workspaceId = uuidv4();
      const keycloakPayload = {
        sub: uuidv4(),
        email: 'keycloak-user@example.com',
        preferred_username: 'keycloakuser',
        iss: 'http://localhost:8080/realms/zanafleet',
        realm_access: {
          roles: ['user', 'admin'],
        },
      };

      const mockActor = {
        id: actorId,
        email: 'keycloak-user@example.com',
        username: 'keycloakuser',
        type: ActorType.Rider,
        workspaceId,
        roles: ['user', 'admin'],
      };

      keycloakUserSyncService.syncUser.mockResolvedValue({
        actor: mockActor,
        created: false,
      });

      const accessToken = createMockKeycloakToken(keycloakPayload);
      const result = await controller.exchangeKeycloakToken({ accessToken });

      expect(result.token).toBe('local-jwt-token');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: actorId,
        email: 'keycloak-user@example.com',
        workspaceId,
        roles: ['user', 'admin'],
      });
    });

    it('should return 401 for invalid/malformed token', async () => {
      const invalidToken = 'not-a-valid-jwt';

      await expect(
        controller.exchangeKeycloakToken({ accessToken: invalidToken }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.exchangeKeycloakToken({ accessToken: invalidToken }),
      ).rejects.toThrow('Invalid token format');
    });

    it('should return 401 for token missing email claim', async () => {
      const payloadWithoutEmail = {
        sub: uuidv4(),
        preferred_username: 'noemailer',
        iss: 'http://localhost:8080/realms/zanafleet',
      };

      const accessToken = createMockKeycloakToken(payloadWithoutEmail);

      await expect(
        controller.exchangeKeycloakToken({ accessToken }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.exchangeKeycloakToken({ accessToken }),
      ).rejects.toThrow('Token missing email claim');
    });

    it('should return 401 for token with non-Keycloak issuer', async () => {
      const payloadWithInvalidIssuer = {
        sub: uuidv4(),
        email: 'user@example.com',
        preferred_username: 'user',
        iss: 'some-other-issuer',
      };

      const accessToken = createMockKeycloakToken(payloadWithInvalidIssuer);

      await expect(
        controller.exchangeKeycloakToken({ accessToken }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.exchangeKeycloakToken({ accessToken }),
      ).rejects.toThrow('Invalid token issuer');
    });

    it('should return user info (id, email, name, roles) along with token', async () => {
      const actorId = uuidv4();
      const workspaceId = uuidv4();
      const keycloakPayload = {
        sub: uuidv4(),
        email: 'detailed-user@example.com',
        preferred_username: 'detaileduser',
        iss: 'http://localhost:8080/realms/zanafleet',
        realm_access: {
          roles: ['manager', 'viewer'],
        },
      };

      const mockActor = {
        id: actorId,
        email: 'detailed-user@example.com',
        username: 'detaileduser',
        type: ActorType.Rider,
        workspaceId,
        roles: ['manager', 'viewer'],
      };

      keycloakUserSyncService.syncUser.mockResolvedValue({
        actor: mockActor,
        created: true,
      });

      const accessToken = createMockKeycloakToken(keycloakPayload);
      const result = await controller.exchangeKeycloakToken({ accessToken });

      expect(result.user).toEqual({
        id: actorId,
        email: 'detailed-user@example.com',
        name: 'detaileduser',
        roles: ['manager', 'viewer'],
      });
      expect(result.token).toBe('local-jwt-token');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should call KeycloakUserSyncService.syncUser with decoded payload', async () => {
      const actorId = uuidv4();
      const workspaceId = uuidv4();
      const keycloakSub = uuidv4();
      const keycloakPayload = {
        sub: keycloakSub,
        email: 'sync-test@example.com',
        preferred_username: 'syncuser',
        iss: 'http://localhost:8080/realms/zanafleet',
        realm_access: {
          roles: ['user'],
        },
      };

      const mockActor = {
        id: actorId,
        email: 'sync-test@example.com',
        username: 'syncuser',
        type: ActorType.Rider,
        workspaceId,
        roles: ['user'],
      };

      keycloakUserSyncService.syncUser.mockResolvedValue({
        actor: mockActor,
        created: false,
      });

      const accessToken = createMockKeycloakToken(keycloakPayload);
      await controller.exchangeKeycloakToken({ accessToken });

      expect(keycloakUserSyncService.syncUser).toHaveBeenCalledTimes(1);
      expect(keycloakUserSyncService.syncUser).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: keycloakSub,
          email: 'sync-test@example.com',
          preferred_username: 'syncuser',
          iss: 'http://localhost:8080/realms/zanafleet',
        }),
      );
    });

    it('should return 401 when syncUser throws an error', async () => {
      const keycloakPayload = {
        sub: uuidv4(),
        email: 'error-user@example.com',
        preferred_username: 'erroruser',
        iss: 'http://localhost:8080/realms/zanafleet',
      };

      keycloakUserSyncService.syncUser.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const accessToken = createMockKeycloakToken(keycloakPayload);

      await expect(
        controller.exchangeKeycloakToken({ accessToken }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.exchangeKeycloakToken({ accessToken }),
      ).rejects.toThrow('Database connection failed');
    });

    it('should use email prefix as name when username is not available', async () => {
      const actorId = uuidv4();
      const workspaceId = uuidv4();
      const keycloakPayload = {
        sub: uuidv4(),
        email: 'nousername@example.com',
        iss: 'http://localhost:8080/realms/zanafleet',
      };

      const mockActor = {
        id: actorId,
        email: 'nousername@example.com',
        username: null,
        type: ActorType.Rider,
        workspaceId,
        roles: [],
      };

      keycloakUserSyncService.syncUser.mockResolvedValue({
        actor: mockActor,
        created: true,
      });

      const accessToken = createMockKeycloakToken(keycloakPayload);
      const result = await controller.exchangeKeycloakToken({ accessToken });

      expect(result.user.name).toBe('nousername');
    });

    it('should return 401 for token with missing issuer', async () => {
      const payloadWithoutIssuer = {
        sub: uuidv4(),
        email: 'user@example.com',
        preferred_username: 'user',
      };

      const accessToken = createMockKeycloakToken(payloadWithoutIssuer);

      await expect(
        controller.exchangeKeycloakToken({ accessToken }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.exchangeKeycloakToken({ accessToken }),
      ).rejects.toThrow('Invalid token issuer');
    });
  });
});
