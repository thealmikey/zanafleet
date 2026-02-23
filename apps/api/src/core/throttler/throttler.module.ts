import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { RedisModule } from '../redis/redis.module';

/**
 * ThrottlerModule Configuration
 *
 * Configures global rate limiting for distributed enforcement.
 *
 * Tiers:
 * - short: 10 requests per second (burst protection)
 * - medium: 50 requests per 10 seconds (normal usage)
 * - long: 200 requests per minute (sustained usage)
 *
 * Usage:
 * - Apply @UseGuards(ThrottlerGuard) at controller level
 * - Use @Throttle({ short: 10, medium: 50, long: 200 }) for custom limits
 */
@Module({
  imports: [
    RedisModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 50, // 50 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 200, // 200 requests per minute
      },
      {
        name: 'auth',
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute for auth endpoints
      },
      {
        name: 'public',
        ttl: 60000, // 1 minute
        limit: 30, // 30 requests per minute for public endpoints
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [ThrottlerModule],
})
export class ZanafleetThrottlerModule {}
