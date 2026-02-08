import { BaseEvent } from '../../../core/event-bus/interfaces/base-event.interface';
import { PolicyEffect, PolicyTrigger } from '../dto';

/**
 * PolicyEvaluatedEventV1
 *
 * Event emitted after every policy evaluation for observability and audit trail.
 * Published to the event bus for downstream consumers (analytics, monitoring, etc.).
 */
export class PolicyEvaluatedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType: 'PolicyEvaluatedEvent-V1' = 'PolicyEvaluatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'PolicyDecision' = 'PolicyDecision';

  readonly trigger: PolicyTrigger;
  readonly workspaceId: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly finalEffect: PolicyEffect;
  readonly finalPolicyId: string | null;
  readonly finalReason: string;
  readonly evaluatedPolicyCount: number;
  readonly matchedPolicyCount: number;
  readonly processingTimeMs: number;
  readonly evaluationFailed: boolean;
  readonly failMode?: 'open' | 'closed';

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    trigger: PolicyTrigger;
    workspaceId: string;
    subjectType: string;
    subjectId: string;
    finalEffect: PolicyEffect;
    finalPolicyId: string | null;
    finalReason: string;
    evaluatedPolicyCount: number;
    matchedPolicyCount: number;
    processingTimeMs: number;
    evaluationFailed: boolean;
    failMode?: 'open' | 'closed';
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.trigger = data.trigger;
    this.workspaceId = data.workspaceId;
    this.subjectType = data.subjectType;
    this.subjectId = data.subjectId;
    this.finalEffect = data.finalEffect;
    this.finalPolicyId = data.finalPolicyId;
    this.finalReason = data.finalReason;
    this.evaluatedPolicyCount = data.evaluatedPolicyCount;
    this.matchedPolicyCount = data.matchedPolicyCount;
    this.processingTimeMs = data.processingTimeMs;
    this.evaluationFailed = data.evaluationFailed;
    this.failMode = data.failMode;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.subjectId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'PolicyEvaluatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'PolicyDecision';
    trigger: PolicyTrigger;
    workspaceId: string;
    subjectType: string;
    subjectId: string;
    finalEffect: PolicyEffect;
    finalPolicyId: string | null;
    finalReason: string;
    evaluatedPolicyCount: number;
    matchedPolicyCount: number;
    processingTimeMs: number;
    evaluationFailed: boolean;
    failMode?: 'open' | 'closed';
    correlationId?: string;
    causationId?: string;
  } {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      trigger: this.trigger,
      workspaceId: this.workspaceId,
      subjectType: this.subjectType,
      subjectId: this.subjectId,
      finalEffect: this.finalEffect,
      finalPolicyId: this.finalPolicyId,
      finalReason: this.finalReason,
      evaluatedPolicyCount: this.evaluatedPolicyCount,
      matchedPolicyCount: this.matchedPolicyCount,
      processingTimeMs: this.processingTimeMs,
      evaluationFailed: this.evaluationFailed,
      failMode: this.failMode,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    eventType: 'PolicyEvaluatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'PolicyDecision';
    trigger: PolicyTrigger;
    workspaceId: string;
    subjectType: string;
    subjectId: string;
    finalEffect: PolicyEffect;
    finalPolicyId: string | null;
    finalReason: string;
    evaluatedPolicyCount: number;
    matchedPolicyCount: number;
    processingTimeMs: number;
    evaluationFailed: boolean;
    failMode?: 'open' | 'closed';
    correlationId?: string;
    causationId?: string;
  }): PolicyEvaluatedEventV1 {
    return new PolicyEvaluatedEventV1({
      eventId: data.eventId,
      trigger: data.trigger,
      workspaceId: data.workspaceId,
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      finalEffect: data.finalEffect,
      finalPolicyId: data.finalPolicyId,
      finalReason: data.finalReason,
      evaluatedPolicyCount: data.evaluatedPolicyCount,
      matchedPolicyCount: data.matchedPolicyCount,
      processingTimeMs: data.processingTimeMs,
      evaluationFailed: data.evaluationFailed,
      failMode: data.failMode,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
