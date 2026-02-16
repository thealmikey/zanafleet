/**
 * Sandbox Keycloak User Sync Service
 *
 * Stub implementation for sandbox mode that doesn't actually sync with Keycloak.
 * Provides the same interface as KeycloakUserSyncService for compatibility.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface KeycloakTokenPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
}

export interface SyncResult {
  actorId: string;
  isNew: boolean;
}

/**
 * Sandbox Keycloak User Sync Service
 *
 * Returns dummy data in sandbox mode without actually syncing with Keycloak.
 */
@Injectable()
export class SandboxKeycloakUserSyncService {
  private readonly logger = new Logger(SandboxKeycloakUserSyncService.name);

  /**
   * Sync user - returns dummy result in sandbox mode
   */
  async syncUser(payload: KeycloakTokenPayload): Promise<SyncResult> {
    this.logger.log(`[SANDBOX] Stubbing Keycloak user sync for: ${payload.sub}`);
    // Return a dummy actor ID based on the sub claim
    return {
      actorId: `sandbox-${payload.sub}`,
      isNew: true,
    };
  }

  /**
   * Check if token is from Keycloak - always returns false in sandbox
   */
  isKeycloakToken(payload: { iss?: string }): boolean {
    return false;
  }
}
