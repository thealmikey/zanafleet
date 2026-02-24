import { Injectable, Logger } from '@nestjs/common';

/**
 * Thin adapter to resolve a locationId to a GeoPoint.
 * This default implementation is a no-op and returns null.
 * Real implementations should be provided via module override or DI.
 */
@Injectable()
export class LocationResolverService {
  private readonly logger = new Logger(LocationResolverService.name);

  // Minimal GeoPoint shape to avoid tight coupling
  async resolveToPoint(
    locationId: string
  ): Promise<{ latitude: number; longitude: number } | null> {
    this.logger.debug(`resolveToPoint called for locationId=${locationId}`);
    // Intentionally return null; tests or higher-level modules should provide an override.
    return null;
  }
}
