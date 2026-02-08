import { PolicyEffect, PolicyTrigger } from '../../dto';
import { PolicyEvaluatedEventV1 } from '../../events/policy-evaluated.event';
import {
  PolicyViolationDetectedEventV1,
  PolicyViolationType,
} from '../../events/policy-violation-detected.event';

describe('PolicyEvaluatedEventV1', () => {
  const sampleEventData = {
    eventId: '123e4567-e89b-12d3-a456-426614174000',
    trigger: PolicyTrigger.DELIVERY_CREATION,
    workspaceId: 'workspace-123',
    subjectType: 'Delivery',
    subjectId: 'delivery-456',
    finalEffect: PolicyEffect.ALLOW,
    finalPolicyId: 'policy-789',
    finalReason: 'Policy matched - delivery allowed',
    evaluatedPolicyCount: 5,
    matchedPolicyCount: 2,
    processingTimeMs: 15,
    evaluationFailed: false,
    occurredAt: new Date('2024-01-15T10:00:00Z'),
    correlationId: 'corr-123',
    causationId: 'cause-456',
  };

  describe('constructor', () => {
    it('should create event with all provided fields', () => {
      const event = new PolicyEvaluatedEventV1(sampleEventData);

      expect(event.eventId).toBe(sampleEventData.eventId);
      expect(event.eventType).toBe('PolicyEvaluatedEvent-V1');
      expect(event.eventVersion).toBe('1.0.0');
      expect(event.aggregateType).toBe('PolicyDecision');
      expect(event.aggregateId).toBe(sampleEventData.subjectId);
      expect(event.trigger).toBe(sampleEventData.trigger);
      expect(event.workspaceId).toBe(sampleEventData.workspaceId);
      expect(event.subjectType).toBe(sampleEventData.subjectType);
      expect(event.subjectId).toBe(sampleEventData.subjectId);
      expect(event.finalEffect).toBe(sampleEventData.finalEffect);
      expect(event.finalPolicyId).toBe(sampleEventData.finalPolicyId);
      expect(event.finalReason).toBe(sampleEventData.finalReason);
      expect(event.evaluatedPolicyCount).toBe(sampleEventData.evaluatedPolicyCount);
      expect(event.matchedPolicyCount).toBe(sampleEventData.matchedPolicyCount);
      expect(event.processingTimeMs).toBe(sampleEventData.processingTimeMs);
      expect(event.evaluationFailed).toBe(sampleEventData.evaluationFailed);
      expect(event.failMode).toBeUndefined();
      expect(event.occurredAt).toEqual(sampleEventData.occurredAt);
      expect(event.correlationId).toBe(sampleEventData.correlationId);
      expect(event.causationId).toBe(sampleEventData.causationId);
    });

    it('should default occurredAt to current time if not provided', () => {
      const beforeCreate = new Date();
      const event = new PolicyEvaluatedEventV1({
        ...sampleEventData,
        occurredAt: undefined,
      });
      const afterCreate = new Date();

      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should handle null finalPolicyId', () => {
      const event = new PolicyEvaluatedEventV1({
        ...sampleEventData,
        finalPolicyId: null,
      });

      expect(event.finalPolicyId).toBeNull();
    });

    it('should handle evaluationFailed true with failMode open', () => {
      const event = new PolicyEvaluatedEventV1({
        ...sampleEventData,
        evaluationFailed: true,
        failMode: 'open',
        finalPolicyId: null,
        finalReason: 'Policy evaluation failed - defaulting to ALLOW',
      });

      expect(event.evaluationFailed).toBe(true);
      expect(event.failMode).toBe('open');
      expect(event.finalPolicyId).toBeNull();
    });

    it('should handle evaluationFailed true with failMode closed', () => {
      const event = new PolicyEvaluatedEventV1({
        ...sampleEventData,
        evaluationFailed: true,
        failMode: 'closed',
        finalEffect: PolicyEffect.BLOCK,
        finalPolicyId: null,
        finalReason: 'Policy evaluation failed - blocking request',
      });

      expect(event.evaluationFailed).toBe(true);
      expect(event.failMode).toBe('closed');
      expect(event.finalPolicyId).toBeNull();
    });
  });

  describe('toJSON', () => {
    it('should serialize event to JSON with ISO date string', () => {
      const event = new PolicyEvaluatedEventV1(sampleEventData);
      const json = event.toJSON();

      expect(json.eventId).toBe(sampleEventData.eventId);
      expect(json.eventType).toBe('PolicyEvaluatedEvent-V1');
      expect(json.eventVersion).toBe('1.0.0');
      expect(json.occurredAt).toBe('2024-01-15T10:00:00.000Z');
      expect(json.aggregateId).toBe(sampleEventData.subjectId);
      expect(json.aggregateType).toBe('PolicyDecision');
      expect(json.trigger).toBe(sampleEventData.trigger);
      expect(json.workspaceId).toBe(sampleEventData.workspaceId);
      expect(json.subjectType).toBe(sampleEventData.subjectType);
      expect(json.subjectId).toBe(sampleEventData.subjectId);
      expect(json.finalEffect).toBe(sampleEventData.finalEffect);
      expect(json.finalPolicyId).toBe(sampleEventData.finalPolicyId);
      expect(json.finalReason).toBe(sampleEventData.finalReason);
      expect(json.evaluatedPolicyCount).toBe(sampleEventData.evaluatedPolicyCount);
      expect(json.matchedPolicyCount).toBe(sampleEventData.matchedPolicyCount);
      expect(json.processingTimeMs).toBe(sampleEventData.processingTimeMs);
      expect(json.evaluationFailed).toBe(sampleEventData.evaluationFailed);
      expect(json.failMode).toBeUndefined();
      expect(json.correlationId).toBe(sampleEventData.correlationId);
      expect(json.causationId).toBe(sampleEventData.causationId);
    });

    it('should exclude undefined optional fields', () => {
      const event = new PolicyEvaluatedEventV1({
        ...sampleEventData,
        correlationId: undefined,
        causationId: undefined,
      });
      const json = event.toJSON();

      expect(json.correlationId).toBeUndefined();
      expect(json.causationId).toBeUndefined();
    });
  });

  describe('fromJSON', () => {
    it('should deserialize JSON to event instance', () => {
      const json = {
        eventId: sampleEventData.eventId,
        eventType: 'PolicyEvaluatedEvent-V1' as const,
        eventVersion: '1.0.0' as const,
        occurredAt: '2024-01-15T10:00:00.000Z',
        aggregateId: sampleEventData.subjectId,
        aggregateType: 'PolicyDecision' as const,
        trigger: sampleEventData.trigger,
        workspaceId: sampleEventData.workspaceId,
        subjectType: sampleEventData.subjectType,
        subjectId: sampleEventData.subjectId,
        finalEffect: sampleEventData.finalEffect,
        finalPolicyId: sampleEventData.finalPolicyId,
        finalReason: sampleEventData.finalReason,
        evaluatedPolicyCount: sampleEventData.evaluatedPolicyCount,
        matchedPolicyCount: sampleEventData.matchedPolicyCount,
        processingTimeMs: sampleEventData.processingTimeMs,
        evaluationFailed: sampleEventData.evaluationFailed,
        correlationId: sampleEventData.correlationId,
        causationId: sampleEventData.causationId,
      };

      const event = PolicyEvaluatedEventV1.fromJSON(json);

      expect(event).toBeInstanceOf(PolicyEvaluatedEventV1);
      expect(event.eventId).toBe(json.eventId);
      expect(event.occurredAt).toEqual(new Date('2024-01-15T10:00:00.000Z'));
      expect(event.trigger).toBe(json.trigger);
      expect(event.finalEffect).toBe(json.finalEffect);
    });
  });

  describe('round-trip serialization', () => {
    it('should preserve all data through toJSON -> fromJSON', () => {
      const original = new PolicyEvaluatedEventV1(sampleEventData);
      const json = original.toJSON();
      const restored = PolicyEvaluatedEventV1.fromJSON(json);

      expect(restored.eventId).toBe(original.eventId);
      expect(restored.eventType).toBe(original.eventType);
      expect(restored.eventVersion).toBe(original.eventVersion);
      expect(restored.occurredAt).toEqual(original.occurredAt);
      expect(restored.aggregateId).toBe(original.aggregateId);
      expect(restored.aggregateType).toBe(original.aggregateType);
      expect(restored.trigger).toBe(original.trigger);
      expect(restored.workspaceId).toBe(original.workspaceId);
      expect(restored.subjectType).toBe(original.subjectType);
      expect(restored.subjectId).toBe(original.subjectId);
      expect(restored.finalEffect).toBe(original.finalEffect);
      expect(restored.finalPolicyId).toBe(original.finalPolicyId);
      expect(restored.finalReason).toBe(original.finalReason);
      expect(restored.evaluatedPolicyCount).toBe(original.evaluatedPolicyCount);
      expect(restored.matchedPolicyCount).toBe(original.matchedPolicyCount);
      expect(restored.processingTimeMs).toBe(original.processingTimeMs);
      expect(restored.evaluationFailed).toBe(original.evaluationFailed);
      expect(restored.failMode).toBe(original.failMode);
      expect(restored.correlationId).toBe(original.correlationId);
      expect(restored.causationId).toBe(original.causationId);
    });

    it('should handle all PolicyTrigger values through round-trip', () => {
      const triggers = [
        PolicyTrigger.DELIVERY_CREATION,
        PolicyTrigger.RIDER_ASSIGNMENT,
        PolicyTrigger.STATUS_TRANSITION,
        PolicyTrigger.SLA_CHECK,
      ];

      for (const trigger of triggers) {
        const original = new PolicyEvaluatedEventV1({ ...sampleEventData, trigger });
        const restored = PolicyEvaluatedEventV1.fromJSON(original.toJSON());
        expect(restored.trigger).toBe(trigger);
      }
    });

    it('should handle all PolicyEffect values through round-trip', () => {
      const effects = [
        PolicyEffect.ALLOW,
        PolicyEffect.BLOCK,
        PolicyEffect.MODIFY,
        PolicyEffect.REQUIRE_APPROVAL,
      ];

      for (const finalEffect of effects) {
        const original = new PolicyEvaluatedEventV1({ ...sampleEventData, finalEffect });
        const restored = PolicyEvaluatedEventV1.fromJSON(original.toJSON());
        expect(restored.finalEffect).toBe(finalEffect);
      }
    });
  });

  describe('BaseEvent interface compliance', () => {
    it('should have all required BaseEvent fields', () => {
      const event = new PolicyEvaluatedEventV1(sampleEventData);

      expect(event.eventId).toBeDefined();
      expect(event.eventType).toBeDefined();
      expect(event.eventVersion).toBeDefined();
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.aggregateId).toBeDefined();
      expect(event.aggregateType).toBeDefined();
    });
  });
});

