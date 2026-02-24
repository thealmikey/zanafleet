import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { haversineDistanceMeters } from '../../../core/utils/geo.utils';
import { GeoPoint } from '../providers/geo-provider.interface';
import { H3Service } from '../services/h3.service';
import {
  RiderLocationData,
  RiderLocationSnapshot,
  RiderLocationHistory,
  FindNearbyRidersParams,
} from '../types/rider-location.types';

// Re-export for backwards compatibility with existing imports
export { haversineDistanceMeters } from '../../../core/utils/geo.utils';

/**
 * Repository for rider location spatial queries.
 * Supports H3-based indexing and PostGIS spatial operations.
 */
@Injectable()
export class RiderLocationRepository {
  private readonly logger = new Logger(RiderLocationRepository.name);

  /** H3 resolution 9 hexagon approximate width in meters */
  private static readonly H3_RES9_WIDTH_METERS = 300;

  constructor(private readonly dataSource: DataSource, private readonly h3Service: H3Service) {}

  /**
   * Insert or update the current location snapshot for a rider.
   * Uses PostgreSQL upsert (ON CONFLICT) for atomic operation.
   * @param data - Location data to persist
   * @param manager - Optional EntityManager for transaction support
   */
  async upsertSnapshot(data: RiderLocationData, manager?: EntityManager): Promise<void> {
    const h3Indices = this.h3Service.pointToMultiResolution({
      latitude: data.latitude,
      longitude: data.longitude,
    });

    const queryRunner = manager ?? this.dataSource;

    await queryRunner.query(
      `
      INSERT INTO rider_location_snapshots (
        rider_id, latitude, longitude, point,
        h3_index_fine, h3_index_medium, h3_index_coarse,
        heading, speed, accuracy, updated_at
      ) VALUES (
        $1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326),
        $6, $7, $8, $9, $10, $11, NOW()
      )
      ON CONFLICT (rider_id) DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        point = EXCLUDED.point,
        h3_index_fine = EXCLUDED.h3_index_fine,
        h3_index_medium = EXCLUDED.h3_index_medium,
        h3_index_coarse = EXCLUDED.h3_index_coarse,
        heading = EXCLUDED.heading,
        speed = EXCLUDED.speed,
        accuracy = EXCLUDED.accuracy,
        updated_at = NOW()
      `,
      [
        data.riderId,
        data.latitude,
        data.longitude,
        data.longitude, // ST_MakePoint takes (lng, lat)
        data.latitude,
        h3Indices.fine,
        h3Indices.medium,
        h3Indices.coarse,
        data.heading ?? null,
        data.speed ?? null,
        data.accuracy ?? null,
      ]
    );
  }

  /**
   * Append a location record to the time-series history table.
   * @param data - Location data to persist
   * @param manager - Optional EntityManager for transaction support
   */
  async appendHistory(data: RiderLocationData, manager?: EntityManager): Promise<void> {
    const h3Indices = this.h3Service.pointToMultiResolution({
      latitude: data.latitude,
      longitude: data.longitude,
    });

    const queryRunner = manager ?? this.dataSource;

    await queryRunner.query(
      `
      INSERT INTO rider_location_history (
        rider_id, latitude, longitude, point,
        h3_index_fine, h3_index_medium, h3_index_coarse,
        heading, speed, accuracy, recorded_at
      ) VALUES (
        $1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326),
        $6, $7, $8, $9, $10, $11, $12
      )
      `,
      [
        data.riderId,
        data.latitude,
        data.longitude,
        data.longitude,
        data.latitude,
        h3Indices.fine,
        h3Indices.medium,
        h3Indices.coarse,
        data.heading ?? null,
        data.speed ?? null,
        data.accuracy ?? null,
        data.recordedAt ?? new Date(),
      ]
    );
  }

