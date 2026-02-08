import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RiderTelemetryData } from '@zanafleet/contracts';
import { UpdateRiderLocationCommand } from '../commands/update-rider-location.command';
import { GeoPoint } from '../providers/geo-provider.interface';
import { Neo4jRiderCandidateRepository } from '../repositories/neo4j-rider-candidate.repository';
import { RiderLocationRepository } from '../repositories/rider-location.repository';
import { HeatmapService } from './heatmap.service';
import {
  FindNearbyCandidatesParams,
  RiderCandidate,
} from '../types/rider-candidate.types';
import { HeatmapCell, HeatmapParams } from '../types/heatmap.types';

/**
 * Time range for historical queries.
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Facade service exposing location intelligence capabilities.
 *
 * Provides a unified interface for:
 * - Updating rider locations from telemetry
 * - Finding nearby riders for delivery assignment
 * - Generating heatmaps for demand/supply visualization
 * - Retrieving historical rider paths
 */
@Injectable()
export class LocationIntelligenceService {
  private readonly logger = new Logger(LocationIntelligenceService.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly riderLocationRepository: RiderLocationRepository,
    private readonly heatmapService: HeatmapService,
    private readonly riderCandidateRepository: Neo4jRiderCandidateRepository,
  ) {}

  /**
   * Update a rider's location from telemetry data.
   * Delegates to the UpdateRiderLocationCommand handler.
   * @param data - Telemetry data from rider mobile device
   */
  async updateRiderLocation(data: RiderTelemetryData): Promise<void> {
    const command = new UpdateRiderLocationCommand(data);
    await this.commandBus.execute(command);
    this.logger.debug(`Updated location for rider ${data.riderId}`);
  }

  /**
   * Find nearby riders with their availability metadata.
   * Used for delivery assignment candidate selection.
   * @param params - Search parameters including location, radius, and optional filters
   * @returns Array of rider candidates sorted by distance
   */
  async findNearbyRiders(
    params: FindNearbyCandidatesParams,
  ): Promise<RiderCandidate[]> {
    return this.riderCandidateRepository.findNearbyRiders(
      params.latitude,
      params.longitude,
      params.radiusMeters,
      params.now,
      params.limit,
    );
  }

  /**
   * Generate a heatmap of current rider activity.
   * @param params - Bounding box and resolution for the heatmap
   * @returns Array of heatmap cells with rider counts
   */
  async getHeatmap(params: HeatmapParams): Promise<HeatmapCell[]> {
    return this.heatmapService.getActivityHeatmap(params);
  }

  /**
   * Get the historical path of a rider within a time range.
   * Returns an ordered sequence of geographic points.
   * @param riderId - The rider's unique identifier
   * @param timeRange - Start and end time for the path query
   * @returns Array of geographic points in chronological order
   */
  async getRiderPath(riderId: string, timeRange: TimeRange): Promise<GeoPoint[]> {
    const history = await this.riderLocationRepository.getRiderPath(
      riderId,
      timeRange.start,
      timeRange.end,
    );

    this.logger.debug(
      `Retrieved ${history.length} path points for rider ${riderId}`,
    );

    return history.map((h) => ({
      latitude: h.latitude,
      longitude: h.longitude,
    }));
  }
}
