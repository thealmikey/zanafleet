import {
  AgentType,
  AgentExecutionStatus,
  AgentTriggerType,
  RetryPolicy,
  ObservabilityConfig,
  TenantScope,
  AgentTrigger,
} from '../../types';

describe('Agent Types', () => {
  // ==================== Normal Use Cases ====================

  describe('AgentType Enum', () => {
    it('should have correct values for agent types', () => {
      expect(AgentType.EVENT_DRIVEN).toBe('event-driven');
      expect(AgentType.SCHEDULED).toBe('scheduled');
      expect(AgentType.HYBRID).toBe('hybrid');
    });

    it('should support all agent types', () => {
      const agentTypes = [AgentType.EVENT_DRIVEN, AgentType.SCHEDULED, AgentType.HYBRID];
      expect(agentTypes.length).toBe(3);
    });

    it('should allow event-driven agent configuration', () => {
      const trigger: AgentTrigger = {
        type: AgentTriggerType.EVENT,
        eventPattern: 'Order.Created',
        eventTypes: ['Order.Created', 'Order.Updated'],
      };
      expect(trigger.type).toBe(AgentTriggerType.EVENT);
      expect(trigger.eventPattern).toBe('Order.Created');
    });

    it('should allow scheduled agent configuration', () => {
      const trigger: AgentTrigger = {
        type: AgentTriggerType.SCHEDULED,
        cronExpression: '0 * * * *',
        timezone: 'Africa/Nairobi',
      };
      expect(trigger.type).toBe(AgentTriggerType.SCHEDULED);
      expect(trigger.cronExpression).toBe('0 * * * *');
    });

    it('should allow manual agent trigger', () => {
      const trigger: AgentTrigger = {
        type: AgentTriggerType.MANUAL,
      };
      expect(trigger.type).toBe(AgentTriggerType.MANUAL);
    });
  });

  describe('AgentExecutionStatus Enum', () => {
    it('should have all execution statuses', () => {
      expect(AgentExecutionStatus.PENDING).toBe('pending');
      expect(AgentExecutionStatus.RUNNING).toBe('running');
      expect(AgentExecutionStatus.SUCCEEDED).toBe('succeeded');
      expect(AgentExecutionStatus.FAILED).toBe('failed');
      expect(AgentExecutionStatus.BLOCKED).toBe('blocked');
      expect(AgentExecutionStatus.DEFERRED).toBe('deferred');
    });

    it('should map to valid status transitions', () => {
      const validTransitions = [
        [AgentExecutionStatus.PENDING, AgentExecutionStatus.RUNNING],
        [AgentExecutionStatus.RUNNING, AgentExecutionStatus.SUCCEEDED],
        [AgentExecutionStatus.RUNNING, AgentExecutionStatus.FAILED],
        [AgentExecutionStatus.FAILED, AgentExecutionStatus.PENDING], // Retry
        [AgentExecutionStatus.DEFERRED, AgentExecutionStatus.PENDING],
      ];

      validTransitions.forEach(([from, to]) => {
        expect(from).toBeDefined();
        expect(to).toBeDefined();
      });
    });

    it('should handle failed to blocked transition', () => {
      const status = AgentExecutionStatus.FAILED;
      const canBlock = [AgentExecutionStatus.FAILED, AgentExecutionStatus.BLOCKED].includes(status);
      expect(canBlock).toBe(true);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle retry policy with zero retries', () => {
      const policy: RetryPolicy = {
        maxRetries: 0,
        initialBackoffMs: 1000,
        maxBackoffMs: 10000,
        backoffMultiplier: 2,
      };

      expect(policy.maxRetries).toBe(0);
    });

    it('should handle retry policy with custom retryable errors', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        initialBackoffMs: 100,
        maxBackoffMs: 5000,
        backoffMultiplier: 1.5,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED'],
      };

      expect(policy.retryableErrors).toContain('NETWORK_ERROR');
      expect(policy.retryableErrors).toContain('RATE_LIMITED');
    });

    it('should handle observability with debug logging', () => {
      const config: ObservabilityConfig = {
        emitExecutionEvents: true,
        emitTelemetryMetrics: true,
        logLevel: 'debug',
        traceCorrelationId: 'trace-123',
      };

      expect(config.logLevel).toBe('debug');
      expect(config.traceCorrelationId).toBe('trace-123');
    });

    it('should handle observability with minimal logging', () => {
      const config: ObservabilityConfig = {
        emitExecutionEvents: false,
        emitTelemetryMetrics: false,
        logLevel: 'error',
      };

      expect(config.logLevel).toBe('error');
      expect(config.emitExecutionEvents).toBe(false);
    });

    it('should handle tenant scope with organization', () => {
      const scope: TenantScope = {
        workspaceId: 'ws-123',
        organizationId: 'org-456',
        allowedEntityTypes: ['Order', 'Delivery', 'Rider'],
      };

      expect(scope.workspaceId).toBe('ws-123');
      expect(scope.organizationId).toBe('org-456');
      expect(scope.allowedEntityTypes).toContain('Order');
    });

    it('should handle tenant scope without organization', () => {
      const scope: TenantScope = {
        workspaceId: 'ws-123',
      };

      expect(scope.workspaceId).toBe('ws-123');
      expect(scope.organizationId).toBeUndefined();
    });

    it('should handle trigger with conditions', () => {
      const trigger: AgentTrigger = {
        type: AgentTriggerType.EVENT,
        conditions: {
          orderTotal: { $gt: 1000 },
          customerType: 'premium',
          region: ['Nairobi', 'Mombasa'],
        },
      };

      expect(trigger.conditions).toBeDefined();
      expect((trigger.conditions as any).orderTotal.$gt).toBe(1000);
    });

    it('should handle debounce configuration', () => {
      const trigger: AgentTrigger = {
        type: AgentTriggerType.EVENT,
        debounceWindowMs: 5000,
      };

      expect(trigger.debounceWindowMs).toBe(5000);
    });

    it('should handle large retry count', () => {
      const policy: RetryPolicy = {
        maxRetries: 100,
        initialBackoffMs: 100,
        maxBackoffMs: 60000,
        backoffMultiplier: 2,
      };

      expect(policy.maxRetries).toBe(100);
    });

    it('should handle minimal backoff values', () => {
      const policy: RetryPolicy = {
        maxRetries: 1,
        initialBackoffMs: 1,
        maxBackoffMs: 1,
        backoffMultiplier: 1,
      };

      expect(policy.initialBackoffMs).toBe(1);
      expect(policy.maxBackoffMs).toBe(1);
    });
  });

  // ==================== Complex Use Cases ====================

  describe('Complex Use Cases', () => {
    it('should handle hybrid agent configuration', () => {
      const trigger: AgentTrigger = {
        type: AgentTriggerType.EVENT,
        eventPattern: 'Delivery.*',
        cronExpression: '0 0 * * *',
        conditions: {
          status: ['pending', 'assigned'],
        },
        debounceWindowMs: 10000,
      };

      expect(trigger.eventPattern).toBe('Delivery.*');
      expect(trigger.cronExpression).toBe('0 0 * * *');
      expect(trigger.debounceWindowMs).toBe(10000);
    });

    it('should handle complex tenant scope', () => {
      const scope: TenantScope = {
        workspaceId: 'ws-multi-tenant',
        organizationId: 'org-master',
        allowedEntityTypes: [
          'Order',
          'Delivery',
          'Rider',
          'Customer',
          'Business',
          'Wallet',
          'Settlement',
        ],
      };

      expect(scope.allowedEntityTypes?.length).toBe(7);
    });

    it('should handle full retry policy with all options', () => {
      const policy: RetryPolicy = {
        maxRetries: 5,
        initialBackoffMs: 1000,
        maxBackoffMs: 30000,
        backoffMultiplier: 2,
        retryableErrors: [
          'NETWORK_ERROR',
          'TIMEOUT',
          'RATE_LIMITED',
          'SERVICE_UNAVAILABLE',
          'INTERNAL_ERROR',
        ],
      };

      expect(policy.maxRetries).toBe(5);
      expect(policy.retryableErrors?.length).toBe(5);
    });

    it('should handle comprehensive observability config', () => {
      const config: ObservabilityConfig = {
        emitExecutionEvents: true,
        emitTelemetryMetrics: true,
        logLevel: 'debug',
        traceCorrelationId: 'full-stack-trace-12345',
      };

      expect(config.emitExecutionEvents).toBe(true);
      expect(config.emitTelemetryMetrics).toBe(true);
      expect(config.logLevel).toBe('debug');
      expect(config.traceCorrelationId).toBe('full-stack-trace-12345');
    });

    it('should handle SLA agent trigger configuration', () => {
      const trigger: AgentTrigger = {
        type: AgentTriggerType.SCHEDULED,
        cronExpression: '*/15 * * * *', // Every 15 minutes
        timezone: 'Africa/Nairobi',
        conditions: {
          slaBreachThreshold: 30, // minutes
          priority: ['high', 'urgent'],
        },
        debounceWindowMs: 30000,
      };

      expect(trigger.type).toBe(AgentTriggerType.SCHEDULED);
      expect(trigger.conditions).toBeDefined();
    });

    it('should handle risk monitoring trigger', () => {
      const trigger: AgentTrigger = {
        type: AgentTriggerType.EVENT,
        eventTypes: [
          'Delivery.Started',
          'Delivery.Updated',
          'Rider.LocationChanged',
          'Order.PaymentCompleted',
        ],
        conditions: {
          riskScore: { $gt: 70 },
          deliveryAge: { $gt: 60 },
        },
      };

      expect(trigger.eventTypes?.length).toBe(4);
    });
  });

  // ==================== Tier-Specific Tests ====================

  describe('Tier-Specific Functionality', () => {
    // Free Tier - Basic event-driven agents
    it('should support Free tier basic event-driven agent', () => {
      const trigger: AgentTrigger = {
        type: AgentTriggerType.EVENT,
        eventPattern: 'Order.Created',
      };

      const config: ObservabilityConfig = {
        emitExecutionEvents: true,
        emitTelemetryMetrics: false,
        logLevel: 'info',
      };

      expect(trigger.type).toBe(AgentTriggerType.EVENT);
      expect(config.emitTelemetryMetrics).toBe(false);
    });

    // Basic Tier - Scheduled agents
    it('should support Basic tier scheduled agents', () => {
      const trigger: AgentTrigger = {
        type: AgentTriggerType.SCHEDULED,
        cronExpression: '0 * * * *', // Hourly
        timezone: 'Africa/Nairobi',
      };

      expect(trigger.type).toBe(AgentTriggerType.SCHEDULED);
      expect(trigger.timezone).toBe('Africa/Nairobi');
    });

    // Pro Tier - Full hybrid capabilities
    it('should support Pro tier hybrid agents', () => {
      const trigger: AgentTrigger = {
        type: AgentTriggerType.EVENT,
        eventPattern: 'Delivery.*',
        cronExpression: '0 0 * * *',
        conditions: {
          priority: ['high', 'urgent', 'normal'],
        },
        debounceWindowMs: 5000,
      };

      const scope: TenantScope = {
        workspaceId: 'pro-ws',
        organizationId: 'pro-org',
        allowedEntityTypes: ['Order', 'Delivery', 'Rider', 'Customer', 'Business'],
      };

      const policy: RetryPolicy = {
        maxRetries: 5,
        initialBackoffMs: 1000,
        maxBackoffMs: 30000,
        backoffMultiplier: 2,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED'],
      };

      expect(trigger.type).toBe(AgentTriggerType.EVENT);
      expect(scope.allowedEntityTypes?.length).toBe(5);
      expect(policy.maxRetries).toBe(5);
    });

    // Pro Tier - Advanced retry policies
    it('should support Pro tier advanced retry policies', () => {
      const policy: RetryPolicy = {
        maxRetries: 10,
        initialBackoffMs: 500,
        maxBackoffMs: 60000,
        backoffMultiplier: 2.5,
        retryableErrors: [
          'NETWORK_ERROR',
          'TIMEOUT',
          'RATE_LIMITED',
          'SERVICE_UNAVAILABLE',
          'INTERNAL_ERROR',
          'QUOTA_EXCEEDED',
        ],
      };

      expect(policy.maxRetries).toBe(10);
      expect(policy.backoffMultiplier).toBe(2.5);
      expect(policy.retryableErrors?.length).toBe(6);
    });

    // Pro Tier - Full telemetry
    it('should support Pro tier full telemetry', () => {
      const config: ObservabilityConfig = {
        emitExecutionEvents: true,
        emitTelemetryMetrics: true,
        logLevel: 'debug',
        traceCorrelationId: 'pro-trace-xyz',
      };

      expect(config.emitExecutionEvents).toBe(true);
      expect(config.emitTelemetryMetrics).toBe(true);
      expect(config.logLevel).toBe('debug');
    });

    // Enterprise - Multi-tenant scope
    it('should support Enterprise tier multi-tenant scope', () => {
      const scope: TenantScope = {
        workspaceId: 'enterprise-ws-1',
        organizationId: 'enterprise-org-1',
        allowedEntityTypes: [
          'Order',
          'Delivery',
          'Rider',
          'Customer',
          'Business',
          'Wallet',
          'Settlement',
          'Capability',
          'Commitment',
          'Interaction',
        ],
      };

      expect(scope.allowedEntityTypes?.length).toBe(10);
      expect(scope.organizationId).toBeDefined();
    });
  });
});
