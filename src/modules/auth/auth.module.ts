import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActorEntity } from '../actor/entities/actor.entity';
import { AuthController } from './controllers/auth.controller';
import { LoginCommandHandler } from './handlers/login.handler';

/**
 * Auth Module
 *
 * Handles user authentication.
 */
@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([ActorEntity]),
  ],
  controllers: [AuthController],
  providers: [LoginCommandHandler],
  exports: [],
})
export class AuthModule {}
