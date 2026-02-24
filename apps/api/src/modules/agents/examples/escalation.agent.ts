// =============================================================================
// Escalation Agent - Handles escalation workflows for unresolved issues
// Triggers: Event-driven (escalation requests) + Scheduled (stale escalations)
// =============================================================================

import { Agent, AgentType, AgentTriggerType, RetryPolicy, ObservabilityConfig } from '../types';

/**
 * Default retry policy for escalation agent
 */
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialBackoffMs: 2000,
  maxBackoffMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Observability config - critical agent needs detailed tracking
 */
const DEFAULT_OBSERVABILITY: ObservabilityConfig = {
  emitExecutionEvents: true,
  emitTelemetryMetrics: true,
  logLevel: 'info',
};

/**
 * Create Escalation Agent configuration
 */
export function createEscalationAgent(workspaceId: string): Agent {
  const now = new Date();

  return {
    id: `escalation-agent-${workspaceId}`,
    name: 'Escalation Agent',
    type: AgentType.HYBRID,
    version: '1.0.0',
    description: 'Handles escalation workflows for unresolved issues and stale items',

    // Triggers: explicit escalation events + stale check
    triggers: [
      {
        type: AgentTriggerType.EVENT,
        eventTypes: [
          'DeliveryFailedEvent-V1',
          'CommitmentBreachedEvent-V1',
          'AgentEscalationRequestedEvent-V1',
        ],
        debounceWindowMs: 0, // No debounce - process immediately
      },
      {
        type: AgentTriggerType.SCHEDULED,
        cronExpression: '*/10 * * * *', // Every 10 minutes - check stale escalations
        timezone: 'UTC',
      },
    ],

    // Capabilities: query, notify, assign, escalate
    allowedCapabilities: [
      'query-deliveries',
      'query-commitments',
      'send-notification',
      'assign-rider',
      'escalate-delivery',
      'create-support-ticket',
    ],

    // Policy: strict - always requires explicit approval for escalation
    policyId: 'escalation-policy',

    retryPolicy: DEFAULT_RETRY_POLICY,
    timeoutMs: 45000,

    observabilityConfig: DEFAULT_OBSERVABILITY,

    tenantScope: {
      workspaceId,
    },

    enabled: true,

    metadata: {
      escalationLevels: [
        { level: 1, timeoutMinutes: 15, notify: ['supervisor'] },
        { level: 2, timeoutMinutes: 30, notify: ['manager'] },
        { level: 3, timeoutMinutes: 60, notify: ['director', 'external'] },
      ],
      staleThresholdMinutes: 30,
      autoEscalateOnBreach: true,
    },

    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Escalation Agent triggers
 */
export const ESCALATION_TRIGGERS = {
  DELIVERY_FAILED: 'DeliveryFailedEvent-V1',
  COMMITMENT_BREACHED: 'CommitmentBreachedEvent-V1',
  ESCALATION_REQUESTED: 'AgentEscalationRequestedEvent-V1',
  SCHEDULED: '*/10 * * * *',
} as const;

/**
 * Escalation Agent capabilities
 */
export const ESCALATION_CAPABILITIES = {
  QUERY_DELIVERIES: 'query-deliveries',
  QUERY_COMMITMENTS: 'query-commitments',
  SEND_NOTIFICATION: 'send-notification',
  ASSIGN_RIDER: 'assign-rider',
  ESCALATE_DELIVERY: 'escalate-delivery',
  CREATE_SUPPORT_TICKET: 'create-support-ticket',
} as const;
