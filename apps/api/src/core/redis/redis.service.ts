import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS_MODULE_OPTIONS, DEFAULT_REDIS_URL } from './redis.constants';

export interface RedisModuleOptions {
  url?: string;
  isGlobal?: boolean;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private readonly url: string;

  constructor(
    @Inject(REDIS_MODULE_OPTIONS)
    options: RedisModuleOptions
  ) {
    this.url = options.url || process.env.REDIS_URL || DEFAULT_REDIS_URL;
  }

  async onModuleInit(): Promise<void> {
    this.client = new Redis(this.url);
    this.client.on('error', (err: Error) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Disconnected from Redis');
    }
  }

  /**
   * Atomically set a rate limit key with expiration.
   * Uses SET with NX (only if not exists) and EX (expiration in seconds).
   * @param key - The rate limit key
   * @param ttlSeconds - Time-to-live in seconds
   * @returns true if the key was set (not rate limited), false if key already exists (rate limited)
   */
  async setRateLimitKey(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Get the underlying Redis client for advanced operations.
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Check if Redis is connected and ready.
   * Used for health check endpoints.
   */
  isReady(): boolean {
    return !!this.client && this.client.status === 'ready';
  }
}
