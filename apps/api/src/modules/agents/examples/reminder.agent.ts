// =============================================================================
// Reminder Agent - Sends reminders for pending tasks, appointments, etc.
// Triggers: Event-driven (on commitment created/updated) + Scheduled
// =============================================================================

import {
  Agent,
  AgentType,
  AgentTriggerType,
  RetryPolicy,
  ObservabilityConfig,
} from '../types';

/**
 * Default retry policy for reminder agent
 */
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialBackoffMs: 1000,
  maxBackoffMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Default observability config
 */
const DEFAULT_OBSERVABILITY: ObservabilityConfig = {
  emitExecutionEvents: true,
  emitTelemetryMetrics: true,
  logLevel: 'info',
};

/**
 * Create Reminder Agent configuration
 */
export function createReminderAgent(workspaceId: string): Agent {
  const now = new Date();

  return {
    id: `reminder-agent-${workspaceId}`,
    name: 'Reminder Agent',
    type: AgentType.HYBRID,
    version: '1.0.0',
    description: 'Sends reminders for pending tasks and appointments',

    // Triggers: event-driven + scheduled
    triggers: [
      {
        type: AgentTriggerType.EVENT,
        eventTypes: ['CommitmentCreatedEvent-V1', 'CommitmentStatusChangedEvent-V1'],
        debounceWindowMs: 300000, // 5 min debounce
      },
      {
        type: AgentTriggerType.SCHEDULED,
        cronExpression: '0 * * * *', // Every hour
        timezone: 'UTC',
      },
    ],

    // Capabilities: can only send notifications
    allowedCapabilities: ['send-notification', 'query-commitments'],

    // Policy: low risk, automatic execution allowed
    policyId: 'default',

    // Retry and timeout
    retryPolicy: DEFAULT_RETRY_POLICY,
    timeoutMs: 30000,

    // Observability
    observabilityConfig: DEFAULT_OBSERVABILITY,

    // Tenant scope
    tenantScope: {
      workspaceId,
    },

    // Settings
    debounceWindowMs: 300000,
    enabled: true,

    // Metadata
    metadata: {
      reminderTypes: ['appointment', 'payment', 'follow-up', 'task-due'],
      maxRemindersPerDay: 10,
      quietHours: {
        start: '22:00',
        end: '07:00',
      },
    },

    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Reminder Agent triggers
 */
export const REMINDER_TRIGGERS = {
  COMMITMENT_CREATED: 'CommitmentCreatedEvent-V1',
  COMMITMENT_UPDATED: 'CommitmentStatusChangedEvent-V1',
  SCHEDULED: '0 * * * *',
} as const;

/**
 * Reminder Agent capabilities
 */
export const REMINDER_CAPABILITIES = {
  SEND_NOTIFICATION: 'send-notification',
  QUERY_COMMITMENTS: 'query-commitments',
} as const;
