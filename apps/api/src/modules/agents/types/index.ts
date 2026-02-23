// =============================================================================
// Agent & Background Execution Runtime - Core Types
// Following ZanaFleet event-driven patterns with Command → Event → Handler → Projection
// =============================================================================

/**
 * Agent Type - defines how the agent is triggered
 */
export enum AgentType {
  EVENT_DRIVEN = 'event-driven',
  SCHEDULED = 'scheduled',
  HYBRID = 'hybrid',
}

/**
 * Agent Execution Status
 */
export enum AgentExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  DEFERRED = 'deferred',
}

/**
 * Agent Trigger Type
 */
export enum AgentTriggerType {
  EVENT = 'event',
  SCHEDULED = 'scheduled',
  MANUAL = 'manual',
}

/**
 * Retry Policy for agent execution failures
 */
export interface RetryPolicy {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

/**
 * Observability Configuration
 */
export interface ObservabilityConfig {
  emitExecutionEvents: boolean;
  emitTelemetryMetrics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  traceCorrelationId?: string;
}

/**
 * Tenant Scope - multi-tenant isolation
 */
export interface TenantScope {
  workspaceId: string;
  organizationId?: string;
  allowedEntityTypes?: string[];
}

/**
 * Agent Trigger - defines what activates the agent
 */
export interface AgentTrigger {
  type: AgentTriggerType;
  // Event-driven triggers
  eventPattern?: string;
  eventTypes?: string[];
  // Scheduled triggers
  cronExpression?: string;
  timezone?: string;
  // Conditional triggers
  conditions?: Record<string, unknown>;
  // Debounce configuration
  debounceWindowMs?: number;
}

/**
 * Agent - the complete agent configuration
 */
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  version: string;
  description?: string;
  // Trigger configuration
  triggers: AgentTrigger[];
  // Capability binding - agents can ONLY use these capabilities
  allowedCapabilities: string[];
  // Policy binding
  policyId: string;
  // Execution configuration
  retryPolicy: RetryPolicy;
  timeoutMs?: number;
  // Observability
  observabilityConfig: ObservabilityConfig;
  // Tenant scope
  tenantScope: TenantScope;
  // Agent-specific settings
  debounceWindowMs?: number;
  enabled: boolean;
  // Metadata
  metadata?: Record<string, unknown>;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AgentContext - execution context passed to agents
 */
export interface AgentContext {
  agentId: string;
  agentName: string;
  triggerType: AgentTriggerType;
  triggerEventId?: string;
  workspaceId: string;
  organizationId?: string;
  actorId: string;
  actorType?: string;
  correlationId: string;
  causationId?: string;
  payload: Record<string, unknown>;
  executionId: string;
  idempotencyKey: string;
  timestamp: Date;
}

/**
 * AgentDecision - result of agent decision
 */
export interface AgentDecision {
  decision: PolicyDecision;
  reason: string;
  policyId: string;
  riskScore?: number;
  confidenceScore?: number;
  requiresConsent: boolean;
  consentRequestId?: string;
}

/**
 * Policy Decision - result of policy engine evaluation
 */
export enum PolicyDecision {
  EXECUTE = 'execute',
  SUGGEST = 'suggest',
  REQUIRE_CONSENT = 'require_consent',
  BLOCK = 'block',
  ESCALATE = 'escalate',
}

/**
 * AutomationPolicy - policy configuration for agent execution
 */
export interface AutomationPolicy {
  id: string;
  name: string;
  version: string;
  // Policy thresholds
  confidenceThreshold: number;
  maxRiskScore: number;
  cooldownWindowMs: number;
  // Allowed capabilities for this policy
  allowedCapabilities: string[];
  // Fallback behavior
  failOpen: boolean;
  // Metadata
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AgentExecutionResult - result of agent execution
 */
export interface AgentExecutionResult {
  executionId: string;
  agentId: string;
  status: AgentExecutionStatus;
  decision: AgentDecision;
  result?: unknown;
  error?: string;
  executionTimeMs: number;
  telemetry: AgentTelemetryEvent[];
}

/**
 * AgentTelemetryEvent - telemetry event emitted by agents
 */
export interface AgentTelemetryEvent {
  eventType: AgentTelemetryEventType;
  executionId: string;
  agentId: string;
  agentName: string;
  timestamp: Date;
  correlationId: string;
  payload: Record<string, unknown>;
}

export enum AgentTelemetryEventType {
  TRIGGERED = 'triggered',
  DECISION_MADE = 'decision_made',
  EXECUTION_STARTED = 'execution_started',
  EXECUTION_SUCCEEDED = 'execution_succeeded',
  EXECUTION_FAILED = 'execution_failed',
  BLOCKED = 'blocked',
  CONSENT_REQUESTED = 'consent_requested',
}

/**
 * ConsentRequest - request for user consent
 */
export interface ConsentRequest {
  id: string;
  executionId: string;
  agentId: string;
  agentName: string;
  capabilityName: string;
  workspaceId: string;
  actorId: string;
  reason: string;
  payload: Record<string, unknown>;
  status: ConsentRequestStatus;
  expiresAt: Date;
  createdAt: Date;
  resolvedAt?: Date;
}

export enum ConsentRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  EXPIRED = 'expired',
}

/**
 * DeadLetterMessage - message that failed all retries
 */
export interface DeadLetterMessage {
  id: string;
  originalJobId: string;
  agentId: string;
  context: AgentContext;
  error: string;
  retryCount: number;
  lastAttemptAt: Date;
  deadLetteredAt: Date;
  payload: Record<string, unknown>;
}

/**
 * BackgroundJob - background job definition
 * Multi-tenant aware with workspaceId and organizationId
 */
export interface BackgroundJob {
  id: string;
  name: string;
  agentId: string;
  payload: Record<string, unknown>;
  correlationId: string;
  idempotencyKey: string;
  retryPolicy: RetryPolicy;
  priority?: number;
  scheduledAt?: Date;
  createdAt: Date;
  // Multi-tenant scoping
  workspaceId: string;
  organizationId?: string;
}

/**
 * AI Result - result from AI analysis (advisory only)
 */
export interface AIResult {
  confidence: number;
  riskScore: number;
  explanation: string;
  metadata: Record<string, unknown>;
  suggestedActions?: string[];
}
