import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';

import { ActorEntity } from '../../actor/entities/actor.entity';
import {
  KeycloakTokenPayload,
  KeycloakUserSyncService,
} from '../services/keycloak-user-sync.service';

/**
 * JWT Payload interface for token claims
 */
export interface JwtPayload {
  sub: string; // actorId
  email: string;
  workspaceId: string;
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
  roles: string[];
}

/**
 * JWT Strategy for Passport authentication
 *
 * Supports both local JWTs and Keycloak-issued tokens.
 * Validates the token and verifies the actor exists in the database.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly localIssuer: string;
  private readonly keycloakIssuer: string;

  constructor(
    configService: ConfigService,
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>,
    private readonly keycloakUserSyncService: KeycloakUserSyncService
  ) {
    const jwtSecret = configService.get<string>('auth.jwt.secret');
    const jwtIssuer = configService.get<string>('auth.jwt.issuer') || 'zanafleet';
    const keycloakAuthUrl = configService.get<string>('keycloak.authServerUrl');
    const keycloakRealm = configService.get<string>('keycloak.realm');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });

    this.localIssuer = jwtIssuer;
    this.keycloakIssuer =
      keycloakAuthUrl && keycloakRealm ? `${keycloakAuthUrl}/realms/${keycloakRealm}` : '';
  }

  /**
   * Validates the JWT payload and returns the user information
   *
   * @param payload - Decoded JWT payload
   * @returns ValidatedUser object with actor details
   * @throws UnauthorizedException if actor not found or issuer invalid
   */
  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    if (payload.iss) {
      const validIssuers = [this.localIssuer];
      if (this.keycloakIssuer) {
        validIssuers.push(this.keycloakIssuer);
      }

      if (!validIssuers.includes(payload.iss)) {
        throw new UnauthorizedException('Invalid token issuer');
      }
    }

    let actor: ActorEntity | null = null;

    const isKeycloakToken =
      payload.iss && this.keycloakIssuer && payload.iss === this.keycloakIssuer;

    if (isKeycloakToken) {
      const syncResult = await this.keycloakUserSyncService.syncUser(
        payload as unknown as KeycloakTokenPayload
      );
      actor = syncResult.actor;
    } else {
      actor = await this.actorRepository.findOne({
        where: { id: payload.sub },
      });
    }

    if (!actor) {
      throw new UnauthorizedException('Actor not found');
    }

    return {
      actorId: actor.id,
      email: actor.email,
      workspaceId: actor.workspaceId,
      roles: actor.roles,
    };
  }
}
