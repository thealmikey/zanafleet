import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SignUpController } from './controllers/signup.controller';
import { SignUpSessionEntity } from './entities/signup-session.entity';
import { FinalizeSignUpCommandHandler } from './handlers/finalize-signup.handler';
import { GetSignUpSessionQueryHandler } from './handlers/get-signup-session.handler';
import { InitiateSignUpCommandHandler } from './handlers/initiate-signup.handler';
import { UpdateSignUpStepCommandHandler } from './handlers/update-signup-step.handler';

/**
 * SignUp Module
 *
 * Manages the multi-step sign-up orchestration.
 */
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([SignUpSessionEntity])],
  controllers: [SignUpController],
  providers: [
    InitiateSignUpCommandHandler,
    UpdateSignUpStepCommandHandler,
    FinalizeSignUpCommandHandler,
    GetSignUpSessionQueryHandler,
  ],
  exports: [TypeOrmModule],
})
export class SignUpModule {}
