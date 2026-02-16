/**
 * Sandbox Auth Module
 *
 * Provides stub authentication for sandbox mode without requiring Keycloak.
 * This module is used instead of the real AuthModule when running in sandbox mode.
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { authConfig } from '../../modules/auth/config/auth.config';
import { SandboxAuthGuard } from './sandbox-auth.guard';
import { SandboxKeycloakUserSyncService } from './sandbox-keycloak-user-sync.service';

@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    CqrsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwt.secret') || 'sandbox-secret',
        signOptions: {
          expiresIn: configService.get<string>('auth.jwt.expiresIn') || '1h',
          issuer: configService.get<string>('auth.jwt.issuer') || 'zanafleet',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    // Use sandbox-specific auth guard that bypasses authentication
    SandboxAuthGuard,
    // Provide stub Keycloak sync service
    SandboxKeycloakUserSyncService,
  ],
  exports: [
    // Export sandbox auth guard as JwtAuthGuard replacement
    SandboxAuthGuard,
    JwtModule,
    // Export stub as KeycloakUserSyncService replacement
    SandboxKeycloakUserSyncService,
  ],
})
export class SandboxAuthModule {}
