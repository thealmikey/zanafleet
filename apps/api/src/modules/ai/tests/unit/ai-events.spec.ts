import { AIHangingStateDetectedEventV1 } from '../../events/ai-hanging-state-detected.event';
import { AISuggestionAcceptedEventV1 } from '../../events/ai-suggestion-accepted.event';
import { AISuggestionGeneratedEventV1 } from '../../events/ai-suggestion-generated.event';
import { AISuggestionRejectedEventV1 } from '../../events/ai-suggestion-rejected.event';
import { testUuid, createFutureDate } from '../utils/test-helpers';

describe('AI Events', () => {
  describe('AISuggestionGeneratedEventV1', () => {
    const baseData = {
      eventId: testUuid(),
      aggregateId: testUuid(),
      actorId: testUuid(),
      suggestionId: testUuid(),
      contextType: 'workflow',
      contextId: testUuid(),
      workflowState: 'pending',
      capability: 'submit_for_review',
      reason: 'Test reason',
      confidence: 0.75,
      riskScore: 25,
      expiresAt: createFutureDate(24),
    };

    describe('constructor', () => {
      it('should create event with required fields', () => {
        const event = new AISuggestionGeneratedEventV1(baseData);

        expect(event.eventId).toBe(baseData.eventId);
        expect(event.aggregateId).toBe(baseData.aggregateId);
        expect(event.actorId).toBe(baseData.actorId);
        expect(event.suggestionId).toBe(baseData.suggestionId);
        expect(event.contextType).toBe(baseData.contextType);
        expect(event.contextId).toBe(baseData.contextId);
        expect(event.workflowState).toBe(baseData.workflowState);
        expect(event.capability).toBe(baseData.capability);
        expect(event.reason).toBe(baseData.reason);
        expect(event.confidence).toBe(baseData.confidence);
        expect(event.riskScore).toBe(baseData.riskScore);
      });

      it('should include optional fields when provided', () => {
        const event = new AISuggestionGeneratedEventV1({
          ...baseData,
          correlationId: testUuid(),
          causationId: testUuid(),
          deduplicationHash: 'hash-123',
          metadata: { key: 'value' },
        });

        expect(event.correlationId).toBeDefined();
        expect(event.causationId).toBeDefined();
        expect(event.deduplicationHash).toBe('hash-123');
        expect(event.metadata).toEqual({ key: 'value' });
      });

      it('should set occurredAt to current time when not provided', () => {
        const beforeTime = new Date();
        const event = new AISuggestionGeneratedEventV1(baseData);
        const afterTime = new Date();

        expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      });

      it('should use provided occurredAt', () => {
        const customDate = new Date('2024-01-01T00:00:00Z');
        const event = new AISuggestionGeneratedEventV1({
          ...baseData,
          occurredAt: customDate,
        });

        expect(event.occurredAt).toEqual(customDate);
      });

      it('should have correct eventType', () => {
        const event = new AISuggestionGeneratedEventV1(baseData);

        expect(event.eventType).toBe('AISuggestionGeneratedEvent-V1');
      });

      it('should have correct eventVersion', () => {
        const event = new AISuggestionGeneratedEventV1(baseData);

        expect(event.eventVersion).toBe('1.0.0');
      });

      it('should have correct aggregateType', () => {
        const event = new AISuggestionGeneratedEventV1(baseData);

        expect(event.aggregateType).toBe('AISuggestion');
      });
    });

    describe('serialization', () => {
      it('should serialize to JSON', () => {
        const event = new AISuggestionGeneratedEventV1(baseData);
        const json = event.toJSON();

        expect(json.eventType).toBe('AISuggestionGeneratedEvent-V1');
        expect(json.eventVersion).toBe('1.0.0');
        expect(json.aggregateType).toBe('AISuggestion');
        expect(json.occurredAt).toBe(event.occurredAt.toISOString());
        expect(json.expiresAt).toBe(baseData.expiresAt.toISOString());
      });

      it('should deserialize from JSON', () => {
        const original = new AISuggestionGeneratedEventV1(baseData);
        const json = original.toJSON();
        const restored = AISuggestionGeneratedEventV1.fromJSON(json);

        expect(restored.eventId).toBe(original.eventId);
        expect(restored.actorId).toBe(original.actorId);
        expect(restored.suggestionId).toBe(original.suggestionId);
      });
    });
  });

  describe('AISuggestionAcceptedEventV1', () => {
    const baseData = {
      eventId: testUuid(),
      aggregateId: testUuid(),
      actorId: testUuid(),
      suggestionId: testUuid(),
      contextType: 'workflow',
      contextId: testUuid(),
      workflowState: 'pending',
      capability: 'submit_for_review',
      confidence: 0.75,
      riskScore: 25,
      reason: 'Test reason',
    };

    it('should create accepted event', () => {
      const event = new AISuggestionAcceptedEventV1(baseData);

      expect(event.eventType).toBe('AISuggestionAcceptedEvent-V1');
    });

    it('should include userComment when provided', () => {
      const event = new AISuggestionAcceptedEventV1({
        ...baseData,
        userComment: 'Great suggestion!',
      });

      expect(event.userComment).toBe('Great suggestion!');
    });

    it('should serialize and deserialize', () => {
      const original = new AISuggestionAcceptedEventV1({
        ...baseData,
        userComment: 'Test',
      });
      const json = original.toJSON();
      const restored = AISuggestionAcceptedEventV1.fromJSON(json);

      expect(restored.userComment).toBe('Test');
    });
  });

  describe('AISuggestionRejectedEventV1', () => {
    const baseData = {
      eventId: testUuid(),
      aggregateId: testUuid(),
      actorId: testUuid(),
      suggestionId: testUuid(),
      contextType: 'workflow',
      contextId: testUuid(),
      workflowState: 'pending',
      capability: 'submit_for_review',
      confidence: 0.75,
      riskScore: 25,
      reason: 'Test reason',
    };

    it('should create rejected event', () => {
      const event = new AISuggestionRejectedEventV1(baseData);

      expect(event.eventType).toBe('AISuggestionRejectedEvent-V1');
    });

    it('should include userComment when provided', () => {
      const event = new AISuggestionRejectedEventV1({
        ...baseData,
        userComment: 'Not relevant',
      });

      expect(event.userComment).toBe('Not relevant');
    });
  });

  describe('AIHangingStateDetectedEventV1', () => {
    const baseData = {
      eventId: testUuid(),
      aggregateId: testUuid(),
      actorId: testUuid(),
      contextType: 'workflow',
      contextId: testUuid(),
      workflowState: 'pending',
      previousState: 'draft',
      stateEnteredAt: new Date('2024-01-01T00:00:00Z'),
      durationMs: 600000,
      expectedDurationMs: 300000,
    };

    it('should create hanging state event', () => {
      const event = new AIHangingStateDetectedEventV1(baseData);

      expect(event.eventType).toBe('AIHangingStateDetectedEvent-V1');
      expect(event.durationMs).toBe(600000);
      expect(event.expectedDurationMs).toBe(300000);
    });

    it('should include suggestedCapability when provided', () => {
      const event = new AIHangingStateDetectedEventV1({
        ...baseData,
        suggestedCapability: 'check_status',
        reason: 'Pending too long',
      });

      expect(event.suggestedCapability).toBe('check_status');
      expect(event.reason).toBe('Pending too long');
    });

    describe('getSeverityRatio', () => {
      it('should calculate severity ratio', () => {
        const event = new AIHangingStateDetectedEventV1(baseData);

        expect(event.getSeverityRatio()).toBe(2);
      });

      it('should return 1 for exact expected duration', () => {
        const event = new AIHangingStateDetectedEventV1({
          ...baseData,
          durationMs: 300000,
          expectedDurationMs: 300000,
        });

        expect(event.getSeverityRatio()).toBe(1);
      });
    });

    describe('isCritical', () => {
      it('should return true for >2x expected duration', () => {
        const event = new AIHangingStateDetectedEventV1({
          ...baseData,
          durationMs: 700000,
          expectedDurationMs: 300000,
        });

        expect(event.isCritical()).toBe(true);
      });

      it('should return false for exactly 2x', () => {
        const event = new AIHangingStateDetectedEventV1({
          ...baseData,
          durationMs: 600000,
          expectedDurationMs: 300000,
        });

        expect(event.isCritical()).toBe(false);
      });

      it('should return false for <2x', () => {
        const event = new AIHangingStateDetectedEventV1({
          ...baseData,
          durationMs: 500000,
          expectedDurationMs: 300000,
        });

        expect(event.isCritical()).toBe(false);
      });
    });

    it('should serialize and deserialize', () => {
      const original = new AIHangingStateDetectedEventV1(baseData);
      const json = original.toJSON();
      const restored = AIHangingStateDetectedEventV1.fromJSON(json);

      expect(restored.durationMs).toBe(original.durationMs);
      expect(restored.expectedDurationMs).toBe(original.expectedDurationMs);
    });
  });
});
