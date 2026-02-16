import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RiderTelemetryData } from '@zanafleet/contracts';

import { haversineDistanceMeters, GeoPoint } from '../../../core/utils/geo.utils';
import { UpdateRiderLocationCommand } from '../commands/update-rider-location.command';
import { Neo4jRiderCandidateRepository } from '../repositories/neo4j-rider-candidate.repository';
import { RiderLocationRepository } from '../repositories/rider-location.repository';
import { HeatmapCell, HeatmapParams } from '../types/heatmap.types';
import {
  FindNearbyCandidatesParams,
  RiderCandidate,
  TimeWindow,
} from '../types/rider-candidate.types';

import { HeatmapService } from './heatmap.service';

const DEFAULT_RADIUS_METERS = 3000;
const DEFAULT_WINDOW_MINUTES = 30;

/**
 * Time range for historical queries.
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Parameters for ranking candidates
 */
export interface RankCandidatesParams {
  pickup: GeoPoint;
  scheduledPickupTime?: Date | null;
  scheduledDropoffTime?: Date | null;
  radiusMeters?: number;
  limit?: number;
  considerWindowMinutes?: number;
  now?: Date;
}

/**
 * Ranked candidate with distance and score
 */
export interface RankedRiderCandidate extends RiderCandidate {
  distanceMeters: number;
  score: number;
}

/**
 * Facade service exposing location intelligence capabilities.
 *
 * Provides a unified interface for:
 * - Updating rider locations from telemetry
 * - Finding nearby riders for delivery assignment
 * - Ranking and selecting best riders for delivery
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
   * Find and rank nearby riders for delivery assignment.
   * This is the unified method for candidate selection used by Delivery module.
   * 
   * @param params - Search and ranking parameters
   * @returns Ranked candidates sorted by score (lower is better)
   */
  async findAndRankCandidates(params: RankCandidatesParams): Promise<RankedRiderCandidate[]> {
    const radius = params.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const limit = (params.limit ?? 10) * 3; // Fetch extra for ranking

    // Get nearby candidates
    const candidates = await this.riderCandidateRepository.findNearbyRiders(
      params.pickup.latitude,
      params.pickup.longitude,
      radius,
      params.now,
      limit,
    );

    // Compute availability window
    const availabilityWindow = this.computeAvailabilityWindow({
      scheduledPickupTime: params.scheduledPickupTime ?? null,
      scheduledDropoffTime: params.scheduledDropoffTime ?? null,
      considerWindowMinutes: params.considerWindowMinutes,
      now: params.now,
    });

    const maxDistanceMeters = params.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const scored: RankedRiderCandidate[] = [];

    for (const c of candidates) {
      const distance = haversineDistanceMeters(params.pickup, c.lastKnownLocation);
      if (distance > maxDistanceMeters) continue;
      if (!this.isAvailableDuringWindow(c, availabilityWindow)) continue;

      scored.push({
        ...c,
        distanceMeters: distance,
        score: distance,
      });
    }

    // Sort by score (distance), then by recency
    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      const aSeen = a.lastSeenAt ? a.lastSeenAt.getTime() : 0;
      const bSeen = b.lastSeenAt ? b.lastSeenAt.getTime() : 0;
      return bSeen - aSeen;
    });

    return scored.slice(0, params.limit ?? 10);
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

  // Private helper methods for ranking

  private computeAvailabilityWindow(options: {
    scheduledPickupTime?: Date | null;
    scheduledDropoffTime?: Date | null;
    considerWindowMinutes?: number;
    now?: Date;
  }): TimeWindow {
    let anchor: Date;
    if (options.scheduledPickupTime instanceof Date) {
      anchor = options.scheduledPickupTime;
    } else if (options.scheduledDropoffTime instanceof Date) {
      anchor = options.scheduledDropoffTime;
    } else {
      anchor = options.now ?? new Date();
    }

    const minutes = options.considerWindowMinutes ?? DEFAULT_WINDOW_MINUTES;
    const ms = minutes * 60 * 1000;

    return {
      start: new Date(anchor.getTime() - ms),
      end: new Date(anchor.getTime() + ms),
    };
  }

  private isAvailableDuringWindow(candidate: RiderCandidate, window: TimeWindow): boolean {
    const busy = candidate.busyWindows ?? [];
    for (const w of busy) {
      if (!(w.start instanceof Date) || !(w.end instanceof Date)) {
        return false;
      }
      if (this.overlaps(window, w)) return false;
    }
    return true;
  }

  private overlaps(a: TimeWindow, b: TimeWindow): boolean {
    return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
  }
}
