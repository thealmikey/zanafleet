import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  GeoPoint,
  GeoBounds,
  ZoneCluster,
  ETAResult,
  DistanceResult,
  NearbyRidersParams,
  Address,
} from '@zanafleet/contracts';
import { v4 as uuidv4 } from 'uuid';

import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { HeatmapService } from '../services/heatmap.service';
import { LocationIntelligenceService } from '../services/location-intelligence.service';
import { HeatmapCell, HeatmapParams } from '../types/heatmap.types';
import { RiderCandidate } from '../types/rider-candidate.types';
import { GeoProviderRegistry } from '../providers/geo-provider-registry.service';

/**
 * Cache entry with TTL tracking
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Configuration for the GeoQueryCoordinator
 */
export interface GeoQueryConfig {
  cacheTtlMs: number;
  defaultGridSize: number;
  averageSpeedMps: number;
}

const DEFAULT_CONFIG: GeoQueryConfig = {
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes
  defaultGridSize: 5, // 5x5 grid
  averageSpeedMps: 1.4, // Average walking speed in m/s
};

const EARTH_RADIUS_METERS = 6371000;

/**
 * GeoQueryCoordinator
 *
 * Coordinates geographic queries across location intelligence services.
 * Provides caching, distance/ETA calculations, and zone clustering.
 */
@Injectable()
export class GeoQueryCoordinator {
  private readonly logger = new Logger(GeoQueryCoordinator.name);
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private config: GeoQueryConfig = { ...DEFAULT_CONFIG };

  constructor(
    private readonly locationIntelligenceService: LocationIntelligenceService,
    private readonly heatmapService: HeatmapService,
    private readonly registry: GeoProviderRegistry,
    @Optional() private readonly eventBusService?: EventBusService,
  ) { }

  /**
   * Find nearby riders within the specified radius.
   * Results are cached for the configured TTL.
   */
  async findNearbyRiders(params: NearbyRidersParams): Promise<RiderCandidate[]> {
    const cacheKey = this.buildCacheKey('nearby-riders', params);
    const cached = this.getFromCache<RiderCandidate[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for nearby riders: ${cacheKey}`);
      return cached;
    }

    const riders = await this.locationIntelligenceService.findNearbyRiders({
      latitude: params.latitude,
      longitude: params.longitude,
      radiusMeters: params.radiusMeters,
      limit: params.limit,
      now: params.now,
    });

    this.setCache(cacheKey, riders);
    await this.emitQueryExecutedEvent('findNearbyRiders', params);

    return riders;
  }

  /**
   * Search for an address or place.
   */
  async searchAddress(query: string): Promise<Address[]> {
    const cacheKey = this.buildCacheKey('search-address', { query });
    const cached = this.getFromCache<Address[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for address search: ${cacheKey}`);
      return cached;
    }

    const provider = this.registry.getDefault();

    if (!provider) {
      this.logger.warn('No geo provider available for address search');
      return [];
    }
    // Assuming the provider has a method for searching, or we default to geocoding
    // In a real scenario, we might want a specific 'search' or 'autocomplete' method
    // For now, we'll try to use geocode if available, or just return empty if not supported
    // The GeoProvider interface currently only has geocode(address: string): Promise<GeoPoint | null>
    // We might need to extend it to support searching returning multiple addresses

    // For this implementation, let's just use geocode and return a single result if found
    const point = await provider.geocode(query);
    const results: Address[] = [];

    if (point) {
      // If we got a point, try to reverse geocode it to get the full address details if needed, 
      // or construct a basic Address object. 
      // Ideally, geocode should return Address details. 
      // Let's rely on reverseGeocode for now to get the details from the point
      const address = await provider.reverseGeocode(point);
      if (address) {
        results.push(address);
      }
    }

    this.setCache(cacheKey, results);
    await this.emitQueryExecutedEvent('searchAddress', { query });

