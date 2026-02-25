import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

import { DEFAULT_REDIS_URL, REDIS_MODULE_OPTIONS } from './redis.constants';

export interface RedisModuleOptions {
  url?: string;
  isGlobal?: boolean;
}

/**
 * Mock Redis client for sandbox mode
 */
class MockRedisClient {
  private readonly logger = new Logger('MockRedisClient');
  private store = new Map<string, string>();

  async set(key: string, value: string, _mode?: string, _ttl?: number): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setnx(key: string, value: string): Promise<number> {
    if (this.store.has(key)) return 0;
    this.store.set(key, value);
    return 1;
  }

  async expire(_key: string, _seconds: number): Promise<number> {
    return 1;
  }

  async del(_key: string): Promise<number> {
    return 1;
  }

  async quit(): Promise<'OK'> {
    return 'OK';
  }

  on(_event: string, _callback: () => void): void {
    // No-op for mock
  }

  get status(): string {
    return 'ready';
  }
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private mockClient?: MockRedisClient;
  private readonly url: string;
  private readonly isSandboxMode: boolean;

  constructor(
    @Inject(REDIS_MODULE_OPTIONS)
    options: RedisModuleOptions
  ) {
    this.url = options.url || process.env.REDIS_URL || DEFAULT_REDIS_URL;
    this.isSandboxMode = process.env.SANDBOX_MODE === 'true';
  }

  async onModuleInit(): Promise<void> {
    if (this.isSandboxMode) {
      this.logger.warn('Running in SANDBOX MODE - Redis is mocked');
      this.mockClient = new MockRedisClient();
      return;
    }

    this.client = new Redis(this.url);
    this.client.on('error', (err: Error) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isSandboxMode && this.mockClient) {
      await this.mockClient.quit();
      return;
    }

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
    if (this.isSandboxMode && this.mockClient) {
      const result = await this.mockClient.set(key, '1', 'EX', ttlSeconds);
      return result === 'OK';
    }
    const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Get the underlying Redis client for advanced operations.
   */
  getClient(): Redis {
    if (this.isSandboxMode) {
      throw new Error('Redis client not available in sandbox mode');
    }
    return this.client;
  }

  /**
   * Get the mock client in sandbox mode.
   */
  getMockClient(): MockRedisClient | undefined {
    return this.mockClient;
  }

  /**
   * Check if Redis is connected and ready.
   * Used for health check endpoints.
   */
  isReady(): boolean {
    if (this.isSandboxMode) {
      return !!this.mockClient;
    }
    return !!this.client && this.client.status === 'ready';
  }
}
