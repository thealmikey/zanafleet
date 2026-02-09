import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LedgerModule } from '../ledger/ledger.module';
import { CampaignEntity } from './entities/campaign.entity';
import { IncentiveApplicationEntity } from './entities/incentive-application.entity';
import { CreateCampaignCommandHandler } from './handlers/create-campaign.handler';
import { ApplyIncentiveCommandHandler } from './handlers/apply-incentive.handler';
import { IncentiveEligibilityService } from './services/incentive-eligibility.service';
import { IncentiveEngineService } from './services/incentive-engine.service';

const CommandHandlers = [CreateCampaignCommandHandler, ApplyIncentiveCommandHandler];

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignEntity, IncentiveApplicationEntity]),
    CqrsModule,
    LedgerModule,
  ],
  providers: [IncentiveEligibilityService, IncentiveEngineService, ...CommandHandlers],
  exports: [TypeOrmModule, IncentiveEligibilityService, IncentiveEngineService],
})
export class IncentiveModule {}
