/**
 * Sandbox Controller
 *
 * REST endpoints for sandbox mode including:
 * - SDUI preview routes for testing UI compositions
 * - Scenario management (list, reset)
 * - Sandbox status and health
 */

import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UIComposerService } from '../../modules/ui-composer/services/ui-composer.service';

import { InMemoryStoreFactoryService } from './in-memory-store.factory';
import { SANDBOX_ENV_VAR } from './sandbox.constants';
import { SandboxModule } from './sandbox.module';
import { SeedScenarioRegistry } from './seed-scenario.registry';

/**
 * DTO for scenario response
 */
interface ScenarioResponse {
  name: string;
  description: string;
}

/**
 * DTO for screen preview response
 */
interface ScreenPreviewResponse {
  screen: string;
  metadata: Record<string, unknown>;
  components: unknown[];
  actions: unknown[];
  sandboxMode: boolean;
}

/**
 * DTO for reset response
 */
interface ResetResponse {
  success: boolean;
  message: string;
  scenarioLoaded?: string;
}

/**
 * Sandbox Controller
 *
 * Provides endpoints for:
 * - GET /sandbox/scenarios - List available seed scenarios
 * - GET /sandbox/screen/:contextId - Get SDUI preview for a context
 * - POST /sandbox/reset - Reset sandbox to initial state
 * - GET /sandbox/status - Get sandbox status
 */
@Controller('sandbox')
export class SandboxController {
  private readonly logger = new Logger(SandboxController.name);

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(UIComposerService) private readonly uiComposer: UIComposerService,
    @Inject(SeedScenarioRegistry) private readonly scenarioRegistry: SeedScenarioRegistry,
    @Inject(InMemoryStoreFactoryService) private readonly storeFactory: InMemoryStoreFactoryService
  ) {}

  /**
   * Check if we're in sandbox mode
   */
  private isSandboxMode(): boolean {
    return SandboxModule.isEnabled();
  }

  /**
   * GET /sandbox/scenarios
   *
   * List all available seed scenarios
   */
  @Get('scenarios')
  @HttpCode(HttpStatus.OK)
  async listScenarios(): Promise<{ scenarios: ScenarioResponse[]; currentScenario?: string }> {
    // Allow in both sandbox and non-sandbox modes for listing
    const scenarios = this.scenarioRegistry.getAll();
    const currentScenario = this.configService.get<string>('SANDBOX_SCENARIO');

    return {
      scenarios,
      currentScenario,
    };
  }

  /**
   * GET /sandbox/screen/:contextId
   *
   * Get SDUI preview for a specific context
   * This endpoint bypasses authentication in sandbox mode
   */
  @Get('screen/:contextId')
  @HttpCode(HttpStatus.OK)
  async getScreenPreview(
    @Param('contextId') contextId: string,
    @Query('actorId') actorId: string,
    @Query('contextType') contextType: string
  ): Promise<ScreenPreviewResponse> {
    // Only allow in sandbox mode for security
    if (!this.isSandboxMode()) {
      throw new ForbiddenException('Screen preview is only available in sandbox mode. Use USE_IN_MEMORY_DB=true');
    }

    // Validate required parameters
    if (!actorId) {
      throw new BadRequestException('actorId query parameter is required');
    }

    if (!contextType) {
      throw new BadRequestException('contextType query parameter is required');
    }

    this.logger.log(`Getting screen preview for contextId=${contextId}, actorId=${actorId}, contextType=${contextType}`);

    try {
      // Use UIComposer service to get the screen
      const response = await this.uiComposer.compose({
        actorId,
        contextType,
        contextId,
        options: {
          previewMode: true, // Enable preview mode to show all possible actions
        },
      });

      return {
        screen: response.screen,
        metadata: response.metadata,
        components: response.components,
        actions: response.actions,
        sandboxMode: true,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to compose screen: ${(error as Error).message}`);
      throw new NotFoundException(`Could not compose screen for context: ${contextId}`);
    }
  }

  /**
   * POST /sandbox/reset
   *
   * Reset the sandbox to initial state by reloading the current scenario
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetSandbox(@Query('scenario') scenario?: string): Promise<ResetResponse> {
    // Only allow in sandbox mode
    if (!this.isSandboxMode()) {
      throw new ForbiddenException('Reset is only available in sandbox mode. Use USE_IN_MEMORY_DB=true');
    }

    const scenarioToLoad = scenario || this.configService.get<string>('SANDBOX_SCENARIO') || 'minimal';

    this.logger.log(`Resetting sandbox, loading scenario: ${scenarioToLoad}`);

    try {
      // Clear all stores
      await this.storeFactory.clearAll();

      // Check if scenario exists
      if (!this.scenarioRegistry.has(scenarioToLoad)) {
        const available = this.scenarioRegistry.getNames();
        throw new NotFoundException(
          `Scenario '${scenarioToLoad}' not found. Available: ${available.join(', ')}`
        );
      }

      // Reload the scenario
      await this.scenarioRegistry.load(scenarioToLoad);

      // Get updated store statistics
      const entityNames = this.storeFactory.getEntityNames();
      const stats: Record<string, number> = {};
      for (const name of entityNames) {
        const store = this.storeFactory.getStore(name);
        stats[name] = await store.count();
      }

      this.logger.log(`Sandbox reset complete. Loaded scenario: ${scenarioToLoad}`);

      return {
        success: true,
        message: `Sandbox reset complete. Loaded scenario: ${scenarioToLoad}`,
        scenarioLoaded: scenarioToLoad,
      };
    } catch (error) {
      this.logger.error(`Failed to reset sandbox: ${(error as Error).message}`);
      throw new BadRequestException(`Failed to reset sandbox: ${(error as Error).message}`);
    }
  }

  /**
   * GET /sandbox/status
   *
   * Get current sandbox status
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getStatus(): Promise<{
    sandboxMode: boolean;
    scenario?: string;
    stores: Array<{ name: string; count: number }>;
    environment: Record<string, string>;
  }> {
    const isSandbox = this.isSandboxMode();
    const scenario = this.configService.get<string>('SANDBOX_SCENARIO');

    // Get store statistics
    const stores: Array<{ name: string; count: number }> = [];
    if (isSandbox) {
      const entityNames = this.storeFactory.getEntityNames();
      for (const name of entityNames) {
        const store = this.storeFactory.getStore(name);
        stores.push({
          name,
          count: await store.count(),
        });
      }
    }

    return {
      sandboxMode: isSandbox,
      scenario,
      stores,
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        useInMemoryDb: process.env[SANDBOX_ENV_VAR] || 'false',
      },
    };
  }

  /**
   * GET /sandbox/health
   *
   * Health check endpoint specifically for sandbox mode
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{
    status: string;
    sandboxMode: boolean;
    checks: Record<string, string>;
  }> {
    const isSandbox = this.isSandboxMode();

    const checks: Record<string, string> = {
      sandboxEnabled: isSandbox ? 'up' : 'down',
    };

    // Additional checks when in sandbox mode
    if (isSandbox) {
      try {
        const entityNames = this.storeFactory.getEntityNames();
        checks.storeFactory = entityNames.length > 0 ? 'up' : 'down';
        checks.scenarioRegistry = 'up';
      } catch {
        checks.storeFactory = 'error';
      }
    }

    const allUp = Object.values(checks).every((v) => v === 'up');

    return {
      status: allUp ? 'ok' : 'degraded',
      sandboxMode: isSandbox,
      checks,
    };
  }
}
