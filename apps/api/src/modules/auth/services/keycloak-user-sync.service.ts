import { ActorType } from '@api/modules/actor/dto/actor.enums';
import { ActorEntity } from '@api/modules/actor/entities/actor.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    @InjectRepository(ActorEntity)
    private readonly actorRepository: Repository<ActorEntity>
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
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
    const email: string | undefined = payload.email;

    if (!email) {
      throw new Error('Keycloak token missing email claim');
    }

    const existingActor: ActorEntity | null = await this.actorRepository.findOne({
      where: { email },
    });

    if (existingActor) {
      const updatedActor: ActorEntity = await this.updateExistingActor(existingActor, payload);
      return { actor: updatedActor, created: false };
    }

    const newActor: ActorEntity = await this.createNewActor(email, payload);
    return { actor: newActor, created: true };
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  }

  /**
   * Create a new Actor from Keycloak token data
   */
  private async createNewActor(email: string, payload: KeycloakTokenPayload): Promise<ActorEntity> {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
    const actorId = uuidv4();
    const username = payload.preferred_username || email.split('@')[0];
    const roles = this.extractRoles(payload);

    const actorData: Partial<ActorEntity> = {
      id: actorId,
      type: ActorType.Rider,
      email,
      username,
      passwordHash: '',
      roles,
      workspaceId: this.defaultWorkspaceId,
      linkedWallets: [],
    };

    const createdActor = this.actorRepository.create(actorData);
    const savedActor = await this.actorRepository.save(createdActor);

    this.logger.log(`Created new Actor ${actorId} for Keycloak user ${email}`);

    return savedActor;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  }

  /**
   * Update an existing Actor with latest Keycloak data
   */
  private async updateExistingActor(
    actor: ActorEntity,
    payload: KeycloakTokenPayload
  ): Promise<ActorEntity> {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
    const roles = this.extractRoles(payload);

    const currentRoles: string[] = actor.roles;
    const rolesChanged = JSON.stringify(currentRoles.sort()) !== JSON.stringify(roles.sort());

    if (rolesChanged) {
      actor.roles = roles;
      await this.actorRepository.save(actor);
      const actorIdForLog: string = actor.id;
      this.logger.log(`Updated roles for Actor ${actorIdForLog}`);
    }

    return actor;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
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
