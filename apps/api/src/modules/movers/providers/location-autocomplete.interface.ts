import { LocationSuggestion } from '../dto';

/**
 * Injection token for location autocomplete providers
 */
export const LOCATION_AUTOCOMPLETE_PROVIDER = Symbol('LOCATION_AUTOCOMPLETE_PROVIDER');

/**
 * Options for location search
 */
export interface LocationSearchOptions {
  latitude?: number;
  longitude?: number;
  radius?: number;
  limit?: number;
  placeTypes?: ('address' | 'city' | 'region' | 'country')[];
}

/**
 * Location Autocomplete Provider Interface
 * 
 * Abstract interface for location autocomplete services.
 * Implementations can wrap various providers (Google Maps, Mapbox, OpenStreetMap, etc.)
 * 
 * This follows the provider abstraction pattern used elsewhere in the codebase:
 * - GeoProvider (location-intelligence module)
 * - PaymentProvider (payment module)
 * - ChannelProvider (communication module)
 */
export interface LocationAutocompleteProvider {
  /**
   * Unique identifier for this provider (e.g., 'google', 'mapbox', 'osm', 'default')
   */
  readonly providerId: string;

  /**
   * Search for location suggestions based on user input
   * @param query - The search query string
   * @param options - Optional search parameters
   * @returns Array of location suggestions sorted by relevance
   */
  searchSuggestions(
    query: string,
    options?: LocationSearchOptions
  ): Promise<LocationSuggestion[]>;

  /**
   * Get detailed location information for a selected place
   * @param placeId - The unique identifier for the place
   * @returns Detailed location suggestion or null if not found
   */
  getPlaceDetails(placeId: string): Promise<LocationSuggestion | null>;

  /**
   * Validate that a location is within the service area
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns True if location is serviceable
   */
  validateServiceArea(latitude: number, longitude: number): Promise<boolean>;

  /**
   * Get the provider's display name for debugging/admin purposes
   */
  readonly displayName: string;
}
