import { Injectable, Logger } from '@nestjs/common';

import { LocationSuggestion, LocationSearchOptions } from '../dto';

import { LocationAutocompleteProvider } from './location-autocomplete.interface';

/**
 * Default Location Autocomplete Provider
 *
 * A no-op implementation that provides mock/simulated location data
 * for development and testing purposes.
 *
 * In production, this should be replaced with a real provider:
 * - Google Places Autocomplete
 * - Mapbox Geocoding API
 * - OpenStreetMap Nominatim
 */
@Injectable()
export class DefaultLocationAutocompleteProvider implements LocationAutocompleteProvider {
  readonly providerId = 'default';
  readonly displayName = 'Default Location Provider (Mock)';

  private readonly logger = new Logger(DefaultLocationAutocompleteProvider.name);

  private readonly mockLocations: LocationSuggestion[] = [
    {
      placeId: 'nairobi-downtown',
      formattedAddress: 'Nairobi Downtown, Kenya',
      latitude: -1.2921,
      longitude: 36.8219,
      locality: 'Nairobi',
      region: 'Nairobi County',
      country: 'Kenya',
      placeType: 'city',
    },
    {
      placeId: 'nairobi-westlands',
      formattedAddress: 'Westlands, Nairobi, Kenya',
      latitude: -1.2644,
      longitude: 36.8035,
      locality: 'Nairobi',
      region: 'Nairobi County',
      country: 'Kenya',
      placeType: 'city',
    },
    {
      placeId: 'nairobi-kasarani',
      formattedAddress: 'Kasarani, Nairobi, Kenya',
      latitude: -1.2249,
      longitude: 36.8795,
      locality: 'Nairobi',
      region: 'Nairobi County',
      country: 'Kenya',
      placeType: 'region',
    },
    {
      placeId: 'mombasa',
      formattedAddress: 'Mombasa, Kenya',
      latitude: -4.0435,
      longitude: 39.6682,
      locality: 'Mombasa',
      region: 'Mombasa County',
      country: 'Kenya',
      placeType: 'city',
    },
    {
      placeId: 'kisumu',
      formattedAddress: 'Kisumu, Kenya',
      latitude: -0.1022,
      longitude: 34.7617,
      locality: 'Kisumu',
      region: 'Kisumu County',
      country: 'Kenya',
      placeType: 'city',
    },
    {
      placeId: 'nakuru',
      formattedAddress: 'Nakuru, Kenya',
      latitude: -0.3031,
      longitude: 36.08,
      locality: 'Nakuru',
      region: 'Nakuru County',
      country: 'Kenya',
      placeType: 'city',
    },
    {
      placeId: 'eldoret',
      formattedAddress: 'Eldoret, Kenya',
      latitude: 0.5143,
      longitude: 35.2698,
      locality: 'Eldoret',
      region: 'Uasin Gishu County',
      country: 'Kenya',
      placeType: 'city',
    },
  ];

  async searchSuggestions(
    query: string,
    _options?: LocationSearchOptions
  ): Promise<LocationSuggestion[]> {
    this.logger.debug(`Searching for locations matching: ${query}`);

    if (!query || query.length < 2) {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    // Filter and sort by relevance
    const matches = this.mockLocations.filter(
      (location) =>
        location.formattedAddress.toLowerCase().includes(lowerQuery) ||
        location.locality?.toLowerCase().includes(lowerQuery) ||
        location.region?.toLowerCase().includes(lowerQuery) ||
        location.country?.toLowerCase().includes(lowerQuery)
    );

    // Sort: exact matches first, then prefix matches, then contains
    matches.sort((a, b) => {
      const aExact = a.formattedAddress.toLowerCase() === lowerQuery;
      const bExact = b.formattedAddress.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aPrefix = a.formattedAddress.toLowerCase().startsWith(lowerQuery);
      const bPrefix = b.formattedAddress.toLowerCase().startsWith(lowerQuery);
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;

      return a.formattedAddress.localeCompare(b.formattedAddress);
    });

    return matches.slice(0, 10);
  }

  async getPlaceDetails(placeId: string): Promise<LocationSuggestion | null> {
    this.logger.debug(`Getting details for place: ${placeId}`);

    const location = this.mockLocations.find((loc) => loc.placeId === placeId);
    return location || null;
  }

  async validateServiceArea(latitude: number, longitude: number): Promise<boolean> {
    this.logger.debug(`Validating service area for: ${latitude}, ${longitude}`);

    // Kenya bounds (simplified)
    const kenyaBounds = {
      minLat: -4.7,
      maxLat: 5.0,
      minLng: 33.9,
      maxLng: 41.9,
    };

    return (
      latitude >= kenyaBounds.minLat &&
      latitude <= kenyaBounds.maxLat &&
      longitude >= kenyaBounds.minLng &&
      longitude <= kenyaBounds.maxLng
    );
  }
}
