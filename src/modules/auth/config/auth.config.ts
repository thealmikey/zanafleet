import { registerAs } from '@nestjs/config';

/**
 * JWT Configuration
 *
 * Environment variables:
 * - JWT_SECRET: Secret key for signing JWT tokens (required)
 * - JWT_EXPIRATION: Token expiration time (default: '1h')
 * - JWT_ISSUER: Token issuer identifier (default: 'zanafleet')
 */
export const authConfig = registerAs('auth', () => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION',
    expiresIn: process.env.JWT_EXPIRATION || '1h',
    issuer: process.env.JWT_ISSUER || 'zanafleet',
  },
}));

/**
 * Keycloak Configuration
 *
 * Environment variables:
 * - KEYCLOAK_REALM: Keycloak realm name (required)
 * - KEYCLOAK_AUTH_SERVER_URL: Keycloak server URL (required)
 * - KEYCLOAK_CLIENT_ID: Client ID registered in Keycloak (required)
 * - KEYCLOAK_SECRET: Client secret for confidential clients (required)
 * - KEYCLOAK_BEARER_ONLY: Whether to use bearer-only mode (default: true)
 */
export const keycloakConfig = registerAs('keycloak', () => ({
  realm: process.env.KEYCLOAK_REALM || 'zanafleet',
  authServerUrl: process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080',
  clientId: process.env.KEYCLOAK_CLIENT_ID || 'zanafleet-api',
  secret: process.env.KEYCLOAK_SECRET || '',
  bearerOnly: process.env.KEYCLOAK_BEARER_ONLY !== 'false',
}));

export type AuthConfig = ReturnType<typeof authConfig>;
export type KeycloakConfig = ReturnType<typeof keycloakConfig>;
