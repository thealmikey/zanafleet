/**
 * In-Memory Store Base Implementation
 *
 * Generic in-memory store with CRUD operations and basic filtering.
 * Uses Maps for O(1) lookups.
 */

import { v4 as uuidv4 } from 'uuid';

import { InMemoryEntityStore } from './sandbox.types';

/**
 * Base entity interface with required id property
 */
export interface BaseEntity {
  id: string;
  [key: string]: unknown;
}

/**
 * In-Memory Store Options
 */
export interface InMemoryStoreOptions {
  /**
   * Generate UUIDs for entities without IDs
   */
  autoGenerateIds?: boolean;

  /**
   * Entity name for debugging
   */
  entityName?: string;
}

/**
 * Type for entities that can be stored in the in-memory store
 * Uses a generic approach to allow any entity with an id field
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StorableEntity = any;

/**
 * Base In-Memory Store
 *
 * Generic implementation of InMemoryEntityStore using Maps for O(1) lookups.
 */
export class InMemoryStoreBase<T = StorableEntity> implements InMemoryEntityStore<T> {
  /**
   * Internal storage using Map for O(1) lookups
   */
  protected readonly store: Map<string, T> = new Map();

  /**
   * Options for this store
   */
  protected readonly options: InMemoryStoreOptions;

  constructor(options: InMemoryStoreOptions = {}) {
    this.options = {
      autoGenerateIds: true,
      entityName: 'Entity',
      ...options,
    };
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  /**
   * Find all entities
   */
  async findAll(): Promise<T[]> {
    return Array.from(this.store.values());
  }

  /**
   * Find multiple entities by IDs
   */
  async findByIds(ids: string[]): Promise<T[]> {
    const results: T[] = [];
    for (const id of ids) {
      const entity = await this.findById(id);
      if (entity) {
        results.push(entity);
      }
    }
    return results;
  }

  /**
   * Save a single entity
   * Auto-generates ID if not present
   */
  async save(entity: T): Promise<T> {
    // Generate ID if not present
    const entityToSave = this.ensureId(entity);

    // Clone to prevent external mutations
    const cloned = this.clone(entityToSave) as T & { id: string };

    this.store.set(cloned.id, cloned);
    return cloned;
  }

  /**
   * Save multiple entities
   */
  async saveMany(entities: T[]): Promise<T[]> {
    const results: T[] = [];
    for (const entity of entities) {
      const saved = await this.save(entity);
      results.push(saved);
    }
    return results;
  }

  /**
   * Update an entity
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updated: T = {
      ...existing,
      ...data,
      id: (existing as Record<string, unknown>).id,
    } as T;

    this.store.set(id, updated);
    return updated;
  }

  /**
   * Delete an entity
   */
  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  /**
   * Clear all entities
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Count total entities
   */
  async count(): Promise<number> {
    return this.store.size;
  }

  /**
   * Find entities by a filter function
   */
  async findByFilter(filter: (entity: T) => boolean): Promise<T[]> {
    return Array.from(this.store.values()).filter(filter);
  }

  /**
   * Find first entity matching filter
   */
  async findOneByFilter(filter: (entity: T) => boolean): Promise<T | null> {
    for (const entity of this.store.values()) {
      if (filter(entity)) {
        return entity;
      }
    }
    return null;
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    return this.store.has(id);
  }

  /**
   * Ensure entity has an ID
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected ensureId(entity: T): T & { id: string } {
    const entityAny = entity as any;
    if (!entityAny.id && this.options.autoGenerateIds) {
      return { ...entity, id: uuidv4() } as T & { id: string };
    }
    return entity as T & { id: string };
  }

  /**
   * Deep clone an entity to prevent external mutations
   */
  protected clone(entity: T): T {
    return JSON.parse(JSON.stringify(entity)) as T;
  }

  /**
   * Get raw store for advanced operations
   * Use with caution - bypasses safety checks
   */
  protected getRawStore(): Map<string, T> {
    return this.store;
  }

  /**
   * Seed initial data
   */
  async seed(entities: T[]): Promise<void> {
    for (const entity of entities) {
      const withId = this.ensureId(entity);
      this.store.set(withId.id, withId);
    }
  }
}
