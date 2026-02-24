import { Injectable, Logger } from '@nestjs/common';

import { LocationInput } from '../dto/movers-estimate-request.dto';

/**
 * Normalized location with standardized coordinates and metadata
 */
export interface NormalizedLocation {
  /** Unique place identifier */
  placeId: string;
  /** Formatted address */
  formattedAddress: string;
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** Locality name */
  locality?: string;
  /** Region/state name */
  region?: string;
  /** Country name */
  country?: string;
  /** Postal code */
  postalCode?: string;
  /** Timezone of the location */
  timezone?: string;
  /** Google maps URL for the location */
  mapsUrl?: string;
}

/**
 * Result of distance calculation between two locations
 */
export interface DistanceResult {
  /** Distance in kilometers */
  distanceKm: number;
  /** Estimated travel time in minutes */
  travelTimeMinutes: number;
  /** Straight-line distance in kilometers */
  straightLineDistanceKm: number;
}

/**
 * LocationNormalizationService
 *
 * Service for normalizing and validating location inputs.
 * This service ensures consistent location data format across the movers module.
 */
@Injectable()
export class LocationNormalizationService {
  private readonly logger = new Logger(LocationNormalizationService.name);

  /**
   * Normalize a location input to a standardized format
   */
  async normalize(input: LocationInput): Promise<NormalizedLocation> {
    this.logger.debug(`Normalizing location: ${input.formattedAddress}`);

    // Validate required fields
    if (!input.placeId) {
      throw new Error('Place ID is required for location normalization');
    }

    if (!input.latitude || !input.longitude) {
      throw new Error('Latitude and longitude are required for location normalization');
    }

    // Validate coordinate bounds
    this.validateCoordinates(input.latitude, input.longitude);

    // Calculate timezone based on coordinates
    const timezone = this.estimateTimezone(input.latitude, input.longitude);

    // Generate maps URL
    const mapsUrl = this.generateMapsUrl(input.latitude, input.longitude);

    return {
      placeId: input.placeId,
      formattedAddress: input.formattedAddress.trim(),
      latitude: this.roundCoordinate(input.latitude),
      longitude: this.roundCoordinate(input.longitude),
      locality: input.locality?.trim(),
      region: input.region?.trim(),
      country: input.country?.trim(),
      postalCode: input.postalCode?.trim(),
      timezone,
      mapsUrl,
    };
  }

  /**
   * Normalize multiple locations in batch
   */
  async normalizeBatch(inputs: LocationInput[]): Promise<NormalizedLocation[]> {
    const results = await Promise.all(inputs.map(async (input) => this.normalize(input)));
    return results;
  }

  /**
   * Calculate distance between two normalized locations
   */
  calculateDistance(origin: NormalizedLocation, destination: NormalizedLocation): DistanceResult {
    // Straight-line distance using Haversine formula
    const straightLineDistanceKm = this.haversineDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );

    // Estimate travel distance (typically 1.3x straight-line in urban areas)
    const distanceKm = straightLineDistanceKm * 1.3;

    // Estimate travel time (assuming average 40 km/h in urban areas)
    const travelTimeMinutes = Math.round((distanceKm / 40) * 60);

    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      travelTimeMinutes,
      straightLineDistanceKm: Math.round(straightLineDistanceKm * 10) / 10,
    };
  }

  /**
   * Validate latitude and longitude are within valid bounds
   */
  private validateCoordinates(latitude: number, longitude: number): void {
    if (latitude < -90 || latitude > 90) {
      throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90.`);
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180.`);
    }
  }

  /**
   * Round coordinates to 6 decimal places (approximately 0.1 meter precision)
   */
  private roundCoordinate(value: number): number {
    return Math.round(value * 1000000) / 1000000;
  }

  /**
   * Estimate timezone based on coordinates (simplified)
   * In production, this would use a proper timezone database
   */
  private estimateTimezone(latitude: number, longitude: number): string {
    // Kenya is approximately at 37°E longitude
    if (longitude >= 33 && longitude <= 42 && latitude >= -5 && latitude <= 6) {
      return 'Africa/Nairobi';
    }

    // Default to UTC
    return 'UTC';
  }

  /**
   * Generate Google Maps URL for a location
   */
  private generateMapsUrl(latitude: number, longitude: number): string {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  /**
   * Haversine formula for calculating distance between two points
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
