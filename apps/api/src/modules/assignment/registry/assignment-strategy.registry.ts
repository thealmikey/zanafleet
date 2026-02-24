import { Injectable, Logger } from '@nestjs/common';

import { AssignmentStrategy, AssignmentStrategyType } from '../interfaces';

/**
 * Assignment Strategy Registry
 *
 * Central registry for all assignment strategies.
 * Provides automatic strategy selection and retrieval.
 *
 * @logging This class logs all strategy registration and selection decisions
 * for observability and debugging purposes.
 */
@Injectable()
export class AssignmentStrategyRegistry {
  private readonly logger = new Logger(AssignmentStrategyRegistry.name);
  private readonly strategies: Map<AssignmentStrategyType, AssignmentStrategy> = new Map();
  private readonly strategiesByName: Map<string, AssignmentStrategy> = new Map();

  /**
   * Register a strategy with the registry.
   *
   * @logging Logs strategy registration with type and name
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
   *
   * @logging Logs when a strategy is retrieved by type
   */
  get(type: AssignmentStrategyType): AssignmentStrategy | undefined {
    const strategy = this.strategies.get(type);

    if (strategy) {
      this.logger.debug(`Retrieved strategy ${strategy.name} for type ${type}`);
    } else {
      this.logger.warn(`No strategy found for type: ${type}`);
    }

    return strategy;
  }

  /**
   * Get a strategy by name.
   *
   * @logging Logs when a strategy is retrieved by name
   */
  getByName(name: string): AssignmentStrategy | undefined {
    const strategy = this.strategiesByName.get(name);

    if (strategy) {
      this.logger.debug(`Retrieved strategy ${name} by name`);
    } else {
      this.logger.warn(`No strategy found for name: ${name}`);
    }

    return strategy;
  }

  /**
   * Get all registered strategies.
   *
   * @logging Logs the count of strategies returned
   */
  getAll(): AssignmentStrategy[] {
    const strategies = Array.from(this.strategies.values());
    this.logger.debug(`Retrieved ${strategies.length} registered strategies`);
    return strategies;
  }

  /**
   * Find the best strategy for a given context.
   * Returns the strategy with the highest priority that can handle the context.
   *
   * @logging Logs the selection process including priority scores
   */
  async findBestStrategy(
    context: Parameters<AssignmentStrategy['canHandle']>[0]
  ): Promise<AssignmentStrategy | undefined> {
    const availableStrategies = this.getAll();

    if (availableStrategies.length === 0) {
      this.logger.error('No strategies registered - cannot select best strategy');
      return undefined;
    }

    this.logger.debug(
      `Evaluating ${availableStrategies.length} strategies for job ${context.jobId}`
    );

    // Filter strategies that can handle the context
    const capableStrategies: Array<{ strategy: AssignmentStrategy; priority: number }> = [];

    for (const strategy of availableStrategies) {
      try {
        const canHandle = await strategy.canHandle(context);
        if (canHandle) {
          const priority = strategy.getPriority(context);
          this.logger.debug(
            `Strategy ${strategy.name} can handle job ${context.jobId} with priority ${priority}`
          );
          capableStrategies.push({ strategy, priority });
        } else {
          this.logger.debug(`Strategy ${strategy.name} cannot handle job ${context.jobId}`);
        }
      } catch (error) {
        this.logger.error(
          `Error checking if strategy ${strategy.name} can handle job ${context.jobId}: ${error}`
        );
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
   *
   * @logging Logs the number of capable strategies found
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

    this.logger.debug(
      `Found ${capableStrategies.length} capable strategies for job ${context.jobId}`
    );

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
