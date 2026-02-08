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
    DELETED_V1: 'organization.events.deleted-v1',
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
  SignUp: {
    INITIATED_V1: 'signup.events.initiated-v1',
    STEP_COMPLETED_V1: 'signup.events.step-completed-v1',
    FINALIZED_V1: 'signup.events.finalized-v1',
    ALL: 'signup.events.*',
  },
  Notification: {
    SENT_V1: 'notification.events.sent-v1',
    FAILED_V1: 'notification.events.failed-v1',
    SKIPPED_V1: 'notification.events.skipped-v1',
    ALL: 'notification.events.*',
  },
  Order: {
    CREATED_V1: 'order.events.created-v1',
    ALL: 'order.events.*',
  },
  Delivery: {
    SCHEDULED_V1: 'delivery.events.scheduled-v1',
    ASSIGNED_V1: 'delivery.events.assigned-v1',
    PICKED_UP_V1: 'delivery.events.picked-up-v1',
    IN_TRANSIT_V1: 'delivery.events.in-transit-v1',
    DELIVERED_V1: 'delivery.events.delivered-v1',
    CANCELLED_V1: 'delivery.events.cancelled-v1',
    FAILED_V1: 'delivery.events.failed-v1',
    ALL: 'delivery.events.*',
  },
  Location: {
    /** Inbound telemetry from rider mobile apps */
    RIDER_TELEMETRY_V1: 'location.rider.telemetry',
    /** Outbound event when rider location is updated */
    RIDER_LOCATION_UPDATED_V1: 'location.events.rider-location-updated-v1',
    ALL: 'location.events.*',
  },
  Policy: {
    EVALUATED_V1: 'policy.events.evaluated-v1',
    VIOLATION_DETECTED_V1: 'policy.events.violation-detected-v1',
    ALL: 'policy.events.*',
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
