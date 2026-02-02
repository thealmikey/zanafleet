import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ActorType } from '../../actor/dto/actor.enums';
import { ActorEntity } from '../../actor/entities/actor.entity';

/**
 * Keycloak token payload structure
 */
export interface KeycloakTokenPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: {
    [clientId: string]: {
      roles?: string[];
    };
  };
  iss: string;
}

/**
 * Result of user sync operation
 */
export interface SyncResult {
  actor: ActorEntity;
  created: boolean;
}

/**
 * Service to synchronize Keycloak users with local ActorEntity
 *
 * On first Keycloak login, creates an Actor if not exists.
 * Maps Keycloak user attributes to Actor fields.
 */
@Injectable()
export class KeycloakUserSyncService {
  private readonly logger = new Logger(KeycloakUserSyncService.name);

  private readonly defaultWorkspaceId: string;

  constructor(
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>,
  ) {
    this.defaultWorkspaceId =
      process.env.DEFAULT_WORKSPACE_ID || '00000000-0000-0000-0000-000000000000';
  }

  /**
   * Sync a Keycloak user with local Actor database
   * Creates new Actor on first login, updates existing Actor on subsequent logins
   *
   * @param payload - Decoded Keycloak token payload
   * @returns SyncResult with actor and whether it was newly created
   */
  async syncUser(payload: KeycloakTokenPayload): Promise<SyncResult> {
    const email = payload.email;

    if (!email) {
      throw new Error('Keycloak token missing email claim');
    }

    let actor = await this.actorRepository.findOne({
      where: { email },
    });

    if (actor) {
      actor = await this.updateExistingActor(actor, payload);
      return { actor, created: false };
    }

    actor = await this.createNewActor(email, payload);
    return { actor, created: true };
  }

  /**
   * Create a new Actor from Keycloak token data
   */
  private async createNewActor(
    email: string,
    payload: KeycloakTokenPayload,
  ): Promise<ActorEntity> {
    const actorId = uuidv4();
    const username = payload.preferred_username || email.split('@')[0];
    const roles = this.extractRoles(payload);

    const actorData = {
      id: actorId,
      type: ActorType.INDIVIDUAL,
      email,
      username,
      passwordHash: '',
      roles,
      workspaceId: this.defaultWorkspaceId,
      linkedWallets: [],
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const actor = this.actorRepository.create(actorData);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const savedActor = await this.actorRepository.save(actor);

    this.logger.log(`Created new Actor ${actorId} for Keycloak user ${email}`);

    return savedActor;
  }

  /**
   * Update an existing Actor with latest Keycloak data
   */
  private async updateExistingActor(
    actor: ActorEntity,
    payload: KeycloakTokenPayload,
  ): Promise<ActorEntity> {
    const roles = this.extractRoles(payload);

    const rolesChanged =
      JSON.stringify(actor.roles.sort()) !== JSON.stringify(roles.sort());

    if (rolesChanged) {
      actor.roles = roles;
      await this.actorRepository.save(actor);
      this.logger.log(`Updated roles for Actor ${actor.id}`);
    }

    return actor;
  }

  /**
   * Extract role IDs from Keycloak token
   * Maps Keycloak realm roles to local role identifiers
   */
  private extractRoles(payload: KeycloakTokenPayload): string[] {
    const realmRoles = payload.realm_access?.roles || [];

    return realmRoles
      .filter((role) => !role.startsWith('uma_') && !role.startsWith('offline_'))
      .map((role) => role);
  }

  /**
   * Check if a token payload is from Keycloak (by issuer pattern)
   */
  isKeycloakToken(payload: { iss?: string }): boolean {
    if (!payload.iss) return false;
    return payload.iss.includes('/realms/');
  }
}
