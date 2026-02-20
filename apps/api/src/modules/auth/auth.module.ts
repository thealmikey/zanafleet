import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeycloakConnectModule } from 'nest-keycloak-connect';

import { ActorEntity } from '../actor/entities/actor.entity';

import { authConfig } from './config/auth.config';
import { keycloakConfig, keycloakConnectOptionsFactory } from './config/keycloak.config';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginCommandHandler } from './handlers/login.handler';
import { KeycloakUserSyncService } from './services/keycloak-user-sync.service';
import { JwtStrategy } from './strategies/jwt.strategy';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] AuthModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([ActorEntity])];
}

/**
 * Auth Module
 *
 * Handles user authentication with JWT and Keycloak support.
 * Provides JwtAuthGuard for protecting routes.
 */
@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    ConfigModule.forFeature(keycloakConfig),
    CqrsModule,
    ...getTypeOrmImports(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwt.expiresIn') || '1h',
          issuer: configService.get<string>('auth.jwt.issuer') || 'zanafleet',
        },
      }),
      inject: [ConfigService],
    }),
    KeycloakConnectModule.registerAsync({
      imports: [ConfigModule],
      useFactory: keycloakConnectOptionsFactory,
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [LoginCommandHandler, JwtStrategy, JwtAuthGuard, KeycloakUserSyncService],
  exports: [JwtAuthGuard, KeycloakUserSyncService],
})
export class AuthModule {}
