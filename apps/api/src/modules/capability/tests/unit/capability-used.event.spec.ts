import {
  CapabilityUsedEventV1,
  CapabilityExecutionResult,
} from '../../events/capability-used.event';

describe('CapabilityUsedEventV1', () => {
  const baseData = {
    eventId: 'event-123',
    actorId: 'actor-456',
    capabilityName: 'booking_confirm',
  };

  describe('constructor', () => {
    it('should create event with required fields', () => {
      const event = new CapabilityUsedEventV1({
        ...baseData,
        result: CapabilityExecutionResult.SUCCESS,
      });

      expect(event.eventId).toBe('event-123');
      expect(event.actorId).toBe('actor-456');
      expect(event.capabilityName).toBe('booking_confirm');
      expect(event.result).toBe(CapabilityExecutionResult.SUCCESS);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should generate aggregateId from actor, capability, and timestamp', () => {
      const event = new CapabilityUsedEventV1({
        ...baseData,
        result: CapabilityExecutionResult.SUCCESS,
      });

      expect(event.aggregateId).toContain('actor-456');
      expect(event.aggregateId).toContain('booking_confirm');
    });

    it('should include optional fields when provided', () => {
      const event = new CapabilityUsedEventV1({
        ...baseData,
        actorType: 'user',
        workspaceId: 'workspace-789',
        contextId: 'booking-123',
        contextType: 'Booking',
        payload: { key: 'value' },
        correlationId: 'corr-123',
        executionTimeMs: 150,
        result: CapabilityExecutionResult.SUCCESS,
      });

      expect(event.actorType).toBe('user');
      expect(event.workspaceId).toBe('workspace-789');
      expect(event.contextId).toBe('booking-123');
      expect(event.contextType).toBe('Booking');
      expect(event.payload).toEqual({ key: 'value' });
      expect(event.correlationId).toBe('corr-123');
      expect(event.executionTimeMs).toBe(150);
    });
  });

  describe('static factory methods', () => {
    describe('success', () => {
      it('should create a success event', () => {
        const event = CapabilityUsedEventV1.success({
          eventId: 'event-1',
          actorId: 'actor-1',
          capabilityName: 'booking_confirm',
        });

        expect(event.result).toBe(CapabilityExecutionResult.SUCCESS);
        expect(event.reason).toBeUndefined();
      });

      it('should create success event with all optional fields', () => {
        const event = CapabilityUsedEventV1.success({
          eventId: 'event-1',
          actorId: 'actor-1',
          actorType: 'user',
          capabilityName: 'booking_confirm',
          capabilityId: 'cap-123',
          contextId: 'booking-456',
          contextType: 'Booking',
          workspaceId: 'ws-789',
          payload: { amount: 100 },
          correlationId: 'corr-123',
          executionTimeMs: 50,
        });

        expect(event.result).toBe(CapabilityExecutionResult.SUCCESS);
        expect(event.actorType).toBe('user');
        expect(event.capabilityId).toBe('cap-123');
        expect(event.contextId).toBe('booking-456');
        expect(event.workspaceId).toBe('ws-789');
        expect(event.payload).toEqual({ amount: 100 });
        expect(event.correlationId).toBe('corr-123');
        expect(event.executionTimeMs).toBe(50);
      });
    });

    describe('denied', () => {
      it('should create a denied event', () => {
        const event = CapabilityUsedEventV1.denied({
          eventId: 'event-1',
          actorId: 'actor-1',
          capabilityName: 'admin_delete',
          reason: 'Actor lacks required capability',
        });

        expect(event.result).toBe(CapabilityExecutionResult.DENIED);
        expect(event.reason).toBe('Actor lacks required capability');
      });
    });

    describe('consentRequired', () => {
      it('should create a consent required event', () => {
        const event = CapabilityUsedEventV1.consentRequired({
          eventId: 'event-1',
          actorId: 'actor-1',
          capabilityName: 'data_export',
          reason: 'User consent required for data access',
        });

        expect(event.result).toBe(CapabilityExecutionResult.CONSENT_REQUIRED);
        expect(event.reason).toBe('User consent required for data access');
      });
    });

    describe('failed', () => {
      it('should create a failed event', () => {
        const event = CapabilityUsedEventV1.failed({
          eventId: 'event-1',
          actorId: 'actor-1',
          capabilityName: 'booking_confirm',
          reason: 'Command execution failed: Booking not found',
        });

        expect(event.result).toBe(CapabilityExecutionResult.FAILED);
        expect(event.reason).toBe('Command execution failed: Booking not found');
      });
    });
  });

  describe('isSuccess', () => {
    it('should return true for SUCCESS result', () => {
      const event = CapabilityUsedEventV1.success({
        eventId: 'event-1',
        actorId: 'actor-1',
        capabilityName: 'cap-1',
      });

      expect(event.isSuccess()).toBe(true);
    });

    it('should return false for non-SUCCESS results', () => {
      const denied = CapabilityUsedEventV1.denied({
        eventId: 'event-1',
        actorId: 'actor-1',
        capabilityName: 'cap-1',
      });

      expect(denied.isSuccess()).toBe(false);

      const failed = CapabilityUsedEventV1.failed({
        eventId: 'event-1',
        actorId: 'actor-1',
        capabilityName: 'cap-1',
      });

      expect(failed.isSuccess()).toBe(false);
    });
  });

  describe('isDenied', () => {
    it('should return true for DENIED result', () => {
      const event = CapabilityUsedEventV1.denied({
        eventId: 'event-1',
        actorId: 'actor-1',
        capabilityName: 'cap-1',
      });

      expect(event.isDenied()).toBe(true);
    });

    it('should return false for non-DENIED results', () => {
      const success = CapabilityUsedEventV1.success({
        eventId: 'event-1',
        actorId: 'actor-1',
        capabilityName: 'cap-1',
      });

      expect(success.isDenied()).toBe(false);
    });
  });

  describe('isFailed', () => {
    it('should return true for FAILED result', () => {
      const event = CapabilityUsedEventV1.failed({
        eventId: 'event-1',
        actorId: 'actor-1',
        capabilityName: 'cap-1',
      });

      expect(event.isFailed()).toBe(true);
    });

    it('should return false for non-FAILED results', () => {
      const success = CapabilityUsedEventV1.success({
        eventId: 'event-1',
        actorId: 'actor-1',
        capabilityName: 'cap-1',
      });

      expect(success.isFailed()).toBe(false);
    });
  });

  describe('isConsentRequired', () => {
    it('should return true for CONSENT_REQUIRED result', () => {
      const event = CapabilityUsedEventV1.consentRequired({
        eventId: 'event-1',
        actorId: 'actor-1',
        capabilityName: 'cap-1',
      });

      expect(event.isConsentRequired()).toBe(true);
    });

    it('should return false for non-CONSENT_REQUIRED results', () => {
      const success = CapabilityUsedEventV1.success({
        eventId: 'event-1',
        actorId: 'actor-1',
        capabilityName: 'cap-1',
      });

      expect(success.isConsentRequired()).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const event = new CapabilityUsedEventV1({
        eventId: 'event-123',
        actorId: 'actor-456',
        actorType: 'user',
        capabilityName: 'booking_confirm',
        capabilityId: 'cap-789',
        contextId: 'booking-111',
        contextType: 'Booking',
        workspaceId: 'ws-222',
        result: CapabilityExecutionResult.SUCCESS,
        payload: { key: 'value' },
        correlationId: 'corr-333',
        executionTimeMs: 100,
      });

      const json = event.toJSON();

      expect(json.eventId).toBe('event-123');
      expect(json.eventType).toBe('CapabilityUsedEvent-V1');
      expect(json.eventVersion).toBe('1.0.0');
      expect(json.actorId).toBe('actor-456');
      expect(json.actorType).toBe('user');
      expect(json.capabilityName).toBe('booking_confirm');
      expect(json.capabilityId).toBe('cap-789');
      expect(json.contextId).toBe('booking-111');
      expect(json.contextType).toBe('Booking');
      expect(json.workspaceId).toBe('ws-222');
      expect(json.result).toBe('success');
      expect(json.payload).toEqual({ key: 'value' });
      expect(json.correlationId).toBe('corr-333');
      expect(json.executionTimeMs).toBe(100);
      expect(json.occurredAt).toBeDefined();
    });

    it('should deserialize from JSON correctly', () => {
      const json: any = {
        eventId: 'event-123',
        eventType: 'CapabilityUsedEvent-V1',
        eventVersion: '1.0.0',
        occurredAt: '2024-01-15T10:30:00.000Z',
        aggregateId: 'agg-123',
        aggregateType: 'CapabilityUsage',
        actorId: 'actor-456',
        actorType: 'user',
        capabilityName: 'booking_confirm',
        capabilityId: 'cap-789',
        contextId: 'booking-111',
        contextType: 'Booking',
        workspaceId: 'ws-222',
        result: 'success' as CapabilityExecutionResult,
        reason: undefined,
        payload: { key: 'value' },
        consentObtained: undefined,
        consentId: undefined,
        correlationId: 'corr-333',
        causationId: undefined,
        executionTimeMs: 100,
        metadata: undefined,
      };

      const event = CapabilityUsedEventV1.fromJSON(json);

      expect(event.eventId).toBe('event-123');
      expect(event.eventType).toBe('CapabilityUsedEvent-V1');
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.actorId).toBe('actor-456');
      expect(event.capabilityName).toBe('booking_confirm');
      expect(event.result).toBe(CapabilityExecutionResult.SUCCESS);
    });

    it('should maintain round-trip consistency', () => {
      const original = CapabilityUsedEventV1.success({
        eventId: 'event-123',
        actorId: 'actor-456',
        actorType: 'user',
        capabilityName: 'booking_confirm',
        capabilityId: 'cap-789',
        contextId: 'booking-111',
        contextType: 'Booking',
        workspaceId: 'ws-222',
        payload: { amount: 100 },
        correlationId: 'corr-333',
        executionTimeMs: 50,
        metadata: { source: 'test' },
      });

      const json = original.toJSON();
      const restored = CapabilityUsedEventV1.fromJSON(json);

      expect(restored.eventId).toBe(original.eventId);
      expect(restored.actorId).toBe(original.actorId);
      expect(restored.actorType).toBe(original.actorType);
      expect(restored.capabilityName).toBe(original.capabilityName);
      expect(restored.capabilityId).toBe(original.capabilityId);
      expect(restored.contextId).toBe(original.contextId);
      expect(restored.contextType).toBe(original.contextType);
      expect(restored.workspaceId).toBe(original.workspaceId);
      expect(restored.result).toBe(original.result);
      expect(restored.correlationId).toBe(original.correlationId);
      expect(restored.executionTimeMs).toBe(original.executionTimeMs);
    });
  });

  describe('enum values', () => {
    it('should have correct enum values', () => {
      expect(CapabilityExecutionResult.SUCCESS).toBe('success');
      expect(CapabilityExecutionResult.DENIED).toBe('denied');
      expect(CapabilityExecutionResult.FAILED).toBe('failed');
      expect(CapabilityExecutionResult.CONSENT_REQUIRED).toBe('consent_required');
    });
  });
});
