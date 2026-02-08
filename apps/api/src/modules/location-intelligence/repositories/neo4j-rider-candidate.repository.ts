import { Injectable, Logger } from '@nestjs/common';
import { VehicleType } from '@zanafleet/contracts';
import { Neo4jService } from '../../../core/neo4j/neo4j.service';
import {
  RiderCandidate,
  RiderCandidateRepository,
  TimeWindow,
} from '../types/rider-candidate.types';
import { RiderLocationRepository } from './rider-location.repository';

/**
 * Metadata retrieved from Neo4j for a rider.
 */
interface RiderMetadata {
  vehicleType: VehicleType;
  busyWindows: TimeWindow[];
}

/**
 * Repository implementation that combines PostGIS spatial queries
 * with Neo4j graph data to provide rider candidates for delivery assignment.
 *
 * This implementation:
 * 1. Uses RiderLocationRepository for spatial proximity queries (PostGIS + H3)
 * 2. Enriches candidates with rider metadata from Neo4j graph projections
 */
@Injectable()
export class Neo4jRiderCandidateRepository implements RiderCandidateRepository {
  private readonly logger = new Logger(Neo4jRiderCandidateRepository.name);

  constructor(
    private readonly riderLocationRepository: RiderLocationRepository,
    private readonly neo4jService: Neo4jService,
  ) {}

  /**
   * Find riders near a geographic point with their availability metadata.
   * @param latitude - Center point latitude
   * @param longitude - Center point longitude
   * @param radiusMeters - Search radius in meters
   * @param now - Current time for filtering busy windows (defaults to now)
   * @param limit - Maximum number of candidates to return
   * @returns Array of rider candidates sorted by distance
   */
  async findNearbyRiders(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    now?: Date,
    limit?: number,
  ): Promise<RiderCandidate[]> {
    const currentTime = now ?? new Date();

    const nearbySnapshots = await this.riderLocationRepository.findNearbyRiders({
      point: { latitude, longitude },
      radiusMeters,
      limit,
    });

    if (nearbySnapshots.length === 0) {
      return [];
    }

    const riderIds = nearbySnapshots.map((s) => s.riderId);
    const metadata = await this.getRiderMetadata(riderIds, currentTime);

    return nearbySnapshots.map((snapshot) => {
      const riderMeta = metadata.get(snapshot.riderId);
      return {
        riderId: snapshot.riderId,
        lastKnownLocation: {
          latitude: snapshot.latitude,
          longitude: snapshot.longitude,
        },
        lastSeenAt: snapshot.updatedAt,
        vehicleType: riderMeta?.vehicleType ?? VehicleType.Bike,
        busyWindows: riderMeta?.busyWindows ?? [],
      };
    });
  }

  /**
   * Retrieve rider metadata from Neo4j including vehicle type and busy windows.
   * Busy windows are derived from active delivery assignments.
   */
  private async getRiderMetadata(
    riderIds: string[],
    _now: Date,
  ): Promise<Map<string, RiderMetadata>> {
    const session = this.neo4jService.getReadSession();
    const metadata = new Map<string, RiderMetadata>();

    try {
      const result = await session.run(
        `
        MATCH (r:Rider)
        WHERE r.id IN $riderIds
        OPTIONAL MATCH (r)-[:ASSIGNED_TO]->(d:Delivery)
        WHERE d.status IN ['Assigned', 'PickedUp', 'InTransit']
        RETURN 
          r.id AS riderId,
          r.vehicleType AS vehicleType,
          collect(
            CASE WHEN d IS NOT NULL 
            THEN {start: d.scheduledPickupTime, end: d.scheduledDropoffTime}
            ELSE NULL END
          ) AS busyWindows
        `,
        { riderIds },
      );

      for (const record of result.records) {
        const riderId = record.get('riderId') as string;
        const vehicleTypeRaw = record.get('vehicleType') as string | null;
        const vehicleType = this.parseVehicleType(vehicleTypeRaw);
        const rawWindows = record.get('busyWindows') as Array<{
          start: string | null;
          end: string | null;
        } | null>;

        const busyWindows: TimeWindow[] = rawWindows
          .filter(
            (w): w is { start: string; end: string } =>
              w !== null && w.start !== null && w.end !== null,
          )
          .map((w) => ({
            start: new Date(w.start),
            end: new Date(w.end),
          }));

        metadata.set(riderId, { vehicleType, busyWindows });
      }

      this.logger.debug(
        `Retrieved metadata for ${metadata.size}/${riderIds.length} riders from Neo4j`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to retrieve rider metadata from Neo4j: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      await session.close();
    }

    return metadata;
  }

  /**
   * Parse vehicle type string to enum, defaulting to Bike if unknown.
   */
  private parseVehicleType(value: string | null): VehicleType {
    if (!value) {
      return VehicleType.Bike;
    }
    if (Object.values(VehicleType).includes(value as VehicleType)) {
      return value as VehicleType;
    }
    return VehicleType.Bike;
  }
}
