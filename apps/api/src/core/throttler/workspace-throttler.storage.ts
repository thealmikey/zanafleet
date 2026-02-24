import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';

import { RedisService } from '../redis/redis.service';

/**
 * Storage record returned by the throttler after incrementing
 */
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Redis-based throttler storage that supports workspace-aware rate limiting.
 *
 * Key format: throttler:{workspaceId}:{ip}:{route}
 *
 * This storage:
 * - Uses Redis for distributed rate limiting across multiple instances
 * - Supports workspace-scoped rate limits (per-tenant)
 * - Falls back to IP-based limiting when workspaceId is not available
 */
@Injectable()
export class WorkspaceThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(WorkspaceThrottlerStorage.name);
  private readonly keyPrefix = 'throttler';

  constructor(private readonly redisService: RedisService) {}

  /**
   * Generate a storage key based on workspace, IP, and route.
   *
   * @param key - The base key from the throttler (typically IP + route)
   * @param throttlerName - Name of the throttler configuration
   * @returns Formatted Redis key
   */
  private getKey(key: string, throttlerName: string): string {
    // Check if the key already contains workspace info
    // The guard will set the key to include workspace:ip:route format
    return `${this.keyPrefix}:${throttlerName}:${key}`;
  }

  /**
   * Increment the hit count for a given key.
   *
   * @param key - The throttler key (typically contains workspace:ip:route)
   * @param ttl - Time to live in seconds
   * @param limit - Maximum number of hits allowed
   * @param blockDuration - Duration to block in milliseconds
   * @param throttlerName - Name of the throttler configuration
   * @returns Promise resolving to the storage record
   */
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string
  ): Promise<ThrottlerStorageRecord> {
    const storageKey = this.getKey(key, throttlerName);

    try {
      const redisClient = this.redisService.getClient();

      // Use INCR to atomically increment the counter
      const totalHits = await redisClient.incr(storageKey);

      // Set expiry on first hit
      if (totalHits === 1) {
        await redisClient.pexpire(storageKey, ttl * 1000);
      }

      // Get remaining time
      const ttlResult = await redisClient.pttl(storageKey);
      const timeToExpire = Math.max(0, Math.floor(ttlResult / 1000));

      // Check if rate limited
      const isBlocked = totalHits > limit;

      // Calculate time to block expire
      let timeToBlockExpire = 0;
      if (isBlocked && blockDuration > 0) {
        // Get or set block expiry
        const blockKey = `${storageKey}:blocked`;
        const blockTtl = await redisClient.pttl(blockKey);
        if (blockTtl <= 0) {
          // First time being blocked, set block duration
          await redisClient.set(blockKey, '1', 'PX', blockDuration);
          timeToBlockExpire = blockDuration;
        } else {
          timeToBlockExpire = Math.max(0, blockTtl);
        }
      }

      return {
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error incrementing throttler record for key ${storageKey}: ${errorMessage}`
      );
      // Return a record that allows the request through on error
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}
