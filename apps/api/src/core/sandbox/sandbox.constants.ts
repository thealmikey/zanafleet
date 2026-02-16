/**
 * Sandbox Constants
 *
 * Constants used by the sandbox infrastructure.
 */

import { SandboxOptions } from './sandbox.types';

/**
 * Token for sandbox options injection
 */
export const SANDBOX_OPTIONS = 'SANDBOX_OPTIONS';

/**
 * Token for in-memory store factory injection
 */
export const IN_MEMORY_STORE_FACTORY = 'IN_MEMORY_STORE_FACTORY';

/**
 * Environment variable that enables sandbox mode
 */
export const SANDBOX_ENV_VAR = 'USE_IN_MEMORY_DB';

/**
 * Default scenario to load if none specified
 */
export const DEFAULT_SCENARIO = 'minimal';

/**
 * Available scenario names
 */
export enum SandboxScenario {
  MINIMAL = 'minimal',
  CONCERT = 'concert',
  FULL = 'full',
}

/**
 * Token for stub event bus
 */
export const STUB_EVENT_BUS = 'STUB_EVENT_BUS';

/**
 * Token for stub AI provider
 */
export const STUB_AI_PROVIDER = 'STUB_AI_PROVIDER';

/**
 * Sandbox module options
 */
export interface SandboxModuleOptions {
  /**
   * Enable sandbox mode
   */
  enabled: boolean;

  /**
   * Sandbox options
   */
  options?: SandboxOptions;
}
