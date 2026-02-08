import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UpdateRiderLocationCommand } from '../commands/update-rider-location.command';
import { RiderLocationRepository } from '../repositories/rider-location.repository';
import { H3Service } from '../services/h3.service';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { RedisService } from '../../../core/redis/redis.service';
import { createRiderLocationUpdatedEvent } from '../events/rider-location-updated.event';

/**
 * Result of processing an UpdateRiderLocationCommand.
 */
export interface UpdateRiderLocationResult {
  /** Whether the location was actually updated (false if rate-limited) */
  updated: boolean;
  /** The rider ID */
  riderId: string;
  /** Reason if update was skipped */
  reason?: string;
}

/**
 * Handler for processing rider location updates from telemetry.
 *
 * Flow:
 * 1. Validate coordinates
 * 2. Check rate limiting (skip if last update was too recent)
 * 3. Compute H3 indices at multiple resolutions
 * 4. Upsert current location snapshot
 * 5. Append to location history
 * 6. Publish RiderLocationUpdatedEventV1
 */
@CommandHandler(UpdateRiderLocationCommand)
export class UpdateRiderLocationHandler
  implements ICommandHandler<UpdateRiderLocationCommand, UpdateRiderLocationResult>
{
  private readonly logger = new Logger(UpdateRiderLocationHandler.name);

  /** Minimum interval between updates in milliseconds (default: 3 seconds) */
  private readonly rateLimitMs: number;

  constructor(
    private readonly riderLocationRepository: RiderLocationRepository,
    private readonly h3Service: H3Service,
    private readonly eventBusService: EventBusService,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
  ) {
    this.rateLimitMs = parseInt(process.env.RIDER_LOCATION_RATE_LIMIT_MS ?? '3000', 10);
  }

  async execute(command: UpdateRiderLocationCommand): Promise<UpdateRiderLocationResult> {
    const { telemetry } = command;
    const { riderId, latitude, longitude, heading, speed, accuracy, timestamp } = telemetry;

    // 1. Validate coordinates
    this.validateCoordinates(latitude, longitude);

    // 2. Check rate limiting
    if (await this.isRateLimited(riderId)) {
      this.logger.debug(`Rate limited: rider ${riderId} updated too recently`);
      return {
        updated: false,
        riderId,
        reason: 'Rate limited: update too recent',
      };
    }

    // 3. Compute H3 indices at multiple resolutions
    const h3Indices = this.h3Service.pointToMultiResolution({ latitude, longitude });

    // 4. Prepare location data for persistence
    const locationData = {
      riderId,
      latitude,
      longitude,
      heading: heading ?? null,
      speed: speed ?? null,
      accuracy: accuracy ?? null,
      recordedAt: timestamp,
    };

    // 5. Persist location data atomically (snapshot + history)
    await this.dataSource.transaction(async (manager) => {
      await this.riderLocationRepository.upsertSnapshot(locationData, manager);
      await this.riderLocationRepository.appendHistory(locationData, manager);
    });

    // 6. Publish event
    const event = createRiderLocationUpdatedEvent({
      riderId,
      latitude,
      longitude,
      h3Indices,
      heading: heading ?? null,
      speed: speed ?? null,
      accuracy: accuracy ?? null,
      timestamp,
    });

    await this.eventBusService.publishEvent(event);

    this.logger.debug(
      `Updated location for rider ${riderId}: [${latitude}, ${longitude}] -> H3 fine: ${h3Indices.fine}`,
    );

    return {
      updated: true,
      riderId,
    };
  }

  /**
   * Validate that coordinates are within valid ranges.
   * Latitude: -90 to 90, Longitude: -180 to 180
   */
  private validateCoordinates(latitude: number, longitude: number): void {
    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException(
        `Invalid latitude: ${latitude}. Must be between -90 and 90.`,
      );
    }
    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException(
        `Invalid longitude: ${longitude}. Must be between -180 and 180.`,
      );
    }
  }

  /**
   * Check if a rider's location update should be rate-limited using Redis.
   * Uses SET NX EX for atomic check-and-set with TTL.
   * Returns true if the last update was less than rateLimitMs ago.
   */
  private async isRateLimited(riderId: string): Promise<boolean> {
    const key = `rate_limit:rider:${riderId}`;
    const ttlSeconds = Math.ceil(this.rateLimitMs / 1000);

    // setRateLimitKey returns true if key was set (NOT rate limited)
    // returns false if key already exists (IS rate limited)
    const wasSet = await this.redisService.setRateLimitKey(key, ttlSeconds);
    return !wasSet;
  }
}
