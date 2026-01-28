import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SignUpSessionEntity } from './entities/signup-session.entity';

/**
 * SignUp Module
 *
 * Manages the multi-step sign-up orchestration.
 */
@Module({
  imports: [TypeOrmModule.forFeature([SignUpSessionEntity])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class SignUpModule {}
