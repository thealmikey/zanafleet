/**
 * Location Suggestion DTO
 * Represents a standardized location result from autocomplete
 */
export interface LocationSuggestion {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  locality?: string;
  region?: string;
  country?: string;
  placeType?: 'address' | 'city' | 'region' | 'country';
}

/**
 * Search options for location autocomplete
 */
export interface LocationSearchOptions {
  latitude?: number;
  longitude?: number;
  limit?: number;
}

/**
 * Request DTO for getting location suggestions
 */
export interface LocationSearchParams {
  query: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
}
