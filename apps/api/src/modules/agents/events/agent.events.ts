// =============================================================================
// Agent Events - Following ZanaFleet naming convention: <Entity><Action>Event-V<Number>
// =============================================================================

import { BaseEvent } from '../../../core/event-bus/interfaces/base-event.interface';
import { AgentExecutionStatus, AgentTriggerType, PolicyDecision } from '../types';

/**
 * AgentTriggeredEventV1 - emitted when an agent is triggered
 */
export class AgentTriggeredEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'AgentTriggeredEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Agent' as const;

  readonly agentId: string;
  readonly agentName: string;
  readonly triggerType: AgentTriggerType;
  readonly triggerEventId?: string;
  readonly workspaceId: string;
  readonly organizationId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly idempotencyKey: string;
  readonly payload: Record<string, unknown>;

  constructor(data: {
    eventId: string;
    agentId: string;
    agentName: string;
    triggerType: AgentTriggerType;
    triggerEventId?: string;
    workspaceId: string;
    organizationId?: string;
    correlationId?: string;
    causationId?: string;
    idempotencyKey: string;
    payload?: Record<string, unknown>;
    occurredAt?: Date;
  }) {
    this.eventId = data.eventId;
    this.agentId = data.agentId;
    this.agentName = data.agentName;
    this.triggerType = data.triggerType;
    this.triggerEventId = data.triggerEventId;
    this.workspaceId = data.workspaceId;
    this.organizationId = data.organizationId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
    this.idempotencyKey = data.idempotencyKey;
    this.payload = data.payload ?? {};
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.agentId;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      agentId: this.agentId,
      agentName: this.agentName,
      triggerType: this.triggerType,
      triggerEventId: this.triggerEventId,
      workspaceId: this.workspaceId,
      organizationId: this.organizationId,
      correlationId: this.correlationId,
      causationId: this.causationId,
      idempotencyKey: this.idempotencyKey,
      payload: this.payload,
    };
  }
}

/**
 * AgentDecisionMadeEventV1 - emitted after policy decision
 */
export class AgentDecisionMadeEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'AgentDecisionMadeEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Agent' as const;

  readonly agentId: string;
  readonly executionId: string;
  readonly decision: PolicyDecision;
  readonly reason: string;
  readonly policyId: string;
  readonly riskScore?: number;
  readonly confidenceScore?: number;
  readonly requiresConsent: boolean;
  readonly workspaceId: string;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    agentId: string;
    executionId: string;
    decision: PolicyDecision;
    reason: string;
    policyId: string;
    riskScore?: number;
    confidenceScore?: number;
    requiresConsent: boolean;
    workspaceId: string;
    correlationId?: string;
    causationId?: string;
    occurredAt?: Date;
  }) {
    this.eventId = data.eventId;
    this.agentId = data.agentId;
    this.executionId = data.executionId;
    this.decision = data.decision;
    this.reason = data.reason;
    this.policyId = data.policyId;
    this.riskScore = data.riskScore;
    this.confidenceScore = data.confidenceScore;
    this.requiresConsent = data.requiresConsent;
    this.workspaceId = data.workspaceId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.executionId;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      agentId: this.agentId,
      executionId: this.executionId,
      decision: this.decision,
      reason: this.reason,
      policyId: this.policyId,
      riskScore: this.riskScore,
      confidenceScore: this.confidenceScore,
      requiresConsent: this.requiresConsent,
      workspaceId: this.workspaceId,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }
}

/**
 * AgentExecutionStartedEventV1 - emitted when agent execution begins
 */
export class AgentExecutionStartedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'AgentExecutionStartedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'AgentExecution' as const;

  readonly agentId: string;
  readonly executionId: string;
  readonly workspaceId: string;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    agentId: string;
    executionId: string;
    workspaceId: string;
    correlationId?: string;
    causationId?: string;
    occurredAt?: Date;
  }) {
    this.eventId = data.eventId;
    this.agentId = data.agentId;
    this.executionId = data.executionId;
    this.workspaceId = data.workspaceId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.executionId;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      agentId: this.agentId,
      executionId: this.executionId,
      workspaceId: this.workspaceId,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }
}

