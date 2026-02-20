import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';

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

/**
 * Provide fallback mock repository for sandbox mode
 * This satisfies @InjectRepository(AccountEntity) which uses getRepositoryToken(AccountEntity)
 */
function getSandboxFallbackProviders() {
  if (!isSandBoxMode) {
    return [];
  }
  
  console.log('[DEBUG] AccountModule: Using fallback mock repository in sandbox mode');
  
  // Create a mock repository that satisfies TypeORM's Repository interface
  // Using Repository<any> to avoid complex typing in sandbox mode
  const mockRepository: Record<string, unknown> = {
    save: async (entity: unknown): Promise<unknown> => entity,
    find: async (): Promise<unknown[]> => [],
    findOne: async (): Promise<unknown> => null,
    create: (data: unknown): unknown => data,
    merge: (entity: unknown, ...updates: unknown[]): unknown => ({ ...entity as object, ...updates as object }),
    delete: async (): Promise<{ affected: number }> => ({ affected: 1 }),
    createQueryBuilder: () => null,
  };
  
  return [
    {
      provide: getRepositoryToken(AccountEntity),
      useValue: mockRepository,
    },
  ];
}

const CommandHandlers = [CreateAccountCommandHandler];

@Module({
  imports: [...getTypeOrmImports(), CqrsModule],
  providers: [...CommandHandlers, ...getSandboxFallbackProviders()],
  exports: [...getSandboxFallbackProviders()],
})
export class AccountModule {}
