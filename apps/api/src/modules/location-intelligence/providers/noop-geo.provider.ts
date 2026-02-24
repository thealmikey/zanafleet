import { Injectable, Logger } from '@nestjs/common';

import { Address, GeoPoint, GeoProvider } from './geo-provider.interface';

/**
 * No-operation geo provider for testing and development.
 * Returns null/0 for all operations.
 */
@Injectable()
export class NoOpGeoProvider implements GeoProvider {
  private readonly logger = new Logger(NoOpGeoProvider.name);

  readonly providerId = 'noop';

  async geocode(address: string): Promise<GeoPoint | null> {
    this.logger.debug(`NoOp geocode called for: ${address}`);
    return null;
  }

  async reverseGeocode(point: GeoPoint): Promise<Address | null> {
    this.logger.debug(`NoOp reverseGeocode called for: (${point.latitude}, ${point.longitude})`);
    return null;
  }

  async calculateDistance(from: GeoPoint, to: GeoPoint): Promise<number> {
    this.logger.debug(
      `NoOp calculateDistance called from (${from.latitude}, ${from.longitude}) to (${to.latitude}, ${to.longitude})`
    );
    return 0;
  }
}
