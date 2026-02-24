import { ActorEntity } from '@api/modules/actor/entities/actor.entity';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { Repository } from 'typeorm';

import {
  KeycloakTokenPayload,
  KeycloakUserSyncService,
  SyncResult,
} from '../services/keycloak-user-sync.service';

/**
 * JWT Payload interface for token claims
 */
export interface JwtPayload {
  sub: string; // actorId
  email: string;
  workspaceId: string;
  tenant_id?: string; // tenant identifier from workspaceId
  roles: string[];
  iss?: string; // issuer - 'zanafleet' or keycloak URL
  iat?: number;
  exp?: number;
}

/**
 * Validated user object returned from JWT strategy
 */
export interface ValidatedUser {
  actorId: string;
  email: string;
  workspaceId: string;
  tenant_id?: string; // tenant identifier for multi-tenancy
  roles: string[];
}

/**
 * JWKS Key cache for Keycloak keys
 */
interface JwksKey {
  publicKey: string;
  kid: string;
}

/**
 * JWT Strategy for Passport authentication
 *
 * Supports both local JWTs and Keycloak-issued tokens with RS256 validation.
 * Validates the token and verifies the actor exists in the database.
 *
 * Keycloak configuration can be provided via:
 * - KEYCLOAK_PUBLIC_KEY: PEM-encoded RSA public key for RS256
 * - JWKS endpoint: {authServerUrl}/realms/{realm}/protocol/openid-connect/certs
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private jwksCache: JwksKey[] = [];
  private jwksCacheExpiry = 0;
  private readonly config: {
    localIssuer: string;
    keycloakIssuer: string;
    keycloakPublicKey: string | undefined;
    useKeycloakRs256: boolean;
  };

  constructor(
    configService: ConfigService,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>,
    private readonly keycloakUserSyncService: KeycloakUserSyncService
  ) {
    // Capture config values before calling super()
    const jwtIssuer = configService.get<string>('auth.jwt.issuer') || 'zanafleet';
    const keycloakAuthUrl = configService.get<string>('keycloak.authServerUrl');
    const keycloakRealm = configService.get<string>('keycloak.realm');
    const keycloakPublicKey = configService.get<string>('keycloak.publicKey');

    const localIssuer = jwtIssuer;
    const keycloakIssuer =
      keycloakAuthUrl && keycloakRealm ? `${keycloakAuthUrl}/realms/${keycloakRealm}` : '';
    const useKeycloakRs256 = !!keycloakPublicKey;

    // Build strategy options based on configuration
    // Use secretOrKeyProvider for dynamic key retrieval (required for RS256 with Keycloak)
    const strategyOptions: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (
        _request: unknown,
        payload: JwtPayload,
        _done: (err: Error | null, secretOrKey?: string | Buffer) => void
      ): void => {
        const isKeycloakToken =
          payload.iss && keycloakIssuer && payload.iss.startsWith(keycloakIssuer);

        if (isKeycloakToken && useKeycloakRs256) {
          // Use Keycloak's public key for RS256 validation
          if (keycloakPublicKey) {
            _done(null, JwtStrategy.formatPublicKey(keycloakPublicKey));
            return;
          }
        }

        // Fall back to local JWT secret for sandbox mode
        const jwtSecret = process.env.JWT_SECRET || 'INSECURE_DEV_SECRET_CHANGE_IN_PRODUCTION';
        _done(null, jwtSecret);
      },
      passReqToCallback: true,
      audience: undefined,
      issuer: undefined,
    };

    // Call super() first
    super(strategyOptions);

    // Initialize config after super() call
    this.config = {
      localIssuer,
      keycloakIssuer,
      keycloakPublicKey,
      useKeycloakRs256,
    };
  }

  /**
   * Formats the public key if needed (handles different formats)
   */
  private static formatPublicKey(publicKey: string): string | Buffer {
    // Handle multiline PEM format
    if (publicKey.includes('\\n')) {
      return publicKey.replace(/\\n/g, '\n');
    }
    // If it's already in proper PEM format, return as-is
    if (publicKey.includes('-----BEGIN')) {
      return publicKey;
    }
    // Assume single-line base64 encoded key, wrap in PEM headers
    return `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
  }

  /**
   * Validates the JWT payload and returns the user information
   *
   * @param payload - Decoded JWT payload
   * @returns ValidatedUser object with actor details
   * @throws UnauthorizedException if actor not found or issuer invalid
   */
  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    const { localIssuer, keycloakIssuer } = this.config;

    if (payload.iss) {
      const validIssuers = [localIssuer];
      if (keycloakIssuer) {
        validIssuers.push(keycloakIssuer);
      }

      // Also accept if issuer starts with keycloak realm URL
      if (keycloakIssuer && payload.iss.startsWith(keycloakIssuer)) {
        validIssuers.push(payload.iss);
      }

      if (
        !validIssuers.some((issuer) => issuer === payload.iss || payload.iss?.startsWith(issuer))
      ) {
        throw new UnauthorizedException('Invalid token issuer');
      }
    }

    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    let actor: ActorEntity | null = null;

    const isKeycloakToken = payload.iss && keycloakIssuer && payload.iss.startsWith(keycloakIssuer);

    if (isKeycloakToken) {
      const syncResult: SyncResult = await this.keycloakUserSyncService.syncUser(
        payload as unknown as KeycloakTokenPayload
      );
      actor = syncResult.actor;
    } else {
      const foundActor: ActorEntity | null = await this.actorRepository.findOne({
        where: { id: payload.sub },
      });
      actor = foundActor;
    }

    if (!actor) {
      throw new UnauthorizedException('Actor not found');
    }

    const actorId: string = actor.id;
    const actorEmail: string = actor.email;
    const actorWorkspaceId: string = actor.workspaceId ?? '';
    const actorRoles: string[] = actor.roles;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

    return {
      actorId,
      email: actorEmail,
      workspaceId: actorWorkspaceId,
      tenant_id: actorWorkspaceId, // Map workspaceId as tenant_id for multi-tenancy
      roles: actorRoles,
    };
  }
}
