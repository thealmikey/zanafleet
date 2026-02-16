/**
 * Seed Scenario Registry
 *
 * Registry for managing seed scenarios that can be loaded into the in-memory stores.
 */

import { Injectable, Logger } from '@nestjs/common';

import { SeedScenario } from './sandbox.types';

/**
 * Seed Scenario Registry
 *
 * Provides a central registry for seed scenarios that can be loaded
 * into the in-memory stores for testing and development.
 */
@Injectable()
export class SeedScenarioRegistry {
  private readonly logger = new Logger(SeedScenarioRegistry.name);

  /**
   * Map of scenario name to scenario definition
   */
  private readonly scenarios: Map<string, SeedScenario> = new Map();

  /**
   * Register a seed scenario
   */
  register(scenario: SeedScenario): void {
    if (this.scenarios.has(scenario.name)) {
      this.logger.warn(`Overwriting existing scenario: ${scenario.name}`);
    }
    this.scenarios.set(scenario.name, scenario);
    this.logger.log(`Registered scenario: ${scenario.name}`);
  }

  /**
   * Get a scenario by name
   */
  get(name: string): SeedScenario | undefined {
    return this.scenarios.get(name);
  }

  /**
   * Check if scenario exists
   */
  has(name: string): boolean {
    return this.scenarios.has(name);
  }

  /**
   * Get all registered scenario names
   */
  getNames(): string[] {
    return Array.from(this.scenarios.keys());
  }

  /**
   * Get all scenarios with descriptions
   */
  getAll(): Array<{ name: string; description: string }> {
    return Array.from(this.scenarios.values()).map((s) => ({
      name: s.name,
      description: s.description,
    }));
  }

  /**
   * Load a scenario by name
   */
  async load(name: string): Promise<void> {
    const scenario = this.scenarios.get(name);
    if (!scenario) {
      throw new Error(`Scenario not found: ${name}`);
    }

    this.logger.log(`Loading scenario: ${name} - ${scenario.description}`);
    await scenario.load();
    this.logger.log(`Scenario loaded: ${name}`);
  }

  /**
   * Unregister a scenario
   */
  unregister(name: string): boolean {
    return this.scenarios.delete(name);
  }

  /**
   * Clear all scenarios
   */
  clear(): void {
    this.scenarios.clear();
  }
}
