import { Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';

import { LedgerModule } from '../ledger/ledger.module';

import { CampaignEntity } from './entities/campaign.entity';
import { IncentiveApplicationEntity } from './entities/incentive-application.entity';
import { ApplyIncentiveCommandHandler } from './handlers/apply-incentive.handler';
import { CreateCampaignCommandHandler } from './handlers/create-campaign.handler';
import { IncentiveEligibilityService } from './services/incentive-eligibility.service';
import { IncentiveEngineService } from './services/incentive-engine.service';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Creates a mock repository for sandbox mode
 */
function createMockRepository<T = unknown>(): Record<string, unknown> {
  return {
    save: async (entity: T): Promise<T> => entity,
    find: async (): Promise<T[]> => [],
    findOne: async (): Promise<T | null> => null,
    findOneBy: async (): Promise<T | null> => null,
    create: (data: Partial<T>): T => data as T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    merge: (entity: T, ...updates: any[]): T => ({ ...entity, ...Object.assign({}, ...updates) }),
    delete: async (): Promise<{ affected: number }> => ({ affected: 1 }),
    createQueryBuilder: () => null,
    manager: { save: async (entity: T): Promise<T> => entity },
  };
}

/**
 * Creates fallback providers for TypeORM entities in sandbox mode
 */
function createTypeOrmFallbackProviders(...entities: (new () => unknown)[]): Provider[] {
  if (!isSandBoxMode) return [];
  return entities.map(entity => ({
    provide: getRepositoryToken(entity),
    useValue: createMockRepository(),
  }));
}

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] IncentiveModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([CampaignEntity, IncentiveApplicationEntity])];
}

const CommandHandlers = [CreateCampaignCommandHandler, ApplyIncentiveCommandHandler];

@Module({
  imports: [
    ...getTypeOrmImports(),
    CqrsModule,
    LedgerModule,
  ],
  providers: [
    IncentiveEligibilityService, 
    IncentiveEngineService, 
    ...CommandHandlers,
    ...createTypeOrmFallbackProviders(CampaignEntity, IncentiveApplicationEntity),
  ],
  exports: isSandBoxMode 
    ? [IncentiveEligibilityService, IncentiveEngineService]
    : [IncentiveEligibilityService, IncentiveEngineService],
})
export class IncentiveModule {}
