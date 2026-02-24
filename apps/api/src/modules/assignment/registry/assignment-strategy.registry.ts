import { Injectable, Logger } from '@nestjs/common';

import { AssignmentStrategy, AssignmentStrategyType } from '../interfaces';

/**
 * Assignment Strategy Registry
 *
 * Central registry for all assignment strategies.
 * Provides automatic strategy selection and retrieval.
 */
@Injectable()
export class AssignmentStrategyRegistry {
  private readonly logger = new Logger(AssignmentStrategyRegistry.name);
  private readonly strategies: Map<AssignmentStrategyType, AssignmentStrategy> = new Map();
  private readonly strategiesByName: Map<string, AssignmentStrategy> = new Map();

  /**
   * Register a strategy with the registry.
   */
  register(strategy: AssignmentStrategy): void {
    if (this.strategies.has(strategy.type)) {
      this.logger.warn(
        `Strategy ${strategy.type} is already registered. Replacing existing strategy.`
      );
    }

    this.strategies.set(strategy.type, strategy);
    this.strategiesByName.set(strategy.name, strategy);

    this.logger.log(`Registered assignment strategy: ${strategy.name} (${strategy.type})`);
  }

  /**
   * Get a strategy by type.
   */
  get(type: AssignmentStrategyType): AssignmentStrategy | undefined {
    return this.strategies.get(type);
  }

  /**
   * Get a strategy by name.
   */
  getByName(name: string): AssignmentStrategy | undefined {
    return this.strategiesByName.get(name);
  }

  /**
   * Get all registered strategies.
   */
  getAll(): AssignmentStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Find the best strategy for a given context.
   * Returns the strategy with the highest priority that can handle the context.
   */
  async findBestStrategy(context: Parameters<AssignmentStrategy['canHandle']>[0]): Promise<AssignmentStrategy | undefined> {
    const availableStrategies = this.getAll();

    // Filter strategies that can handle the context
    const capableStrategies: Array<{ strategy: AssignmentStrategy; priority: number }> = [];

    for (const strategy of availableStrategies) {
      const canHandle = await strategy.canHandle(context);
      if (canHandle) {
        const priority = strategy.getPriority(context);
        capableStrategies.push({ strategy, priority });
      }
    }

    if (capableStrategies.length === 0) {
      this.logger.warn(`No strategy found capable of handling context for job ${context.jobId}`);
      return undefined;
    }

    // Sort by priority (highest first)
    capableStrategies.sort((a, b) => b.priority - a.priority);

    const bestStrategy = capableStrategies[0].strategy;
    this.logger.log(
      `Selected strategy ${bestStrategy.name} for job ${context.jobId} (priority: ${capableStrategies[0].priority})`
    );

    return bestStrategy;
  }

  /**
   * Get all strategies that can handle a given context.
   */
  async findAllCapableStrategies(
    context: Parameters<AssignmentStrategy['canHandle']>[0]
  ): Promise<AssignmentStrategy[]> {
    const availableStrategies = this.getAll();
    const capableStrategies: Array<{ strategy: AssignmentStrategy; priority: number }> = [];

    for (const strategy of availableStrategies) {
      const canHandle = await strategy.canHandle(context);
      if (canHandle) {
        const priority = strategy.getPriority(context);
        capableStrategies.push({ strategy, priority });
      }
    }

    // Sort by priority (highest first)
    capableStrategies.sort((a, b) => b.priority - a.priority);

    return capableStrategies.map((s) => s.strategy);
  }

  /**
   * Check if a strategy type is registered.
   */
  has(type: AssignmentStrategyType): boolean {
    return this.strategies.has(type);
  }

  /**
   * Get the count of registered strategies.
   */
  count(): number {
    return this.strategies.size;
  }

  /**
   * Clear all registered strategies (useful for testing).
   */
  clear(): void {
    this.strategies.clear();
    this.strategiesByName.clear();
    this.logger.log('Cleared all assignment strategies');
  }
}
