import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { MoversController } from './controllers/movers.controller';
import { VehicleRecommendationService } from './services/vehicle-recommendation.service';
import { MoversPricingService } from './services/movers-pricing.service';
import { LocationNormalizationService } from './services/location-normalization.service';
import { AIMoveProfileService } from './services/ai-move-profile.service';
import { VehicleMatchingService } from './services/vehicle-matching.service';
import { MoversQuoteOrchestrator } from './orchestrators/movers-quote.orchestrator';
import { IntelligenceContextBuilder, MoveIntelligenceEngine } from './intelligence';

import { LocationIntelligenceModule } from '../location-intelligence/location-intelligence.module';
import { AssetModule } from '../asset/asset.module';
import { PolicyModule } from '../policy/policy.module';
import { EventBusModule } from '../../core/event-bus/event-bus.module';

import { DefaultLocationAutocompleteProvider, LOCATION_AUTOCOMPLETE_PROVIDER } from './providers';

/**
 * Movers Module
 * 
 * Provides the Movers homepage experience including:
 * - Location autocomplete
 * - AI-powered move profile interpretation
 * - Vehicle recommendations with capacity matching
 * - Pricing calculations with policy adjustments
 * - Quote generation and management
 * - Move intelligence layer for recommendations
 */
@Module({
  imports: [
    CqrsModule,
    LocationIntelligenceModule,
    AssetModule,
    PolicyModule,
    EventBusModule,
  ],
  controllers: [MoversController],
  providers: [
    VehicleRecommendationService,
    MoversPricingService,
    LocationNormalizationService,
    AIMoveProfileService,
    VehicleMatchingService,
    MoversQuoteOrchestrator,
    IntelligenceContextBuilder,
    MoveIntelligenceEngine,
    DefaultLocationAutocompleteProvider,
    {
      provide: LOCATION_AUTOCOMPLETE_PROVIDER,
      useExisting: DefaultLocationAutocompleteProvider,
    },
  ],
  exports: [
    VehicleRecommendationService,
    MoversPricingService,
    LocationNormalizationService,
    AIMoveProfileService,
    VehicleMatchingService,
    MoversQuoteOrchestrator,
    IntelligenceContextBuilder,
    MoveIntelligenceEngine,
    LOCATION_AUTOCOMPLETE_PROVIDER,
  ],
})
export class MoversModule {}
