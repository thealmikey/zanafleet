import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from './entities/account.entity';
import { CreateAccountCommandHandler } from './handlers/create-account.handler';

const CommandHandlers = [CreateAccountCommandHandler];

@Module({
  imports: [TypeOrmModule.forFeature([AccountEntity]), CqrsModule],
  providers: [...CommandHandlers],
  exports: [TypeOrmModule],
})
export class AccountModule {}
