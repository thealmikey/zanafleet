/**
 * Auth Module Exports
 *
 * Public API for the Auth module
 * Other modules should import from this barrel file
 */

// Config
export * from './config/auth.config';
export * from './config/keycloak.config';

// DTOs
export * from './dto/keycloak-token.dto';
export * from './dto/login.dto';

// Commands
export * from './commands/login.command';

// Handlers
export * from './handlers/login.handler';

// Guards
export * from './guards/jwt-auth.guard';

// Strategies
export * from './strategies/jwt.strategy';

// Services - re-export specific items to avoid duplicate exports
export { KeycloakUserSyncService, SyncResult } from './services/keycloak-user-sync.service';

// Module
export * from './auth.module';
