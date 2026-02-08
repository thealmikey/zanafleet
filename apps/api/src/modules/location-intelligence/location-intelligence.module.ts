import { Module, OnModuleInit } from '@nestjs/common';
import { GeoProviderRegistry } from './providers/geo-provider-registry.service';
import { NoOpGeoProvider } from './providers/noop-geo.provider';
import { H3Service } from './services/h3.service';

/**
 * Location Intelligence Module
 *
 * Provides a multi-provider GIS abstraction layer for geocoding,
 * reverse geocoding, and distance calculations.
 *
 * The module automatically registers the NoOpGeoProvider as the default
 * provider on initialization. Additional providers can be registered
 * at runtime via the GeoProviderRegistry.
 */
@Module({
  providers: [GeoProviderRegistry, NoOpGeoProvider, H3Service],
  exports: [GeoProviderRegistry, NoOpGeoProvider, H3Service],
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
