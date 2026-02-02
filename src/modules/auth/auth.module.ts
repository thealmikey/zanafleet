import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActorEntity } from '../actor/entities/actor.entity';

import { authConfig, keycloakConfig } from './config/auth.config';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginCommandHandler } from './handlers/login.handler';
import { JwtStrategy } from './strategies/jwt.strategy';

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
    TypeOrmModule.forFeature([ActorEntity]),
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
  ],
  controllers: [AuthController],
  providers: [LoginCommandHandler, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
