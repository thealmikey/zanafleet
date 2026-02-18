import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from './entities/account.entity';
import { CreateAccountCommandHandler } from './handlers/create-account.handler';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] AccountModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([AccountEntity])];
}

const CommandHandlers = [CreateAccountCommandHandler];

@Module({
  imports: [...getTypeOrmImports(), CqrsModule],
  providers: [...CommandHandlers],
  exports: [TypeOrmModule],
})
export class AccountModule {}
