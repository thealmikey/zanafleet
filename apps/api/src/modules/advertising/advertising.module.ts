import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';

import { AdCampaign } from './entities/ad-campaign.entity';
import { AdClick } from './entities/ad-click.entity';
import { AdImpression } from './entities/ad-impression.entity';
import { VisibilityToken } from './entities/visibility-token.entity';

import { VisibilityScoringService } from './services/visibility-scoring.service';

// Re-export for convenience
export * from './dto/advertising.enums';
export * from './entities/ad-campaign.entity';
export * from './entities/ad-click.entity';
export * from './entities/ad-impression.entity';
export * from './entities/visibility-token.entity';
export * from './events/advertising.events';
export * from './services/visibility-scoring.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdCampaign, AdImpression, AdClick, VisibilityToken]),
    CqrsModule,
    EventBusModule,
  ],
  providers: [VisibilityScoringService],
  exports: [TypeOrmModule, VisibilityScoringService],
})
export class AdvertisingModule {}
