import { GeoPoint } from '../providers/geo-provider.interface';

/**
 * Input data for creating or updating rider location records.
 */
export interface RiderLocationData {
  riderId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  recordedAt?: Date;
}

/**
 * Rider location snapshot with optional computed distance.
 */
export interface RiderLocationSnapshot {
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
  /** Distance from query point in meters (populated by findNearbyRiders) */
  distanceMeters?: number;
}

/**
 * Rider location history entry for path reconstruction.
 */
export interface RiderLocationHistory {
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

/**
 * Parameters for finding riders near a geographic point.
 */
export interface FindNearbyRidersParams {
  point: GeoPoint;
  radiusMeters: number;
  limit?: number;
}
