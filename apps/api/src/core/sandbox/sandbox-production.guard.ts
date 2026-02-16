/**
 * Sandbox Production Guard
 *
 * Guards against accidental sandbox mode usage in production.
 * Throws an error if USE_IN_MEMORY_DB is set in production environment.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

import { SANDBOX_ENV_VAR } from './sandbox.constants';

/**
 * Production Guard for Sandbox Mode
 *
 * This guard prevents sandbox mode from being enabled in production.
 * It checks if USE_IN_MEMORY_DB is set when NODE_ENV is production.
 */
@Injectable()
export class SandboxProductionGuard implements CanActivate {
  private readonly logger = new Logger(SandboxProductionGuard.name);

  /**
   * Check if the request should be allowed
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canActivate(_context: ExecutionContext): boolean {
    // Only check if sandbox mode is enabled
    if (process.env[SANDBOX_ENV_VAR] !== 'true') {
      return true;
    }

    const nodeEnv = process.env.NODE_ENV;

    // Allow in non-production environments
    if (nodeEnv !== 'production') {
      this.logger.warn(
        `Sandbox mode enabled in ${nodeEnv ?? 'unknown'} environment. This is for development/testing only.`
      );
      return true;
    }

    // Block in production
    this.logger.error(
      `SECURITY VIOLATION: Sandbox mode (USE_IN_MEMORY_DB) is not allowed in production environment (NODE_ENV=${nodeEnv}). ` +
        `This could lead to data loss or system instability.`
    );

    throw new ForbiddenException(
      'Sandbox mode is not allowed in production. ' +
        'Please remove USE_IN_MEMORY_DB environment variable.'
    );
  }
}

/**
 * Sandbox Production Guard Factory
 *
 * Creates a guard that throws an error if sandbox mode is enabled in production.
 * This should be used in production deployments to prevent accidental sandbox usage.
 */
export function createSandboxProductionGuard(): CanActivate {
  return new SandboxProductionGuard();
}

/**
 * Check if sandbox can be enabled in current environment
 *
 * @returns true if sandbox mode is allowed, false otherwise
 */
export function isSandboxAllowedInEnvironment(): boolean {
  // Always check current environment
  const nodeEnv = process.env.NODE_ENV;
  const sandboxEnabled = process.env[SANDBOX_ENV_VAR] === 'true';

  if (!sandboxEnabled) {
    return true; // Not sandbox mode, always allowed
  }

  // Sandbox is enabled - check environment
  return nodeEnv !== 'production';
}

/**
 * Assert that sandbox mode is allowed
 *
 * Throws an error if sandbox mode is enabled in production.
 */
export function assertSandboxAllowed(): void {
  if (!isSandboxAllowedInEnvironment()) {
    throw new ForbiddenException(
      'Sandbox mode is not allowed in production environment. ' +
        'Remove USE_IN_MEMORY_DB from your environment configuration.'
    );
  }
}
