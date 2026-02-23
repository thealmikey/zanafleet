import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { ActorEntity } from '@api/modules/actor/entities/actor.entity';
import { KeycloakUserSyncService, SyncResult } from '../../services/keycloak-user-sync.service';
import { JwtStrategy, JwtPayload, ValidatedUser } from '../../strategies/jwt.strategy';

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;
  let mockActorRepository: {
    findOne: jest.Mock;
  };
  let mockKeycloakUserSyncService: {
    syncUser: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  const mockActor: Partial<ActorEntity> = {
    id: 'actor-123',
    email: 'test@example.com',
    username: 'testuser',
    workspaceId: 'workspace-456',
    roles: ['admin', 'user'],
  };

  beforeEach(async () => {
    mockActorRepository = {
      findOne: jest.fn(),
    };

    mockKeycloakUserSyncService = {
      syncUser: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'auth.jwt.issuer':
            return 'zanafleet';
          case 'keycloak.authServerUrl':
            return 'http://localhost:8080';
          case 'keycloak.realm':
            return 'zanafleet';
          case 'keycloak.publicKey':
            return undefined;
          default:
            return undefined;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'ActorEntityRepository',
          useValue: mockActorRepository,
        },
        {
          provide: KeycloakUserSyncService,
          useValue: mockKeycloakUserSyncService,
        },
      ],
    }).compile();

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate()', () => {
    describe('local JWT tokens (sandbox mode)', () => {
      const localPayload: JwtPayload = {
        sub: 'actor-123',
        email: 'test@example.com',
        workspaceId: 'workspace-456',
        roles: ['admin', 'user'],
        iss: 'zanafleet',
      };

      it('should extract tenant_id from workspaceId', async () => {
        mockActorRepository.findOne.mockResolvedValue(mockActor);

        const result: ValidatedUser = await jwtStrategy.validate(localPayload);

        expect(result.tenant_id).toBe('workspace-456');
        expect(result.workspaceId).toBe('workspace-456');
      });

      it('should return actor details for valid local token', async () => {
        mockActorRepository.findOne.mockResolvedValue(mockActor);

        const result: ValidatedUser = await jwtStrategy.validate(localPayload);

        expect(result.actorId).toBe('actor-123');
        expect(result.email).toBe('test@example.com');
        expect(result.workspaceId).toBe('workspace-456');
        expect(result.roles).toEqual(['admin', 'user']);
      });

      it('should throw UnauthorizedException for actor not found', async () => {
        mockActorRepository.findOne.mockResolvedValue(null);

        await expect(jwtStrategy.validate(localPayload)).rejects.toThrow(UnauthorizedException);
        await expect(jwtStrategy.validate(localPayload)).rejects.toThrow('Actor not found');
      });

      it('should throw UnauthorizedException for invalid issuer', async () => {
        const invalidPayload: JwtPayload = {
          ...localPayload,
          iss: 'invalid-issuer',
        };

        await expect(jwtStrategy.validate(invalidPayload)).rejects.toThrow(UnauthorizedException);
        await expect(jwtStrategy.validate(invalidPayload)).rejects.toThrow('Invalid token issuer');
      });

      it('should accept tokens without issuer (backward compatibility)', async () => {
        const payloadWithoutIssuer: JwtPayload = {
          sub: 'actor-123',
          email: 'test@example.com',
          workspaceId: 'workspace-456',
          roles: ['admin', 'user'],
        };

        mockActorRepository.findOne.mockResolvedValue(mockActor);

        const result: ValidatedUser = await jwtStrategy.validate(payloadWithoutIssuer);

        expect(result.actorId).toBe('actor-123');
      });
    });

    describe('Keycloak tokens', () => {
      const keycloakPayload: JwtPayload = {
        sub: 'keycloak-user-id',
        email: 'keycloak@example.com',
        workspaceId: 'workspace-456',
        roles: ['keycloak-admin'],
        iss: 'http://localhost:8080/realms/zanafleet',
      };

      it('should extract roles from Keycloak token', async () => {
        const syncResult: SyncResult = {
          actor: {
            ...mockActor,
            roles: ['keycloak-admin', 'offline_access'],
          } as ActorEntity,
          created: false,
        };
        mockKeycloakUserSyncService.syncUser.mockResolvedValue(syncResult);

        const result: ValidatedUser = await jwtStrategy.validate(keycloakPayload);

        expect(result.roles).toEqual(['keycloak-admin', 'offline_access']);
      });

      it('should sync user from Keycloak on first login', async () => {
        const syncResult: SyncResult = {
          actor: mockActor as ActorEntity,
          created: true,
        };
        mockKeycloakUserSyncService.syncUser.mockResolvedValue(syncResult);

        const result: ValidatedUser = await jwtStrategy.validate(keycloakPayload);

        expect(mockKeycloakUserSyncService.syncUser).toHaveBeenCalled();
        expect(result.actorId).toBe('actor-123');
      });

      it('should throw UnauthorizedException for invalid Keycloak issuer', async () => {
        const invalidKeycloakPayload: JwtPayload = {
          ...keycloakPayload,
          iss: 'http://other-server/realms/other-realm',
        };

        await expect(jwtStrategy.validate(invalidKeycloakPayload)).rejects.toThrow(
          UnauthorizedException
        );
        await expect(jwtStrategy.validate(invalidKeycloakPayload)).rejects.toThrow(
          'Invalid token issuer'
        );
      });

      it('should accept Keycloak tokens from any path in the same realm', async () => {
        const keycloakPayloadWithPath: JwtPayload = {
          ...keycloakPayload,
          iss: 'http://localhost:8080/realms/zanafleet/protocol/openid-connect',
        };

        const syncResult: SyncResult = {
          actor: mockActor as ActorEntity,
          created: false,
        };
        mockKeycloakUserSyncService.syncUser.mockResolvedValue(syncResult);

        const result: ValidatedUser = await jwtStrategy.validate(keycloakPayloadWithPath);

        expect(result.actorId).toBe('actor-123');
      });
    });

    describe('tenant isolation', () => {
      it('should enforce workspaceId as tenant_id for multi-tenancy', async () => {
        const payload: JwtPayload = {
          sub: 'actor-123',
          email: 'test@example.com',
          workspaceId: 'tenant-workspace-789',
          roles: ['user'],
          iss: 'zanafleet',
        };

        mockActorRepository.findOne.mockResolvedValue({
          ...mockActor,
          workspaceId: 'tenant-workspace-789',
        });

        const result: ValidatedUser = await jwtStrategy.validate(payload);

        expect(result.tenant_id).toBe('tenant-workspace-789');
        expect(result.workspaceId).toBe('tenant-workspace-789');
      });
    });
  });
});
