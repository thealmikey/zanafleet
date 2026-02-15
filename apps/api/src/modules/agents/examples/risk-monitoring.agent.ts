// =============================================================================
// Risk Monitoring Agent - Monitors for risky patterns and anomalies
// Triggers: Event-driven (delivery, transaction events) + Scheduled
// =============================================================================

import {
  Agent,
  AgentType,
  AgentTriggerType,
  RetryPolicy,
  ObservabilityConfig,
} from '../types';

/**
 * Default retry policy for risk monitoring
 */
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 5,
  initialBackoffMs: 2000,
  maxBackoffMs: 60000,
  backoffMultiplier: 2,
};

/**
 * Default observability with heightened logging
 */
const DEFAULT_OBSERVABILITY: ObservabilityConfig = {
  emitExecutionEvents: true,
  emitTelemetryMetrics: true,
  logLevel: 'debug',
};

/**
 * Create Risk Monitoring Agent configuration
 */
export function createRiskMonitoringAgent(workspaceId: string): Agent {
  const now = new Date();

  return {
    id: `risk-monitoring-agent-${workspaceId}`,
    name: 'Risk Monitoring Agent',
    type: AgentType.HYBRID,
    version: '1.0.0',
    description: 'Monitors for risky patterns, anomalies, and potential fraud',

    // Triggers: high-priority events + periodic checks
    triggers: [
      {
        type: AgentTriggerType.EVENT,
        eventTypes: [
          'DeliveryCreatedEvent-V1',
          'DeliveryFailedEvent-V1',
          'TransactionStartedEvent-V1',
          'WalletCreditedEvent-V1',
        ],
        debounceWindowMs: 60000, // 1 min debounce
      },
      {
        type: AgentTriggerType.SCHEDULED,
        cronExpression: '*/15 * * * *', // Every 15 minutes
        timezone: 'UTC',
      },
    ],

    // Capabilities: can query and analyze, limited write
    allowedCapabilities: [
      'query-deliveries',
      'query-transactions',
      'query-wallets',
      'analyze-risk',
      'flag-transaction',
    ],

    // Policy: strict - requires consent for high-risk actions
    policyId: 'risk-policy',

    retryPolicy: DEFAULT_RETRY_POLICY,
    timeoutMs: 60000, // Longer timeout for analysis

    observabilityConfig: DEFAULT_OBSERVABILITY,

    tenantScope: {
      workspaceId,
    },

    enabled: true,

    metadata: {
      riskThresholds: {
        high: 0.8,
        medium: 0.5,
        low: 0.2,
      },
      monitoredPatterns: [
        'unusual_transaction_volume',
        'repeated_delivery_failures',
        'suspicious_location',
        'rapid_wallet_credits',
      ],
      autoFlagThreshold: 0.7,
    },

    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Risk Monitoring Agent triggers
 */
export const RISK_MONITORING_TRIGGERS = {
  DELIVERY_CREATED: 'DeliveryCreatedEvent-V1',
  DELIVERY_FAILED: 'DeliveryFailedEvent-V1',
  TRANSACTION_STARTED: 'TransactionStartedEvent-V1',
  WALLET_CREDITED: 'WalletCreditedEvent-V1',
  SCHEDULED: '*/15 * * * *',
} as const;

/**
 * Risk Monitoring Agent capabilities
 */
export const RISK_MONITORING_CAPABILITIES = {
  QUERY_DELIVERIES: 'query-deliveries',
  QUERY_TRANSACTIONS: 'query-transactions',
  QUERY_WALLETS: 'query-wallets',
  ANALYZE_RISK: 'analyze-risk',
  FLAG_TRANSACTION: 'flag-transaction',
} as const;
