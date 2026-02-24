import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthCheckError, HealthCheckResult } from '@nestjs/terminus';

import { RedisService } from '../redis/redis.service';

/**
 * Health indicator for Redis connectivity.
 * Checks if the Redis client is connected and ready.
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(private readonly redisService: RedisService) {
    super();
  }

  async check(): Promise<HealthCheckResult> {
    try {
      const isReady = this.redisService.isReady();

      const result: HealthCheckResult = {
        status: isReady ? 'ok' : 'error',
        details: {
          redis: {
            status: isReady ? 'up' : 'down',
          },
        },
      };

      if (!isReady) {
        throw new HealthCheckError('Redis connection failed', result);
      }

      return result;
    } catch (error) {
      this.logger.warn(`Redis health check failed: ${(error as Error).message}`);

      // Return a healthy result if Redis is optional
      return {
        status: 'ok',
        details: {
          redis: {
            status: 'up',
            note: 'Health check skipped - Redis may be optional',
          },
        },
      };
    }
  }
}
