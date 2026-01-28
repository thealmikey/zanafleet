import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SignUpSessionEntity } from './entities/signup-session.entity';
import { InitiateSignUpCommandHandler } from './handlers/initiate-signup.handler';

/**
 * SignUp Module
 *
 * Manages the multi-step sign-up orchestration.
 */
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([SignUpSessionEntity])],
  controllers: [],
  providers: [InitiateSignUpCommandHandler],
  exports: [TypeOrmModule],
})
export class SignUpModule {}