  /**
   * Find riders near a geographic point using H3 k-ring filtering + haversine refinement.
   * Strategy: First filter by H3 cells (fast index scan), then refine with actual distance.
   */
  async findNearbyRiders(params: FindNearbyRidersParams): Promise<RiderLocationSnapshot[]> {
    const { point, radiusMeters, limit } = params;

    // Calculate H3 k-ring size to cover the search radius
    const kRingSize = Math.max(
      1,
      Math.ceil(radiusMeters / RiderLocationRepository.H3_RES9_WIDTH_METERS)
    );
    const centerH3 = this.h3Service.pointToH3(point, 9);
    const h3Cells = this.h3Service.getNeighbors(centerH3, kRingSize);

    this.logger.debug(
      `Finding nearby riders: radius=${radiusMeters}m, k=${kRingSize}, cells=${h3Cells.length}`
    );

    // First filter by H3 cells (fast index scan)
    const candidates = await this.findRidersInH3Cells(h3Cells);

    // Refine with actual haversine distance
    const refined = candidates
      .map((rider) => ({
        ...rider,
        distanceMeters: haversineDistanceMeters(point, {
          latitude: rider.latitude,
          longitude: rider.longitude,
        }),
      }))
      .filter((rider) => rider.distanceMeters <= radiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    return limit ? refined.slice(0, limit) : refined;
  }

  /**
   * Find riders whose current location is in any of the specified H3 cells.
   * Uses fine-resolution (res 9) index for precise cell matching.
   */
  async findRidersInH3Cells(h3Indexes: string[]): Promise<RiderLocationSnapshot[]> {
    if (h3Indexes.length === 0) {
      return [];
    }

    const rows = await this.dataSource.query<RiderLocationSnapshotRow[]>(
      `
      SELECT 
        rider_id as "riderId",
        latitude,
        longitude,
        h3_index_fine as "h3IndexFine",
        h3_index_medium as "h3IndexMedium",
        h3_index_coarse as "h3IndexCoarse",
        heading,
        speed,
        accuracy,
        updated_at as "updatedAt"
      FROM rider_location_snapshots
      WHERE h3_index_fine = ANY($1)
      `,
      [h3Indexes]
    );

    return rows.map((row) => this.mapRowToSnapshot(row));
  }

  /**
   * Find riders whose current location is within the specified polygon.
   * Uses PostGIS ST_Contains for precise spatial query.
   */
  async findRidersInPolygon(polygon: GeoPoint[]): Promise<RiderLocationSnapshot[]> {
    if (polygon.length < 3) {
      return [];
    }

    // Build WKT polygon string (close the ring by repeating the first point)
    const closedPolygon = [...polygon, polygon[0]];
    const wktPoints = closedPolygon.map((p) => `${p.longitude} ${p.latitude}`).join(', ');
    const wktPolygon = `POLYGON((${wktPoints}))`;

    const rows = await this.dataSource.query<RiderLocationSnapshotRow[]>(
      `
      SELECT 
        rider_id as "riderId",
        latitude,
        longitude,
        h3_index_fine as "h3IndexFine",
        h3_index_medium as "h3IndexMedium",
        h3_index_coarse as "h3IndexCoarse",
        heading,
        speed,
        accuracy,
        updated_at as "updatedAt"
      FROM rider_location_snapshots
      WHERE ST_Contains(
        ST_SetSRID(ST_GeomFromText($1), 4326),
        point
      )
      `,
      [wktPolygon]
    );

    return rows.map((row) => this.mapRowToSnapshot(row));
  }

  /**
   * Get the path history for a rider within a time range.
   * Returns location records ordered by recorded_at ascending.
   */
  async getRiderPath(
    riderId: string,
    startTime: Date,
    endTime: Date
  ): Promise<RiderLocationHistory[]> {
    const rows = await this.dataSource.query<RiderLocationHistoryRow[]>(
      `
      SELECT 
        id,
        rider_id as "riderId",
        latitude,
        longitude,
        h3_index_fine as "h3IndexFine",
        h3_index_medium as "h3IndexMedium",
        h3_index_coarse as "h3IndexCoarse",
        heading,
        speed,
        accuracy,
        recorded_at as "recordedAt"
      FROM rider_location_history
      WHERE rider_id = $1
        AND recorded_at >= $2
        AND recorded_at <= $3
      ORDER BY recorded_at ASC
      `,
      [riderId, startTime, endTime]
    );

    return rows.map((row) => this.mapRowToHistory(row));
  }

  private mapRowToSnapshot(row: RiderLocationSnapshotRow): RiderLocationSnapshot {
    return {
      riderId: row.riderId,
      latitude: row.latitude,
      longitude: row.longitude,
      h3IndexFine: row.h3IndexFine,
      h3IndexMedium: row.h3IndexMedium,
      h3IndexCoarse: row.h3IndexCoarse,
      heading: row.heading,
      speed: row.speed,
      accuracy: row.accuracy,
      updatedAt: row.updatedAt,
    };
  }

  private mapRowToHistory(row: RiderLocationHistoryRow): RiderLocationHistory {
    return {
      id: row.id,
      riderId: row.riderId,
      latitude: row.latitude,
      longitude: row.longitude,
      h3IndexFine: row.h3IndexFine,
      h3IndexMedium: row.h3IndexMedium,
      h3IndexCoarse: row.h3IndexCoarse,
      heading: row.heading,
      speed: row.speed,
      accuracy: row.accuracy,
      recordedAt: row.recordedAt,
    };
  }
}

interface RiderLocationSnapshotRow {
  riderId: string;
  latitude: number;
  longitude: number;
  h3IndexFine: string;
  h3IndexMedium: string;
  h3IndexCoarse: string;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  updatedAt: Date;
}

interface RiderLocationHistoryRow {
  id: string;
  riderId: string;
  latitude: number;
  longitude: number;
  h3IndexFine: string;
  h3IndexMedium: string;
  h3IndexCoarse: string;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  recordedAt: Date;
}
