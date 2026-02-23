export const THROTTLER_MODULE_OPTIONS = 'THROTTLER_MODULE_OPTIONS';

export interface ThrottlerModuleOptions {
  /**
   * Redis URL for distributed rate limiting
   */
  redisUrl?: string;

  /**
   * Key prefix for Redis throttler keys
   */
  keyPrefix?: string;

  /**
   * Whether to skip rate limiting in sandbox mode
   */
  skipInSandbox?: boolean;
}

export const DEFAULT_THROTTLER_OPTIONS: ThrottlerModuleOptions = {
  keyPrefix: 'throttler',
  skipInSandbox: true,
};