    return results;
  }

  /**
   * Get demand heatmap for the specified area.
   */
  async getDemandHeatmap(params: HeatmapParams): Promise<HeatmapCell[]> {
    const cacheKey = this.buildCacheKey('heatmap', params);
    const cached = this.getFromCache<HeatmapCell[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for heatmap: ${cacheKey}`);
      return cached;
    }

    const heatmap = await this.heatmapService.getActivityHeatmap(params);

    this.setCache(cacheKey, heatmap);
    await this.emitQueryExecutedEvent('getDemandHeatmap', params);

    return heatmap;
  }

  /**
   * Get zone clusters for the specified geographic bounds.
   * Divides the area into a grid and groups riders by cell.
   */
  async getZoneClusters(bounds: GeoBounds): Promise<ZoneCluster[]> {
    const cacheKey = this.buildCacheKey('zone-clusters', bounds);
    const cached = this.getFromCache<ZoneCluster[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for zone clusters: ${cacheKey}`);
      return cached;
    }

    const center: GeoPoint = {
      latitude: (bounds.minLat + bounds.maxLat) / 2,
      longitude: (bounds.minLng + bounds.maxLng) / 2,
    };

    const radiusMeters = this.calculateHaversineDistance(
      { latitude: bounds.minLat, longitude: bounds.minLng },
      { latitude: bounds.maxLat, longitude: bounds.maxLng },
    ) / 2;

    const riders = await this.locationIntelligenceService.findNearbyRiders({
      latitude: center.latitude,
      longitude: center.longitude,
      radiusMeters: Math.max(radiusMeters, 1000),
    });

    const clusters = this.clusterRidersIntoZones(riders, bounds);

    this.setCache(cacheKey, clusters);
    await this.emitQueryExecutedEvent('getZoneClusters', bounds);

    return clusters;
  }

  /**
   * Calculate estimated time of arrival between two points.
   * Uses Haversine formula for distance and average speed for time.
   */
  async calculateETA(origin: GeoPoint, destination: GeoPoint): Promise<ETAResult> {
    const distanceMeters = this.calculateHaversineDistance(origin, destination);
    const durationSeconds = Math.round(distanceMeters / this.config.averageSpeedMps);

    const confidence = this.determineConfidence(distanceMeters);

    await this.emitQueryExecutedEvent('calculateETA', { origin, destination });

    return {
      durationSeconds,
      distanceMeters: Math.round(distanceMeters),
      confidence,
      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate route distance between two points using Haversine formula.
   */
  async calculateRouteDistance(
    origin: GeoPoint,
    destination: GeoPoint,
  ): Promise<DistanceResult> {
    const distanceMeters = this.calculateHaversineDistance(origin, destination);
    const confidence = this.determineConfidence(distanceMeters);

    await this.emitQueryExecutedEvent('calculateRouteDistance', { origin, destination });

    return {
      distanceMeters: Math.round(distanceMeters),
      confidence,
      calculatedAt: new Date(),
    };
  }

  /**
   * Check if a point is within a service area.
   * Currently returns true for all points (placeholder implementation).
   */
  async isWithinServiceArea(point: GeoPoint, areaId: string): Promise<boolean> {
    this.logger.debug(`Checking service area ${areaId} for point: ${point.latitude}, ${point.longitude}`);

    await this.emitQueryExecutedEvent('isWithinServiceArea', { point, areaId });

    return true;
  }

  /**
   * Calculate Haversine distance between two geographic points.
   * Returns distance in meters.
   */
  calculateHaversineDistance(point1: GeoPoint, point2: GeoPoint): number {
    const lat1Rad = this.toRadians(point1.latitude);
    const lat2Rad = this.toRadians(point2.latitude);
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLng = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_METERS * c;
  }

  /**
   * Update coordinator configuration.
   */
  updateConfig(config: Partial<GeoQueryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): GeoQueryConfig {
    return { ...this.config };
  }

  /**
   * Clear all cached entries.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring.
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  private clusterRidersIntoZones(
    riders: RiderCandidate[],
    bounds: GeoBounds,
  ): ZoneCluster[] {
    const gridSize = this.config.defaultGridSize;
    const latStep = (bounds.maxLat - bounds.minLat) / gridSize;
    const lngStep = (bounds.maxLng - bounds.minLng) / gridSize;

    const grid = new Map<string, RiderCandidate[]>();

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        grid.set(`${row}-${col}`, []);
      }
    }

    for (const rider of riders) {
      const location = rider.lastKnownLocation;

      if (
        location.latitude < bounds.minLat ||
        location.latitude > bounds.maxLat ||
        location.longitude < bounds.minLng ||
        location.longitude > bounds.maxLng
      ) {
        continue;
      }

      const row = Math.min(
        Math.floor((location.latitude - bounds.minLat) / latStep),
        gridSize - 1,
      );
      const col = Math.min(
        Math.floor((location.longitude - bounds.minLng) / lngStep),
        gridSize - 1,
      );

      const key = `${row}-${col}`;
      const cell = grid.get(key);
      if (cell) {
        cell.push(rider);
      }
    }

    const clusters: ZoneCluster[] = [];

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const key = `${row}-${col}`;
        const cellRiders = grid.get(key) ?? [];

        const cellMinLat = bounds.minLat + row * latStep;
        const cellMaxLat = bounds.minLat + (row + 1) * latStep;
        const cellMinLng = bounds.minLng + col * lngStep;
        const cellMaxLng = bounds.minLng + (col + 1) * lngStep;

        const cellBounds: GeoBounds = {
          minLat: cellMinLat,
          maxLat: cellMaxLat,
          minLng: cellMinLng,
          maxLng: cellMaxLng,
        };

        const cellCenter: GeoPoint = {
          latitude: (cellMinLat + cellMaxLat) / 2,
          longitude: (cellMinLng + cellMaxLng) / 2,
        };

        const busyCount = cellRiders.filter(
          (r) => r.busyWindows && r.busyWindows.length > 0,
        ).length;
        const averageLoad = cellRiders.length > 0 ? busyCount / cellRiders.length : 0;

        clusters.push({
          zoneId: `zone-${row}-${col}`,
          center: cellCenter,
          bounds: cellBounds,
          riderCount: cellRiders.length,
          averageLoad,
        });
      }
    }

    return clusters;
  }

  private determineConfidence(distanceMeters: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (distanceMeters < 1000) {
      return 'HIGH';
    } else if (distanceMeters < 10000) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private buildCacheKey(prefix: string, params: unknown): string {
    return `${prefix}-${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  private setCache<T>(key: string, value: T): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + this.config.cacheTtlMs,
    };
    this.cache.set(key, entry);
  }

  private async emitQueryExecutedEvent(
    queryType: string,
    params: unknown,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Location.Query.ExecutedV1',
      aggregateId: uuidv4(),
      aggregateType: 'GeoQuery',
      payload: {
        queryType,
        params,
        executedAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
    };

    await this.eventBusService
      .publish(NatsSubjects.Location.QUERY_EXECUTED_V1, event)
      .catch((error) => {
        this.logger.error(`Failed to publish QueryExecutedEvent: ${error.message}`);
      });
  }
}
