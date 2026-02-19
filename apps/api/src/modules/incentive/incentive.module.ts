import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

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
  providers: [IncentiveEligibilityService, IncentiveEngineService, ...CommandHandlers],
  exports: isSandBoxMode 
    ? [IncentiveEligibilityService, IncentiveEngineService]
    : [IncentiveEligibilityService, IncentiveEngineService],
})
export class IncentiveModule {}
