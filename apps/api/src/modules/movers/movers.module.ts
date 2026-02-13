import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { MoversController } from './controllers/movers.controller';
import { VehicleRecommendationService } from './services/vehicle-recommendation.service';
import { MoversPricingService } from './services/movers-pricing.service';

import { LocationIntelligenceModule } from '../location-intelligence/location-intelligence.module';
import { AssetModule } from '../asset/asset.module';
import { PolicyModule } from '../policy/policy.module';

import { DefaultLocationAutocompleteProvider, LOCATION_AUTOCOMPLETE_PROVIDER } from './providers';

/**
 * Movers Module
 * 
 * Provides the Movers homepage experience including:
 * - Location autocomplete
 * - Vehicle recommendations
 * - Pricing calculations
 * - Quote generation
 */
@Module({
  imports: [
    CqrsModule,
    LocationIntelligenceModule,
    AssetModule,
    PolicyModule,
  ],
  controllers: [MoversController],
  providers: [
    VehicleRecommendationService,
    MoversPricingService,
    DefaultLocationAutocompleteProvider,
    {
      provide: LOCATION_AUTOCOMPLETE_PROVIDER,
      useExisting: DefaultLocationAutocompleteProvider,
    },
  ],
  exports: [
    VehicleRecommendationService,
    MoversPricingService,
    LOCATION_AUTOCOMPLETE_PROVIDER,
  ],
})
export class MoversModule {}
