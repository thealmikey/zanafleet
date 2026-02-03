import { ConfigService, registerAs } from '@nestjs/config';
import {
  KeycloakConnectOptions,
  PolicyEnforcementMode,
  TokenValidation,
} from 'nest-keycloak-connect';

/**
 * Keycloak Module Configuration
 *
 * Registers Keycloak settings under the 'keycloak' namespace.
 * Access via ConfigService: configService.get('keycloak.authServerUrl')
 */
export const keycloakConfig = registerAs('keycloak', () => ({
  authServerUrl: process.env.KEYCLOAK_AUTH_SERVER_URL,
  realm: process.env.KEYCLOAK_REALM,
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  secret: process.env.KEYCLOAK_SECRET,
}));

/**
 * Factory function for KeycloakConnectModule.registerAsync()
 *
 * Creates KeycloakConnectOptions from configuration service.
 * Usage:
 * ```
 * KeycloakConnectModule.registerAsync({
 *   imports: [ConfigModule],
 *   inject: [ConfigService],
 *   useFactory: keycloakConnectOptionsFactory,
 * })
 * ```
 */
export const keycloakConnectOptionsFactory = (
  configService: ConfigService
): KeycloakConnectOptions => ({
  authServerUrl: configService.get<string>('keycloak.authServerUrl') || '',
  realm: configService.get<string>('keycloak.realm') || '',
  clientId: configService.get<string>('keycloak.clientId') || '',
  secret: configService.get<string>('keycloak.secret') || '',
  policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
  tokenValidation: TokenValidation.ONLINE,
});
