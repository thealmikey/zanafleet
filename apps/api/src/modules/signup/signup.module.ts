import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SignUpController } from './controllers/signup.controller';
import { SignUpSessionEntity } from './entities/signup-session.entity';
import { FinalizeSignUpCommandHandler } from './handlers/finalize-signup.handler';
import { GetSignUpSessionQueryHandler } from './handlers/get-signup-session.handler';
import { InitiateSignUpCommandHandler } from './handlers/initiate-signup.handler';
import { UpdateSignUpStepCommandHandler } from './handlers/update-signup-step.handler';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] SignUpModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([SignUpSessionEntity])];
}

/**
 * SignUp Module
 *
 * Manages the multi-step sign-up orchestration.
 */
@Module({
  imports: [CqrsModule, ...getTypeOrmImports()],
  controllers: [SignUpController],
  providers: [
    InitiateSignUpCommandHandler,
    UpdateSignUpStepCommandHandler,
    FinalizeSignUpCommandHandler,
    GetSignUpSessionQueryHandler,
  ],
  exports: [],
})
export class SignUpModule {}