describe('PolicyViolationDetectedEventV1', () => {
  const sampleViolationData = {
    eventId: '223e4567-e89b-12d3-a456-426614174001',
    policyId: 'policy-block-001',
    policyName: 'Business Hours Restriction',
    violationType: 'BLOCKED' as PolicyViolationType,
    trigger: PolicyTrigger.DELIVERY_CREATION,
    workspaceId: 'workspace-123',
    subjectType: 'Delivery',
    subjectId: 'delivery-789',
    reason: 'Delivery blocked outside business hours',
    effect: PolicyEffect.BLOCK,
    occurredAt: new Date('2024-01-15T22:00:00Z'),
    correlationId: 'corr-violation-123',
    causationId: 'cause-violation-456',
  };

  describe('constructor', () => {
    it('should create event with all provided fields', () => {
      const event = new PolicyViolationDetectedEventV1(sampleViolationData);

      expect(event.eventId).toBe(sampleViolationData.eventId);
      expect(event.eventType).toBe('PolicyViolationDetectedEvent-V1');
      expect(event.eventVersion).toBe('1.0.0');
      expect(event.aggregateType).toBe('PolicyViolation');
      expect(event.aggregateId).toBe(sampleViolationData.policyId);
      expect(event.policyId).toBe(sampleViolationData.policyId);
      expect(event.policyName).toBe(sampleViolationData.policyName);
      expect(event.violationType).toBe(sampleViolationData.violationType);
      expect(event.trigger).toBe(sampleViolationData.trigger);
      expect(event.workspaceId).toBe(sampleViolationData.workspaceId);
      expect(event.subjectType).toBe(sampleViolationData.subjectType);
      expect(event.subjectId).toBe(sampleViolationData.subjectId);
      expect(event.reason).toBe(sampleViolationData.reason);
      expect(event.effect).toBe(sampleViolationData.effect);
      expect(event.occurredAt).toEqual(sampleViolationData.occurredAt);
      expect(event.correlationId).toBe(sampleViolationData.correlationId);
      expect(event.causationId).toBe(sampleViolationData.causationId);
    });

    it('should default occurredAt to current time if not provided', () => {
      const beforeCreate = new Date();
      const event = new PolicyViolationDetectedEventV1({
        ...sampleViolationData,
        occurredAt: undefined,
      });
      const afterCreate = new Date();

      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should handle REQUIRES_APPROVAL violation type', () => {
      const event = new PolicyViolationDetectedEventV1({
        ...sampleViolationData,
        violationType: 'REQUIRES_APPROVAL',
        effect: PolicyEffect.REQUIRE_APPROVAL,
        reason: 'Delivery requires manager approval',
      });

      expect(event.violationType).toBe('REQUIRES_APPROVAL');
      expect(event.effect).toBe(PolicyEffect.REQUIRE_APPROVAL);
    });
  });

  describe('toJSON', () => {
    it('should serialize event to JSON with ISO date string', () => {
      const event = new PolicyViolationDetectedEventV1(sampleViolationData);
      const json = event.toJSON();

      expect(json.eventId).toBe(sampleViolationData.eventId);
      expect(json.eventType).toBe('PolicyViolationDetectedEvent-V1');
      expect(json.eventVersion).toBe('1.0.0');
      expect(json.occurredAt).toBe('2024-01-15T22:00:00.000Z');
      expect(json.aggregateId).toBe(sampleViolationData.policyId);
      expect(json.aggregateType).toBe('PolicyViolation');
      expect(json.policyId).toBe(sampleViolationData.policyId);
      expect(json.policyName).toBe(sampleViolationData.policyName);
      expect(json.violationType).toBe(sampleViolationData.violationType);
      expect(json.trigger).toBe(sampleViolationData.trigger);
      expect(json.workspaceId).toBe(sampleViolationData.workspaceId);
      expect(json.subjectType).toBe(sampleViolationData.subjectType);
      expect(json.subjectId).toBe(sampleViolationData.subjectId);
      expect(json.reason).toBe(sampleViolationData.reason);
      expect(json.effect).toBe(sampleViolationData.effect);
      expect(json.correlationId).toBe(sampleViolationData.correlationId);
      expect(json.causationId).toBe(sampleViolationData.causationId);
    });

    it('should exclude undefined optional fields', () => {
      const event = new PolicyViolationDetectedEventV1({
        ...sampleViolationData,
        correlationId: undefined,
        causationId: undefined,
      });
      const json = event.toJSON();

      expect(json.correlationId).toBeUndefined();
      expect(json.causationId).toBeUndefined();
    });
  });

  describe('fromJSON', () => {
    it('should deserialize JSON to event instance', () => {
      const json = {
        eventId: sampleViolationData.eventId,
        eventType: 'PolicyViolationDetectedEvent-V1' as const,
        eventVersion: '1.0.0' as const,
        occurredAt: '2024-01-15T22:00:00.000Z',
        aggregateId: sampleViolationData.policyId,
        aggregateType: 'PolicyViolation' as const,
        policyId: sampleViolationData.policyId,
        policyName: sampleViolationData.policyName,
        violationType: sampleViolationData.violationType,
        trigger: sampleViolationData.trigger,
        workspaceId: sampleViolationData.workspaceId,
        subjectType: sampleViolationData.subjectType,
        subjectId: sampleViolationData.subjectId,
        reason: sampleViolationData.reason,
        effect: sampleViolationData.effect,
        correlationId: sampleViolationData.correlationId,
        causationId: sampleViolationData.causationId,
      };

      const event = PolicyViolationDetectedEventV1.fromJSON(json);

      expect(event).toBeInstanceOf(PolicyViolationDetectedEventV1);
      expect(event.eventId).toBe(json.eventId);
      expect(event.occurredAt).toEqual(new Date('2024-01-15T22:00:00.000Z'));
      expect(event.policyId).toBe(json.policyId);
      expect(event.violationType).toBe(json.violationType);
    });
  });

  describe('round-trip serialization', () => {
    it('should preserve all data through toJSON -> fromJSON', () => {
      const original = new PolicyViolationDetectedEventV1(sampleViolationData);
      const json = original.toJSON();
      const restored = PolicyViolationDetectedEventV1.fromJSON(json);

      expect(restored.eventId).toBe(original.eventId);
      expect(restored.eventType).toBe(original.eventType);
      expect(restored.eventVersion).toBe(original.eventVersion);
      expect(restored.occurredAt).toEqual(original.occurredAt);
      expect(restored.aggregateId).toBe(original.aggregateId);
      expect(restored.aggregateType).toBe(original.aggregateType);
      expect(restored.policyId).toBe(original.policyId);
      expect(restored.policyName).toBe(original.policyName);
      expect(restored.violationType).toBe(original.violationType);
      expect(restored.trigger).toBe(original.trigger);
      expect(restored.workspaceId).toBe(original.workspaceId);
      expect(restored.subjectType).toBe(original.subjectType);
      expect(restored.subjectId).toBe(original.subjectId);
      expect(restored.reason).toBe(original.reason);
      expect(restored.effect).toBe(original.effect);
      expect(restored.correlationId).toBe(original.correlationId);
      expect(restored.causationId).toBe(original.causationId);
    });

    it('should handle both violation types through round-trip', () => {
      const violationTypes: PolicyViolationType[] = ['BLOCKED', 'REQUIRES_APPROVAL'];

      for (const violationType of violationTypes) {
        const effect =
          violationType === 'BLOCKED' ? PolicyEffect.BLOCK : PolicyEffect.REQUIRE_APPROVAL;
        const original = new PolicyViolationDetectedEventV1({
          ...sampleViolationData,
          violationType,
          effect,
        });
        const restored = PolicyViolationDetectedEventV1.fromJSON(original.toJSON());
        expect(restored.violationType).toBe(violationType);
        expect(restored.effect).toBe(effect);
      }
    });

    it('should handle all PolicyTrigger values through round-trip', () => {
      const triggers = [
        PolicyTrigger.DELIVERY_CREATION,
        PolicyTrigger.RIDER_ASSIGNMENT,
        PolicyTrigger.STATUS_TRANSITION,
        PolicyTrigger.SLA_CHECK,
      ];

      for (const trigger of triggers) {
        const original = new PolicyViolationDetectedEventV1({ ...sampleViolationData, trigger });
        const restored = PolicyViolationDetectedEventV1.fromJSON(original.toJSON());
        expect(restored.trigger).toBe(trigger);
      }
    });
  });

  describe('BaseEvent interface compliance', () => {
    it('should have all required BaseEvent fields', () => {
      const event = new PolicyViolationDetectedEventV1(sampleViolationData);

      expect(event.eventId).toBeDefined();
      expect(event.eventType).toBeDefined();
      expect(event.eventVersion).toBeDefined();
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.aggregateId).toBeDefined();
      expect(event.aggregateType).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle various subjectType values', () => {
      const subjectTypes = ['Delivery', 'Rider', 'Business', 'Order'];

      for (const subjectType of subjectTypes) {
        const event = new PolicyViolationDetectedEventV1({ ...sampleViolationData, subjectType });
        expect(event.subjectType).toBe(subjectType);

        const restored = PolicyViolationDetectedEventV1.fromJSON(event.toJSON());
        expect(restored.subjectType).toBe(subjectType);
      }
    });

    it('should handle long reason strings', () => {
      const longReason =
        'This is a very long reason that explains in detail why the policy was violated. ' +
        'It includes multiple conditions that were not met and provides context for the violation. ' +
        'The violation occurred due to time restrictions, geographic constraints, and business rules.';

      const event = new PolicyViolationDetectedEventV1({
        ...sampleViolationData,
        reason: longReason,
      });

      expect(event.reason).toBe(longReason);

      const restored = PolicyViolationDetectedEventV1.fromJSON(event.toJSON());
      expect(restored.reason).toBe(longReason);
    });
  });
});
