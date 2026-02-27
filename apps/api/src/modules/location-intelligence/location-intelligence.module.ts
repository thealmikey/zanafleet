import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Neo4jModule } from '../../core/neo4j/neo4j.module';
import { RedisModule } from '../../core/redis/redis.module';

import { GeoController } from './controllers/geo.controller';
import { GeoQueryCoordinator } from './coordinators/geo-query.coordinator';
import { RiderLocationHistoryEntity } from './entities/rider-location-history.entity';
import { RiderLocationSnapshotEntity } from './entities/rider-location-snapshot.entity';
import { UpdateRiderLocationHandler } from './handlers/update-rider-location.handler';
import { GeoProviderRegistry } from './providers/geo-provider-registry.service';
import { NoOpGeoProvider } from './providers/noop-geo.provider';
import { Neo4jRiderCandidateRepository } from './repositories/neo4j-rider-candidate.repository';
import { RiderLocationRepository } from './repositories/rider-location.repository';
import { H3Service } from './services/h3.service';
import { HeatmapService } from './services/heatmap.service';
import { LocationIntelligenceService } from './services/location-intelligence.service';
import { RiderTelemetrySubscriber } from './subscribers/rider-telemetry.subscriber';

/**
 * Location Intelligence Module
 *
 * Provides a multi-provider GIS abstraction layer for geocoding,
 * reverse geocoding, and distance calculations. Also manages rider
 * location storage with PostGIS geometry columns and H3 spatial indexing.
 *
 * Key services:
 * - LocationIntelligenceService: Facade for all location intelligence operations
 * - Neo4jRiderCandidateRepository: Implements RiderCandidateRepository for delivery assignment
 * - HeatmapService: Generates demand/supply density visualizations
 *
 * The module automatically registers the NoOpGeoProvider as the default
 * provider on initialization. Additional providers can be registered
 * at runtime via the GeoProviderRegistry.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([RiderLocationSnapshotEntity, RiderLocationHistoryEntity]),
    CqrsModule,

    Neo4jModule,
    RedisModule.forRoot(),
  ],
  controllers: [GeoController],
  providers: [
    GeoProviderRegistry,
    NoOpGeoProvider,
    H3Service,
    HeatmapService,
    LocationIntelligenceService,
    RiderLocationRepository,
    Neo4jRiderCandidateRepository,
    UpdateRiderLocationHandler,
    // Use factory to avoid DI resolution issues with optional config
    {
      provide: RiderTelemetrySubscriber,
      useFactory: (commandBus: CommandBus) => new RiderTelemetrySubscriber(commandBus),
      inject: [CommandBus],
    },
    GeoQueryCoordinator,
  ],
  exports: [
    TypeOrmModule,
    GeoProviderRegistry,
    NoOpGeoProvider,
    H3Service,
    HeatmapService,
    LocationIntelligenceService,
    RiderLocationRepository,
    Neo4jRiderCandidateRepository,
    UpdateRiderLocationHandler,
    RiderTelemetrySubscriber,
    GeoQueryCoordinator,
  ],
})
export class LocationIntelligenceModule implements OnModuleInit {
  constructor(
    private readonly registry: GeoProviderRegistry,
    private readonly noOpProvider: NoOpGeoProvider
  ) {}

  onModuleInit(): void {
    this.registry.register(this.noOpProvider, true);
  }
}
