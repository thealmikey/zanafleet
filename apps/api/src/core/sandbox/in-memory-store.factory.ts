/**
 * In-Memory Store Factory
 *
 * Factory for creating and managing in-memory stores for different entity types.
 */

import { Injectable } from '@nestjs/common';

import { InMemoryStoreBase } from './in-memory-store.base';
import { InMemoryEntityStore, SandboxOptions } from './sandbox.types';

/**
 * In-Memory Store Factory Service
 *
 * Provides a centralized way to create and access in-memory stores.
 */
@Injectable()
export class InMemoryStoreFactoryService {
  /**
   * Map of entity name to store instance
   */
  private readonly stores: Map<string, InMemoryStoreBase<Record<string, unknown>>> = new Map();

  /**
   * Default options for new stores
   */
  private readonly defaultOptions = {
    autoGenerateIds: true,
  };

  /**
   * Get or create a store for an entity type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStore<T = any>(entityName: string): InMemoryEntityStore<T> {
    if (!this.stores.has(entityName)) {
      const store = new InMemoryStoreBase<Record<string, unknown>>({
        ...this.defaultOptions,
        entityName,
      });
      this.stores.set(entityName, store);
    }

    return this.stores.get(entityName) as unknown as InMemoryEntityStore<T>;
  }

  /**
   * Clear all stores
   */
  async clearAll(): Promise<void> {
    for (const store of this.stores.values()) {
      await store.clear();
    }
    this.stores.clear();
  }

  /**
   * Get all entity names
   */
  getEntityNames(): string[] {
    return Array.from(this.stores.keys());
  }

  /**
   * Get store stats
   */
  async getStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    for (const [name, store] of this.stores.entries()) {
      stats[name] = await store.count();
    }
    return stats;
  }

  /**
   * Check if a store exists
   */
  hasStore(entityName: string): boolean {
    return this.stores.has(entityName);
  }

  /**
   * Delete a specific store
   */
  async deleteStore(entityName: string): Promise<boolean> {
    const store = this.stores.get(entityName);
    if (store) {
      await store.clear();
      return this.stores.delete(entityName);
    }
    return false;
  }
}

/**
 * Create sandbox options from environment
 */
export function createSandboxOptions(): SandboxOptions {
  const useInMemoryDb = process.env.USE_IN_MEMORY_DB === 'true';

  if (!useInMemoryDb) {
    return { enableScenarioLoading: false };
  }

  return {
    enableScenarioLoading: process.env.SANDBOX_LOAD_SCENARIO !== 'false',
    disableBackgroundAgents: process.env.SANDBOX_DISABLE_AGENTS === 'true',
    disableQueueWorkers: process.env.SANDBOX_DISABLE_QUEUE === 'true',
    stubEventBus: process.env.SANDBOX_STUB_EVENTS === 'true',
    stubAIProvider: process.env.SANDBOX_STUB_AI === 'true',
    scenario: process.env.SANDBOX_SCENARIO || 'minimal',
  };
}
