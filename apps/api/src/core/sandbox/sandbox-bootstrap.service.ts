/**
 * Sandbox Bootstrap Service
 *
 * Handles sandbox-specific initialization and configuration.
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

import { InMemoryStoreFactoryService } from './in-memory-store.factory';
import { SandboxModule } from './sandbox.module';
import { SandboxOptions, SandboxBootstrapResult } from './sandbox.types';
import { SeedScenarioRegistry } from './seed-scenario.registry';

/**
 * Sandbox Bootstrap Service
 *
 * Manages the initialization and configuration of sandbox mode.
 */
@Injectable()
export class SandboxBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SandboxBootstrapService.name);

  /**
   * Whether sandbox mode is currently active
   */
  private _isActive = false;

  /**
   * Current scenario name
   */
  private _currentScenario?: string;

  /**
   * Bootstrap errors
   */
  private _errors: string[] = [];

  constructor(
    private readonly storeFactory: InMemoryStoreFactoryService,
    private readonly scenarioRegistry: SeedScenarioRegistry
  ) {}

  /**
   * Module initialization
   */
  async onModuleInit(): Promise<void> {
    const options = SandboxModule.getOptions();

    if (!SandboxModule.isEnabled()) {
      this.logger.log('Sandbox mode is disabled');
      return;
    }

    await this.bootstrap(options);
  }

  /**
   * Bootstrap the sandbox
   */
  async bootstrap(options: SandboxOptions): Promise<SandboxBootstrapResult> {
    this._isActive = true;
    this._errors = [];

    this.logger.log('Initializing sandbox mode...');

    try {
      // Load scenario if enabled
      if (options.enableScenarioLoading && options.scenario) {
        await this.loadScenario(options.scenario);
      }

      this.logger.log(`Sandbox mode initialized with scenario: ${this._currentScenario || 'none'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this._errors.push(message);
      this.logger.error(`Sandbox bootstrap error: ${message}`);
    }

    return {
      isSandboxMode: this._isActive,
      scenarioName: this._currentScenario,
      errors: this._errors,
    };
  }

  /**
   * Load a seed scenario
   */
  async loadScenario(scenarioName: string): Promise<void> {
    this.logger.log(`Loading scenario: ${scenarioName}`);

    const scenario = this.scenarioRegistry.get(scenarioName);
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioName}`);
    }

    await scenario.load();
    this._currentScenario = scenarioName;
  }

  /**
   * Reset all stores
   */
  async reset(): Promise<void> {
    await this.storeFactory.clearAll();
    this._currentScenario = undefined;
    this.logger.log('Sandbox stores cleared');
  }

  /**
   * Get store stats
   */
  async getStats(): Promise<Record<string, number>> {
    return this.storeFactory.getStats();
  }

  /**
   * Get current sandbox options
   */
  getOptions(): SandboxOptions {
    return SandboxModule.getOptions();
  }

  /**
   * Check if sandbox is active
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Get current scenario name
   */
  get currentScenario(): string | undefined {
    return this._currentScenario;
  }

  /**
   * Get bootstrap errors
   */
  get errors(): string[] {
    return this._errors;
  }
}
