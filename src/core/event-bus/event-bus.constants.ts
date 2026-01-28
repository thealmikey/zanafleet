/**
 * NATS Event Bus Constants
 *
 * Defines subject patterns and configuration constants for the NATS event bus.
 * Subject naming convention: <module>.events.<action>-v<version>
 */

/**
 * NATS client injection token
 */
export const NATS_CLIENT = 'NATS_CLIENT';

/**
 * Default NATS connection URL
 */
export const DEFAULT_NATS_URL = 'nats://localhost:4222';

/**
 * NATS subject patterns for different modules
 */
export const NatsSubjects = {
  Organization: {
    CREATED_V1: 'organization.events.created-v1',
    UPDATED_V1: 'organization.events.updated-v1',
    ALL: 'organization.events.*',
  },
  Workspace: {
    CREATED_V1: 'workspace.events.created-v1',
    UPDATED_V1: 'workspace.events.updated-v1',
    ALL: 'workspace.events.*',
  },
  Actor: {
    ONBOARDED_V1: 'actor.events.onboarded-v1',
    UPDATED_V1: 'actor.events.updated-v1',
    ALL: 'actor.events.*',
  },
  Wallet: {
    CREATED_V1: 'wallet.events.created-v1',
    CREDITED_V1: 'wallet.events.credited-v1',
    DEBITED_V1: 'wallet.events.debited-v1',
    ALL: 'wallet.events.*',
  },
  Transaction: {
    CREATED_V1: 'transaction.events.created-v1',
    COMPLETED_V1: 'transaction.events.completed-v1',
    FAILED_V1: 'transaction.events.failed-v1',
    ALL: 'transaction.events.*',
  },
  Role: {
    CREATED_V1: 'role.events.created-v1',
    UPDATED_V1: 'role.events.updated-v1',
    ALL: 'role.events.*',
  },
  Capability: {
    CREATED_V1: 'capability.events.created-v1',
    GRANTED_TO_PERSONA_V1: 'capability.events.granted-to-persona-v1',
    ALL: 'capability.events.*',
  },
  Formation: {
    STATUS_CHANGED_V1: 'formation.events.status-changed-v1',
    REQUIREMENT_CREATED_V1: 'formation.events.requirement-created-v1',
    REQUIREMENT_SATISFIED_V1: 'formation.events.requirement-satisfied-v1',
    ALL: 'formation.events.*',
  },
} as const;

/**
 * Wildcard subject to subscribe to all events
 */
export const ALL_EVENTS_SUBJECT = '*.events.*';

/**
 * Retry configuration defaults
 */
export const RetryDefaults = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 1000,
  MULTIPLIER: 2,
} as const;

/**
 * Idempotency configuration defaults
 */
export const IdempotencyDefaults = {
  TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
  CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Builds a NATS subject from event type
 * Example: 'OrganizationCreatedEvent-V1' -> 'organization.events.created-v1'
 */
export function buildSubjectFromEventType(eventType: string): string {
  const match = eventType.match(/^(\w+?)([A-Z][a-z]+)Event-V(\d+)$/);
  if (!match) {
    return `unknown.events.${eventType.toLowerCase()}`;
  }

  const [, aggregate, action, version] = match;
  return `${aggregate.toLowerCase()}.events.${action.toLowerCase()}-v${version}`;
}
