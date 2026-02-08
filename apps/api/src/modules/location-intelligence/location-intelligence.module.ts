import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiderLocationSnapshotEntity } from './entities/rider-location-snapshot.entity';
import { RiderLocationHistoryEntity } from './entities/rider-location-history.entity';
import { GeoProviderRegistry } from './providers/geo-provider-registry.service';
import { NoOpGeoProvider } from './providers/noop-geo.provider';
import { H3Service } from './services/h3.service';
import { RiderLocationRepository } from './repositories/rider-location.repository';

/**
 * Location Intelligence Module
 *
 * Provides a multi-provider GIS abstraction layer for geocoding,
 * reverse geocoding, and distance calculations. Also manages rider
 * location storage with PostGIS geometry columns and H3 spatial indexing.
 *
 * The module automatically registers the NoOpGeoProvider as the default
 * provider on initialization. Additional providers can be registered
 * at runtime via the GeoProviderRegistry.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([RiderLocationSnapshotEntity, RiderLocationHistoryEntity]),
  ],
  providers: [GeoProviderRegistry, NoOpGeoProvider, H3Service, RiderLocationRepository],
  exports: [
    TypeOrmModule,
    GeoProviderRegistry,
    NoOpGeoProvider,
    H3Service,
    RiderLocationRepository,
  ],
})
export class LocationIntelligenceModule implements OnModuleInit {
  constructor(
    private readonly registry: GeoProviderRegistry,
    private readonly noOpProvider: NoOpGeoProvider,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.noOpProvider, true);
  }
}
