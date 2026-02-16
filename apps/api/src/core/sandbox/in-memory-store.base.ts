/**
 * In-Memory Store Base Implementation
 *
 * Generic in-memory store with CRUD operations and basic filtering.
 * Uses Maps for O(1) lookups.
 */

import { v4 as uuidv4 } from 'uuid';

import { InMemoryEntityStore } from './sandbox.types';

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
 * Base In-Memory Store
 *
 * Generic implementation of InMemoryEntityStore using Maps for O(1) lookups.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class InMemoryStoreBase<T = any> implements InMemoryEntityStore<T> {
  /**
   * Internal storage using Map for O(1) lookups
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readonly store: Map<string, any> = new Map();

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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  async findById(id: string): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  /**
   * Find all entities
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  async findAll(): Promise<T[]> {
    return Array.from(this.store.values()) as T[];
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
  async save(entity: T): Promise<T> {
    // Generate ID if not present
    const entityToSave = this.ensureId(entity);

    // Clone to prevent external mutations
    const cloned = this.clone(entityToSave);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
    this.store.set((cloned as any).id, cloned);
    return cloned ;
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingAny = existing as any;
    const updated = {
      ...existingAny,
      ...data,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      id: existingAny.id,
    };

    this.store.set(id, updated);
    return updated as T;
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  async findByFilter(filter: (entity: T) => boolean): Promise<T[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return Array.from(this.store.values()).filter(filter) as T[];
  }

  /**
   * Find first entity matching filter
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return
  async findOneByFilter(filter: (entity: T) => boolean): Promise<T | null> {
    for (const entity of this.store.values()) {
      if (filter(entity)) {
        return entity as T;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-return
  protected ensureId(entity: T): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyEntity = entity as any;
    if (!anyEntity.id && this.options.autoGenerateIds) {
      return { ...anyEntity, id: uuidv4() } as T;
    }
    return entity;
  }

  /**
   * Deep clone an entity to prevent external mutations
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-return
  protected clone(entity: T): T {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return JSON.parse(JSON.stringify(entity)) as T;
  }

  /**
   * Get raw store for advanced operations
   * Use with caution - bypasses safety checks
   */
  protected getRawStore(): Map<string, T> {
    return this.store as Map<string, T>;
  }

  /**
   * Seed initial data
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
  async seed(entities: T[]): Promise<void> {
    for (const entity of entities) {
      const withId = this.ensureId(entity);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
      this.store.set((withId as any).id, withId);
    }
  }
}
