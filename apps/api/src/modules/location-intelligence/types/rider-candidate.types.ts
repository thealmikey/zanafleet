import { VehicleType } from '@zanafleet/contracts';

import { GeoPoint } from '../providers/geo-provider.interface';

/**
 * A time window during which a rider is unavailable.
 */
export interface TimeWindow {
  start: Date;
  end: Date;
}

/**
 * A rider candidate for delivery assignment.
 * Contains location data and availability information.
 */
export interface RiderCandidate {
  riderId: string;
  lastKnownLocation: GeoPoint;
  lastSeenAt: Date;
  vehicleType: VehicleType;
  busyWindows: TimeWindow[];
}

/**
 * Repository interface for finding rider candidates.
 * Implementations may use different data sources (Neo4j, in-memory, etc.)
 */
export interface RiderCandidateRepository {
  findNearbyRiders(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    now?: Date,
    limit?: number
  ): Promise<RiderCandidate[]>;
}

/**
 * Parameters for finding nearby rider candidates.
 */
export interface FindNearbyCandidatesParams {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  now?: Date;
  limit?: number;
}
