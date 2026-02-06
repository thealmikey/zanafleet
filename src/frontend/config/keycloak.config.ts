import Keycloak from 'keycloak-js';

/**
 * Keycloak configuration for the frontend
 *
 * Environment variables (React apps require REACT_APP_ prefix):
 * - REACT_APP_KEYCLOAK_URL: Keycloak server URL
 * - REACT_APP_KEYCLOAK_REALM: Keycloak realm name
 * - REACT_APP_KEYCLOAK_CLIENT_ID: Public client ID for the web app
 */
export const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'zanafleet',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'zanafleet-web',
};

/**
 * Keycloak instance singleton
 * Used for authentication operations throughout the frontend
 */
export const keycloakInstance = new Keycloak(keycloakConfig);

export type KeycloakInstance = typeof keycloakInstance;