/**
 * AgentExecutionCompletedEventV1 - emitted when agent execution completes
 */
export class AgentExecutionCompletedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'AgentExecutionCompletedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'AgentExecution' as const;

  readonly agentId: string;
  readonly executionId: string;
  readonly status: AgentExecutionStatus;
  readonly result?: unknown;
  readonly error?: string;
  readonly executionTimeMs: number;
  readonly workspaceId: string;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    agentId: string;
    executionId: string;
    status: AgentExecutionStatus;
    result?: unknown;
    error?: string;
    executionTimeMs: number;
    workspaceId: string;
    correlationId?: string;
    causationId?: string;
    occurredAt?: Date;
  }) {
    this.eventId = data.eventId;
    this.agentId = data.agentId;
    this.executionId = data.executionId;
    this.status = data.status;
    this.result = data.result;
    this.error = data.error;
    this.executionTimeMs = data.executionTimeMs;
    this.workspaceId = data.workspaceId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.executionId;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      agentId: this.agentId,
      executionId: this.executionId,
      status: this.status,
      result: this.result,
      error: this.error,
      executionTimeMs: this.executionTimeMs,
      workspaceId: this.workspaceId,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }
}

/**
 * AgentConsentRequestedEventV1 - emitted when agent needs user consent
 */
export class AgentConsentRequestedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'AgentConsentRequestedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'ConsentRequest' as const;

  readonly consentRequestId: string;
  readonly executionId: string;
  readonly agentId: string;
  readonly agentName: string;
  readonly capabilityName: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly reason: string;
  readonly payload: Record<string, unknown>;
  readonly expiresAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    consentRequestId: string;
    executionId: string;
    agentId: string;
    agentName: string;
    capabilityName: string;
    workspaceId: string;
    actorId: string;
    reason: string;
    payload: Record<string, unknown>;
    expiresAt: Date;
    correlationId?: string;
    causationId?: string;
    occurredAt?: Date;
  }) {
    this.eventId = data.eventId;
    this.consentRequestId = data.consentRequestId;
    this.executionId = data.executionId;
    this.agentId = data.agentId;
    this.agentName = data.agentName;
    this.capabilityName = data.capabilityName;
    this.workspaceId = data.workspaceId;
    this.actorId = data.actorId;
    this.reason = data.reason;
    this.payload = data.payload;
    this.expiresAt = data.expiresAt;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.consentRequestId;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      consentRequestId: this.consentRequestId,
      executionId: this.executionId,
      agentId: this.agentId,
      agentName: this.agentName,
      capabilityName: this.capabilityName,
      workspaceId: this.workspaceId,
      actorId: this.actorId,
      reason: this.reason,
      payload: this.payload,
      expiresAt: this.expiresAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }
}

/**
 * AgentBlockedEventV1 - emitted when agent is blocked by policy
 */
export class AgentBlockedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'AgentBlockedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'AgentExecution' as const;

  readonly agentId: string;
  readonly executionId: string;
  readonly reason: string;
  readonly policyId: string;
  readonly riskScore?: number;
  readonly workspaceId: string;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    agentId: string;
    executionId: string;
    reason: string;
    policyId: string;
    riskScore?: number;
    workspaceId: string;
    correlationId?: string;
    causationId?: string;
    occurredAt?: Date;
  }) {
    this.eventId = data.eventId;
    this.agentId = data.agentId;
    this.executionId = data.executionId;
    this.reason = data.reason;
    this.policyId = data.policyId;
    this.riskScore = data.riskScore;
    this.workspaceId = data.workspaceId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.executionId;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      agentId: this.agentId,
      executionId: this.executionId,
      reason: this.reason,
      policyId: this.policyId,
      riskScore: this.riskScore,
      workspaceId: this.workspaceId,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }
}
