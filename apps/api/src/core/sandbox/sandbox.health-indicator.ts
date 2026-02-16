/**
 * Sandbox Health Indicator
 *
 * Health check that verifies sandbox mode is not active in production.
 * Used by NestJS Terminus for /health endpoint.
 */

import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthCheckError, HealthCheckResult, HealthIndicatorResult, HealthCheckStatus } from '@nestjs/terminus';

import { SANDBOX_ENV_VAR } from './sandbox.constants';

/**
 * Sandbox Health Indicator
 *
 * Provides health checks for sandbox mode:
 * - Ensures sandbox is not enabled in production
 * - Reports sandbox status
 */
@Injectable()
export class SandboxHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(SandboxHealthIndicator.name);

  /**
   * Check if sandbox mode is healthy (not enabled in production)
   */
  async check(): Promise<HealthCheckResult> {
    const isSandboxEnabled = process.env[SANDBOX_ENV_VAR] === 'true';
    const nodeEnv = process.env.NODE_ENV || 'development';

    const isHealthy = !isSandboxEnabled || nodeEnv !== 'production';

    const details: HealthIndicatorResult = this.getStatus('sandbox', isHealthy, {
      sandboxEnabled: isSandboxEnabled,
      environment: nodeEnv,
    });

    const result: HealthCheckResult = {
      status: (isHealthy ? 'up' : 'down') as HealthCheckStatus,
      details,
    };

    if (!isHealthy) {
      this.logger.error(
        `HEALTH CHECK FAILED: Sandbox mode is enabled in production environment. ` +
          `This is a security risk. Please remove USE_IN_MEMORY_DB from your environment.`
      );

      throw new HealthCheckError(
        'Sandbox mode is not allowed in production',
        result
      );
    }

    if (isSandboxEnabled && nodeEnv !== 'production') {
      this.logger.warn(
        `Sandbox mode is enabled in ${nodeEnv} environment. ` +
          `This is for development/testing only.`
      );
    }

    return result;
  }

  /**
   * Check if sandbox is enabled
   */
  isSandboxEnabled(): boolean {
    return process.env[SANDBOX_ENV_VAR] === 'true';
  }

  /**
   * Get current environment
   */
  getEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }
}
