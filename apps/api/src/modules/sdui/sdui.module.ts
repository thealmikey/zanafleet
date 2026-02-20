/**
 * SDUI Module
 *
 * Server-Driven UI module that provides screen-based UI rendering.
 * Integrates with the sandbox for seeded data support.
 */

import { Module, OnModuleInit, Logger } from '@nestjs/common';

import { CapabilityModule } from '../capability/capability.module';

import { SDUIController } from './sdui.controller';
import { SDUIService } from './services/sdui.service';
import { DashboardScreenStrategy } from './strategies/dashboard.screen';
import { LoginScreenStrategy } from './strategies/login.screen';

// Type for sandbox store factory
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InMemoryStoreFactoryType = new (...args: any[]) => any;

/**
 * SDUI Module
 *
 * Provides server-driven UI capabilities.
 */
@Module({
  imports: [CapabilityModule],
  controllers: [SDUIController],
  providers: [
    SDUIService,
    LoginScreenStrategy,
    DashboardScreenStrategy,
  ],
  exports: [SDUIService],
})
export class SDUIModule implements OnModuleInit {
  private readonly logger = new Logger(SDUIModule.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private storeFactory: InMemoryStoreFactoryType | null = null;

  constructor(
    private readonly sduiService: SDUIService,
    private readonly loginStrategy: LoginScreenStrategy,
    private readonly dashboardStrategy: DashboardScreenStrategy
  ) {
    // Try to get sandbox store factory using dynamic import
    this.initSandbox();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private initSandbox(): void {
    try {
      // Dynamic import to avoid build issues when sandbox is not available
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sandboxModule = require('../../core/sandbox/in-memory-store.factory');
      this.storeFactory = sandboxModule.InMemoryStoreFactoryService;
    } catch {
      // Sandbox module not available - will use demo data
      this.logger.warn('Sandbox module not available, using demo data');
    }
  }

  /**
   * Module initialization - register screen strategies
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing SDUI Module...');

    // Register Login screen
    this.sduiService.registerRenderer('login', this.loginStrategy);
    this.logger.log('Registered screen: login');

    // Register Dashboard screens for different roles
    const roles = ['admin', 'dispatcher', 'driver', 'business', 'rider', 'operator'];

    for (const role of roles) {
      const dashboardRenderer = new DashboardScreenStrategy(this.sduiService);
      this.sduiService.registerRenderer(`dashboard.${role}`, dashboardRenderer);
    }

    // Register default dashboard
    this.sduiService.registerRenderer('dashboard', this.dashboardStrategy);

    this.logger.log(`Registered screens: login, dashboard (${roles.length} roles)`);
    this.logger.log('SDUI Module initialized');
  }
}
