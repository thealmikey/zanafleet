import { Injectable, Inject, Logger, Optional } from '@nestjs/common';

import { ICapabilityAccessController } from '../../../core/api/guards/capability.guard';
import { RedisService } from '../../../core/redis/redis.service';
import { CAPABILITY_REPOSITORY_TOKEN, ICapabilityRepository } from '../repositories/capability.repository';

/**
 * Cache TTL in seconds (5 minutes)
 */
const CACHE_TTL_SECONDS = 300;

/**
 * Cache key prefix for capability checks
 */
const CACHE_KEY_PREFIX = 'capability:check';

/**
 * CapabilityAccessController Options
 */
export interface CapabilityAccessControllerOptions {
  /**
   * Enable caching for capability lookups
   */
  enableCache?: boolean;

  /**
   * Cache TTL in seconds
   */
  cacheTtlSeconds?: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: CapabilityAccessControllerOptions = {
  enableCache: true,
  cacheTtlSeconds: CACHE_TTL_SECONDS,
};

/**
 * CapabilityAccessController
 *
 * Concrete implementation of ICapabilityAccessController that:
 * - Checks if an actor has a capability via persona relationships
 * - Uses PostgreSQL for capability lookups
 * - Supports Redis caching for performance
 * - Is injectable and testable
 * - Can be used outside HTTP guards (e.g., by Orchestrator)
 */
@Injectable()
export class CapabilityAccessController implements ICapabilityAccessController {
  private readonly logger = new Logger(CapabilityAccessController.name);
  private readonly options: CapabilityAccessControllerOptions;
  private readonly redisService: RedisService | null;

  constructor(
    @Inject(CAPABILITY_REPOSITORY_TOKEN)
    private readonly capabilityRepository: ICapabilityRepository,
    @Optional() @Inject(RedisService) redisService?: RedisService,
    @Optional() options?: CapabilityAccessControllerOptions
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.redisService = this.options.enableCache ? redisService ?? null : null;

    if (!this.redisService && this.options.enableCache) {
      this.logger.warn(
        'CapabilityAccessController: Redis not available, falling back to non-cached lookups'
      );
    }

    this.logger.log(
      `CapabilityAccessController initialized with cache: ${this.options.enableCache ?? false}`
    );
  }

  /**
   * Check if an actor has a specific capability
   *
   * This method:
   * 1. Checks cache first (if enabled)
   * 2. Queries persona-capability relationships via repository
   * 3. Returns result with caching
   *
   * @param actorId - The ID of the actor to check
   * @param capabilityName - The name of the capability required
   * @returns true if the actor has the capability, false otherwise
   */
  async hasCapability(actorId: string, capabilityName: string): Promise<boolean> {
    const cacheKey = this.buildCacheKey(actorId, capabilityName);

    // Try cache first
    if (this.redisService) {
      try {
        const cached = await this.redisService.getClient().get(cacheKey);
        if (cached !== null) {
          this.logger.debug(
            `CapabilityAccessController: Cache hit for actor=${actorId}, capability=${capabilityName}`
          );
          return cached === '1';
        }
      } catch (error) {
        this.logger.warn(`Cache read failed: ${(error as Error).message}, falling back to DB`);
      }
    }

    // Query the database
    const hasCapability = await this.capabilityRepository.actorHasCapabilityViaPersonas(
      actorId,
      capabilityName
    );

    this.logger.debug(
      `CapabilityAccessController: Actor ${actorId} ${
        hasCapability ? 'has' : 'does not have'
      } capability: ${capabilityName}`
    );

    // Cache the result
    if (this.redisService) {
      try {
        await this.redisService
          .getClient()
          .setex(cacheKey, this.options.cacheTtlSeconds ?? 300, hasCapability ? '1' : '0');
      } catch (error) {
        this.logger.warn(`Cache write failed: ${(error as Error).message}`);
      }
    }

    return hasCapability;
  }

  /**
   * Check if an actor has multiple capabilities
   *
   * @param actorId - The ID of the actor to check
   * @param capabilityNames - The names of the capabilities required
   * @returns Map of capability name to boolean result
   */
  async hasCapabilities(
    actorId: string,
    capabilityNames: string[]
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // Parallel execution for better performance
    const checks = await Promise.all(
      capabilityNames.map(async (capabilityName) => {
        const hasCapability = await this.hasCapability(actorId, capabilityName);
        return { capabilityName, hasCapability };
      })
    );

    checks.forEach(({ capabilityName, hasCapability }) => {
      results.set(capabilityName, hasCapability);
    });

    return results;
  }

  /**
   * Check if actor has ALL required capabilities
   *
   * @param actorId - The ID of the actor to check
   * @param capabilityNames - The names of the capabilities required
   * @returns true if actor has ALL capabilities
   */
  async hasAllCapabilities(actorId: string, capabilityNames: string[]): Promise<boolean> {
    if (capabilityNames.length === 0) {
      return true;
    }

    const results = await this.hasCapabilities(actorId, capabilityNames);
    return capabilityNames.every((name) => results.get(name) === true);
  }

  /**
   * Check if actor has ANY of the required capabilities
   *
   * @param actorId - The ID of the actor to check
   * @param capabilityNames - The names of the capabilities to check
   * @returns true if actor has ANY of the capabilities
   */
  async hasAnyCapability(actorId: string, capabilityNames: string[]): Promise<boolean> {
    if (capabilityNames.length === 0) {
      return false;
    }

    const results = await this.hasCapabilities(actorId, capabilityNames);
    return capabilityNames.some((name) => results.get(name) === true);
  }

  /**
   * Get all capabilities for an actor
   *
   * @param actorId - The ID of the actor
   * @returns Array of capability names the actor possesses
   */
  async getCapabilitiesForActor(actorId: string): Promise<string[]> {
    // Get all persona IDs for the actor
    const personaIds = await this.capabilityRepository.findPersonaIdsForActor(actorId);

    if (personaIds.length === 0) {
      return [];
    }

    // Get all unique capability names across all personas
    const allCapabilities = new Set<string>();

    await Promise.all(
      personaIds.map(async (personaId) => {
        const capabilities = await this.capabilityRepository.getCapabilityNamesForPersona(
          personaId
        );
        capabilities.forEach((cap) => allCapabilities.add(cap));
      })
    );

    return Array.from(allCapabilities);
  }

  /**
   * Invalidate cache for an actor's capability lookup
   *
   * @param actorId - The ID of the actor
   * @param capabilityName - Optional specific capability to invalidate
   */
  async invalidateCache(actorId: string, capabilityName?: string): Promise<void> {
    if (!this.redisService) {
      return;
    }

    try {
      const client = this.redisService.getClient();

      if (capabilityName) {
        const cacheKey = this.buildCacheKey(actorId, capabilityName);
        await client.del(cacheKey);
        this.logger.debug(`Invalidated cache for ${cacheKey}`);
      } else {
        // Delete all keys with the actor prefix using SCAN
        const pattern = `${CACHE_KEY_PREFIX}:${actorId}:*`;
        let cursor = '0';

        do {
          const [newCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = newCursor;

          if (keys.length > 0) {
            await client.del(...keys);
          }
        } while (cursor !== '0');

        this.logger.debug(`Invalidated all cache keys for actor ${actorId}`);
      }
    } catch (error) {
      this.logger.warn(`Cache invalidation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Build cache key for capability check
   */
  private buildCacheKey(actorId: string, capabilityName: string): string {
    return `${CACHE_KEY_PREFIX}:${actorId}:${capabilityName}`;
  }
}
