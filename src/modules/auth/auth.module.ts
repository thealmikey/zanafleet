import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActorEntity } from '../actor/entities/actor.entity';

import { authConfig, keycloakConfig } from './config/auth.config';
import { AuthController } from './controllers/auth.controller';
import { LoginCommandHandler } from './handlers/login.handler';

/**
 * Auth Module
 *
 * Handles user authentication with JWT and Keycloak support.
 */
@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    ConfigModule.forFeature(keycloakConfig),
    CqrsModule,
    TypeOrmModule.forFeature([ActorEntity]),
  ],
  controllers: [AuthController],
  providers: [LoginCommandHandler],
  exports: [],
})
export class AuthModule {}
