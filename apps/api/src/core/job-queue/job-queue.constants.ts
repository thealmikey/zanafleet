// =============================================================================
// Job Queue Constants - BullMQ Configuration
// =============================================================================

/**
 * Default retry configuration for jobs
 */
export const JOB_QUEUE_DEFAULTS = {
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 1000,
  MAX_BACKOFF_MS: 30000,
  BACKOFF_MULTIPLIER: 2,
  TIMEOUT_MS: 60000,
  CLEANUP_AGE_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

/**
 * Queue names used throughout the application
 */
export const QUEUE_NAMES = {
  DEFAULT: 'zanafleet-default',
  WEBHOOK: 'zanafleet-webhook',
  SETTLEMENT: 'zanafleet-settlement',
  AGENT: 'zanafleet-agent',
  NOTIFICATION: 'zanafleet-notification',
} as const;

/**
 * Dead letter queue configuration
 */
export const DLQ_CONFIG = {
  MAX_LENGTH: 10000,
  AGE_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

/**
 * Distributed lock configuration for cron jobs
 */
export const LOCK_CONFIG = {
  DEFAULT_TTL_MS: 300000, // 5 minutes
  RENEWAL_INTERVAL_MS: 60000, // 1 minute
} as const;

/**
 * Rate limiter configuration
 */
export const RATE_LIMIT_CONFIG = {
  MAX_JOBS_PER_WORKER: 10,
  DURATION_MS: 1000,
} as const;

/**
 * Job priorities
 */
export const enum JobPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}
