/**
 * Sandbox Type Definitions
 *
 * Type definitions for the in-memory sandbox infrastructure.
 */

export interface SandboxOptions {
  /**
   * Enable loading of predefined seed scenarios
   */
  enableScenarioLoading?: boolean;

  /**
   * Disable background agents (for faster boot)
   */
  disableBackgroundAgents?: boolean;

  /**
   * Disable queue workers (for testing without Redis)
   */
  disableQueueWorkers?: boolean;

  /**
   * Stub the event bus (don't publish events)
   */
  stubEventBus?: boolean;

  /**
   * Stub the AI provider (return mock responses)
   */
  stubAIProvider?: boolean;

  /**
   * Name of the scenario to load on boot
   */
  scenario?: string;
}

/**
 * In-Memory Entity Store Interface
 *
 * Generic interface for in-memory storage operations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface InMemoryEntityStore<T = any> {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities
   */
  findAll(): Promise<T[]>;

  /**
   * Find multiple entities by IDs
   */
  findByIds(ids: string[]): Promise<T[]>;

  /**
   * Save a single entity
   */
  save(entity: T): Promise<T>;

  /**
   * Save multiple entities
   */
  saveMany(entities: T[]): Promise<T[]>;

  /**
   * Update an entity
   */
  update(id: string, data: Partial<T>): Promise<T | null>;

  /**
   * Delete an entity
   */
  delete(id: string): Promise<boolean>;

  /**
   * Clear all entities
   */
  clear(): Promise<void>;

  /**
   * Count total entities
   */
  count(): Promise<number>;
}

/**
 * Seed Scenario Definition
 */
export interface SeedScenario {
  /**
   * Unique scenario name
   */
  name: string;

  /**
   * Human-readable description
   */
  description: string;

  /**
   * Load function that populates the store
   */
  load: () => Promise<void>;
}

/**
 * Sandbox Bootstrap Result
 */
export interface SandboxBootstrapResult {
  /**
   * Whether sandbox mode is active
   */
  isSandboxMode: boolean;

  /**
   * The loaded scenario name (if any)
   */
  scenarioName?: string;

  /**
   * Errors encountered during bootstrap
   */
  errors: string[];
}

/**
 * Entity Store Factory
 */
export interface InMemoryStoreFactory {
  /**
   * Get or create a store for an entity type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStore<T = any>(entityName: string): InMemoryEntityStore<T>;

  /**
   * Clear all stores
   */
  clearAll(): Promise<void>;

  /**
   * Get all entity names
   */
  getEntityNames(): string[];
}
