/**
 * Geographic point with latitude and longitude coordinates.
 * This is the canonical GeoPoint type for the location-intelligence module.
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Structured address representation returned by reverse geocoding.
 */
export interface Address {
  formattedAddress: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Provider identifier token for dependency injection.
 */
export const GEO_PROVIDER = Symbol('GEO_PROVIDER');

/**
 * Abstract interface for geographic information services.
 * Implementations can wrap various providers (Google Maps, Mapbox, OpenStreetMap, etc.)
 */
export interface GeoProvider {
  /**
   * Unique identifier for this provider (e.g., 'google', 'mapbox', 'osm')
   */
  readonly providerId: string;

  /**
   * Convert a human-readable address to geographic coordinates.
   * @param address - The address string to geocode
   * @returns The geographic point, or null if geocoding fails
   */
  geocode(address: string): Promise<GeoPoint | null>;

  /**
   * Convert geographic coordinates to a structured address.
   * @param point - The geographic point to reverse geocode
   * @returns The address information, or null if reverse geocoding fails
   */
  reverseGeocode(point: GeoPoint): Promise<Address | null>;

  /**
   * Calculate the distance between two geographic points in meters.
   * @param from - The starting point
   * @param to - The ending point
   * @returns The distance in meters
   */
  calculateDistance(from: GeoPoint, to: GeoPoint): Promise<number>;
}
