import { BaseEvent } from '../../../core/event-bus/interfaces/base-event.interface';
import { PolicyEffect, PolicyTrigger } from '../dto';

/**
 * Violation type enum for policy violations
 */
export type PolicyViolationType = 'BLOCKED' | 'REQUIRES_APPROVAL';

/**
 * PolicyViolationDetectedEventV1
 *
 * Event emitted when a policy evaluation results in a BLOCK or REQUIRE_APPROVAL effect.
 * Used for alerting, monitoring, and audit purposes.
 */
export class PolicyViolationDetectedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType: 'PolicyViolationDetectedEvent-V1' = 'PolicyViolationDetectedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'PolicyViolation' = 'PolicyViolation';

  readonly policyId: string;
  readonly policyName: string;
  readonly violationType: PolicyViolationType;
  readonly trigger: PolicyTrigger;
  readonly workspaceId: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly reason: string;
  readonly effect: PolicyEffect;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    policyId: string;
    policyName: string;
    violationType: PolicyViolationType;
    trigger: PolicyTrigger;
    workspaceId: string;
    subjectType: string;
    subjectId: string;
    reason: string;
    effect: PolicyEffect;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.policyId = data.policyId;
    this.policyName = data.policyName;
    this.violationType = data.violationType;
    this.trigger = data.trigger;
    this.workspaceId = data.workspaceId;
    this.subjectType = data.subjectType;
    this.subjectId = data.subjectId;
    this.reason = data.reason;
    this.effect = data.effect;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.policyId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'PolicyViolationDetectedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'PolicyViolation';
    policyId: string;
    policyName: string;
    violationType: PolicyViolationType;
    trigger: PolicyTrigger;
    workspaceId: string;
    subjectType: string;
    subjectId: string;
    reason: string;
    effect: PolicyEffect;
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
      policyId: this.policyId,
      policyName: this.policyName,
      violationType: this.violationType,
      trigger: this.trigger,
      workspaceId: this.workspaceId,
      subjectType: this.subjectType,
      subjectId: this.subjectId,
      reason: this.reason,
      effect: this.effect,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    eventType: 'PolicyViolationDetectedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'PolicyViolation';
    policyId: string;
    policyName: string;
    violationType: PolicyViolationType;
    trigger: PolicyTrigger;
    workspaceId: string;
    subjectType: string;
    subjectId: string;
    reason: string;
    effect: PolicyEffect;
    correlationId?: string;
    causationId?: string;
  }): PolicyViolationDetectedEventV1 {
    return new PolicyViolationDetectedEventV1({
      eventId: data.eventId,
      policyId: data.policyId,
      policyName: data.policyName,
      violationType: data.violationType,
      trigger: data.trigger,
      workspaceId: data.workspaceId,
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      reason: data.reason,
      effect: data.effect,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
