import { ConfigService } from '@nestjs/config';
import {
  KeycloakConnectOptions,
  PolicyEnforcementMode,
  TokenValidation,
} from 'nest-keycloak-connect';

/**
 * Factory function for KeycloakConnectOptions
 * Used with KeycloakConnectModule.registerAsync()
 */
export const keycloakConnectOptionsFactory = (
  configService: ConfigService
): KeycloakConnectOptions => ({
  authServerUrl: configService.get<string>('keycloak.authServerUrl') || 'http://localhost:8080',
  realm: configService.get<string>('keycloak.realm') || 'zanafleet',
  clientId: configService.get<string>('keycloak.clientId') || 'zanafleet-api',
  secret: configService.get<string>('keycloak.secret') || '',
  policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
  tokenValidation: TokenValidation.ONLINE,
});
