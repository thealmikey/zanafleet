// =============================================================================
// SLA Agent - Monitors and enforces Service Level Agreements
// Triggers: Event-driven (delivery status) + Scheduled
// =============================================================================

import { Agent, AgentType, AgentTriggerType, RetryPolicy, ObservabilityConfig } from '../types';

/**
 * Default retry policy for SLA agent
 */
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  initialBackoffMs: 500,
  maxBackoffMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Observability config
 */
const DEFAULT_OBSERVABILITY: ObservabilityConfig = {
  emitExecutionEvents: true,
  emitTelemetryMetrics: true,
  logLevel: 'info',
};

/**
 * Create SLA Monitoring Agent configuration
 */
export function createSLAAgent(workspaceId: string): Agent {
  const now = new Date();

  return {
    id: `sla-agent-${workspaceId}`,
    name: 'SLA Monitoring Agent',
    type: AgentType.HYBRID,
    version: '1.0.0',
    description: 'Monitors delivery SLAs and triggers alerts on breach attempts',

    // Triggers: delivery status changes + periodic checks
    triggers: [
      {
        type: AgentTriggerType.EVENT,
        eventTypes: [
          'DeliveryCreatedEvent-V1',
          'DeliveryPickedUpEvent-V1',
          'DeliveryInTransitEvent-V1',
        ],
        debounceWindowMs: 300000, // 5 min
      },
      {
        type: AgentTriggerType.SCHEDULED,
        cronExpression: '*/5 * * * *', // Every 5 minutes
        timezone: 'UTC',
      },
    ],

    // Capabilities: query and notify
    allowedCapabilities: [
      'query-deliveries',
      'calculate-sla',
      'send-notification',
      'escalate-delivery',
    ],

    policyId: 'default',

    retryPolicy: DEFAULT_RETRY_POLICY,
    timeoutMs: 15000,

    observabilityConfig: DEFAULT_OBSERVABILITY,

    tenantScope: {
      workspaceId,
    },

    enabled: true,

    metadata: {
      slaThresholds: {
        critical: 0.9, // 90% of SLA time remaining
        warning: 0.75, // 75% of SLA time remaining
      },
      defaultSlaMinutes: 60,
      notificationChannels: ['push', 'sms'],
    },

    createdAt: now,
    updatedAt: now,
  };
}

/**
 * SLA Agent triggers
 */
export const SLA_TRIGGERS = {
  DELIVERY_CREATED: 'DeliveryCreatedEvent-V1',
  DELIVERY_PICKED_UP: 'DeliveryPickedUpEvent-V1',
  DELIVERY_IN_TRANSIT: 'DeliveryInTransitEvent-V1',
  SCHEDULED: '*/5 * * * *',
} as const;

/**
 * SLA Agent capabilities
 */
export const SLA_CAPABILITIES = {
  QUERY_DELIVERIES: 'query-deliveries',
  CALCULATE_SLA: 'calculate-sla',
  SEND_NOTIFICATION: 'send-notification',
  ESCALATE_DELIVERY: 'escalate-delivery',
} as const;
