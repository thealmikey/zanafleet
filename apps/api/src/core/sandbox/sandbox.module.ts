/**
 * Sandbox Module
 *
 * Provides in-memory storage and conditional DI bindings for sandbox mode.
 */

import {
  DynamicModule,
  Module,
  Provider,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { createConcertScenario } from '../../database/seeds/scenarios/concert.scenario';
import { createDashboardScenario } from '../../database/seeds/scenarios/dashboard.scenario';
import { createMinimalScenario } from '../../database/seeds/scenarios/minimal.scenario';

import { InMemoryStoreFactoryService, createSandboxOptions } from './in-memory-store.factory';
import { SandboxProductionGuard, assertSandboxAllowed } from './sandbox-production.guard';
import {
  SANDBOX_ENV_VAR,
  SandboxModuleOptions,
} from './sandbox.constants';
import { SandboxController } from './sandbox.controller';
import { SandboxHealthIndicator } from './sandbox.health-indicator';
import { SandboxOptions } from './sandbox.types';
import { SeedScenarioRegistry } from './seed-scenario.registry';


/**
 * Sandbox Module
 *
 * Provides infrastructure for running the API without external databases.
 * Use `USE_IN_MEMORY_DB=true` environment variable to enable.
 *
 * Features:
 * - In-memory storage for entities
 * - Seed scenario loading
 * - SDUI preview endpoints
 * - Production guard to prevent sandbox in production
 * - Health indicator for monitoring
 */
@Module({
  imports: [ConfigModule],
  providers: [
    InMemoryStoreFactoryService,
    SeedScenarioRegistry,
    SandboxProductionGuard,
    SandboxHealthIndicator,
  ],
  controllers: [SandboxController],
  exports: [
    InMemoryStoreFactoryService,
    SeedScenarioRegistry,
    SandboxProductionGuard,
    SandboxHealthIndicator,
  ],
})
export class SandboxModule implements NestModule {
  /**
   * Static registration with options
   */
  static forRoot(options?: SandboxModuleOptions): DynamicModule {
    const isEnabled = options?.enabled ?? process.env[SANDBOX_ENV_VAR] === 'true';
    const sandboxOptions = options?.options ?? createSandboxOptions();

    // Assert sandbox is allowed in current environment
    if (isEnabled) {
      assertSandboxAllowed();
    }

    // Register default scenarios
    const scenarioRegistry = new SeedScenarioRegistry();
    const storeFactory = new InMemoryStoreFactoryService();
    scenarioRegistry.register(createMinimalScenario(storeFactory));
    scenarioRegistry.register(createConcertScenario(storeFactory));
    scenarioRegistry.register(createDashboardScenario(storeFactory));

    return {
      module: SandboxModule,
      global: true,
      providers: [
        {
          provide: 'SANDBOX_ENABLED',
          useValue: isEnabled,
        },
        {
          provide: 'SANDBOX_OPTIONS',
          useValue: sandboxOptions,
        },
        {
          provide: SeedScenarioRegistry,
          useValue: scenarioRegistry,
        },
        InMemoryStoreFactoryService,
        SandboxProductionGuard,
        SandboxHealthIndicator,
      ],
      controllers: [SandboxController],
      exports: [
        'SANDBOX_ENABLED',
        'SANDBOX_OPTIONS',
        InMemoryStoreFactoryService,
        SeedScenarioRegistry,
        SandboxProductionGuard,
        SandboxHealthIndicator,
      ],
    };
  }

  /**
   * Check if sandbox mode is enabled
   */
  static isEnabled(): boolean {
    return process.env[SANDBOX_ENV_VAR] === 'true';
  }

  /**
   * Get current sandbox options
   */
  static getOptions(): SandboxOptions {
    return createSandboxOptions();
  }

  /**
   * Configure middleware
   */
  configure(_consumer: MiddlewareConsumer): void {
    // Apply production guard as global middleware when sandbox is enabled
    if (SandboxModule.isEnabled() && process.env.NODE_ENV === 'production') {
      // In production, the guard will throw an error before any request is processed
      // This is handled by the guard itself
    }
  }
}

/**
 * Sandbox Global Providers
 *
 * Providers that are always available regardless of sandbox mode.
 */
export const SANDBOX_GLOBAL_PROVIDERS: Provider[] = [
  {
    provide: 'SANDBOX_ENABLED',
    useFactory: (): boolean => SandboxModule.isEnabled(),
  },
  {
    provide: 'SANDBOX_OPTIONS',
    useFactory: (): SandboxOptions => SandboxModule.getOptions(),
  },
];

/**
 * Sandbox enabled check provider
 */
export const SANDBOX_ENABLED_PROVIDER: Provider = {
  provide: 'SANDBOX_ENABLED',
  useFactory: (): boolean => SandboxModule.isEnabled(),
};

/**
 * Sandbox options provider
 */
export const SANDBOX_OPTIONS_PROVIDER: Provider = {
  provide: 'SANDBOX_OPTIONS',
  useFactory: (): SandboxOptions => SandboxModule.getOptions(),
};

/**
 * Conditional provider helper
 *
 * Returns the appropriate provider based on sandbox mode.
 */
export function conditionalProvider<T>(
  token: string,
  realProvider: Provider,
  sandboxProvider: Provider
): Provider {
  const isSandbox = SandboxModule.isEnabled();

  return {
    provide: token,
    useFactory(...args: unknown[]): T {
      if (isSandbox) {
        const sandboxFactory = (sandboxProvider as { useFactory: () => T }).useFactory;
        return sandboxFactory();
      }
      const realFactory = (realProvider as { useFactory: (...args: unknown[]) => T }).useFactory;
      return realFactory(...args);
    },
  };
}
