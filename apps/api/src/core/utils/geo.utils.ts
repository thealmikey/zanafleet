/**
 * Geographic point with latitude and longitude coordinates.
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * GeoJSON Point geometry for PostGIS columns.
 * Coordinates are [longitude, latitude] per GeoJSON spec.
 */
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

const EARTH_RADIUS_METERS = 6371000;

/**
 * Convert degrees to radians.
 */
function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate the haversine distance between two geographic points.
 * @param from - Starting point
 * @param to - Ending point
 * @returns Distance in meters
 */
export function haversineDistanceMeters(from: GeoPoint, to: GeoPoint): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}
