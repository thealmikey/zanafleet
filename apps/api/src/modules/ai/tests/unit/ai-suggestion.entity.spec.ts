import { AISuggestionEntity } from '../../entities/ai-suggestion.entity';
import { AISuggestionStatus } from '../../interfaces/ai-suggestion.interface';
import { createFutureDate, createPastDate, testUuid } from '../utils/test-helpers';

describe('AISuggestionEntity', () => {
  describe('fromDomain', () => {
    it('should create entity from domain object', () => {
      const params = {
        id: testUuid(),
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        capability: 'submit_for_review',
        reason: 'Test reason',
        confidence: 0.75,
        riskScore: 25,
        status: AISuggestionStatus.PENDING,
        expiresAt: createFutureDate(24),
        deduplicationHash: 'hash-123',
      };

      const entity = AISuggestionEntity.fromDomain(params);

      expect(entity.id).toBe(params.id);
      expect(entity.actorId).toBe(params.actorId);
      expect(entity.contextType).toBe(params.contextType);
      expect(entity.contextId).toBe(params.contextId);
      expect(entity.workflowState).toBe(params.workflowState);
      expect(entity.capability).toBe(params.capability);
      expect(entity.reason).toBe(params.reason);
      expect(entity.confidence).toBe(params.confidence);
      expect(entity.riskScore).toBe(params.riskScore);
      expect(entity.status).toBe(params.status);
      expect(entity.expiresAt).toBe(params.expiresAt);
      expect(entity.deduplicationHash).toBe(params.deduplicationHash);
    });

    it('should set default status when not provided', () => {
      const params = {
        id: testUuid(),
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        capability: 'submit_for_review',
        reason: 'Test reason',
        confidence: 0.75,
        expiresAt: createFutureDate(24),
      };

      const entity = AISuggestionEntity.fromDomain(params);

      expect(entity.status).toBe(AISuggestionStatus.PENDING);
    });

    it('should set default values for optional fields', () => {
      const params = {
        id: testUuid(),
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        capability: 'submit_for_review',
        reason: 'Test reason',
        confidence: 0.75,
        expiresAt: createFutureDate(24),
      };

      const entity = AISuggestionEntity.fromDomain(params);

      expect(entity.riskScore).toBeNull();
      expect(entity.deduplicationHash).toBeNull();
      expect(entity.metadata).toBeNull();
      expect(entity.correlationId).toBeNull();
      expect(entity.causationId).toBeNull();
    });
  });

  describe('isExpired', () => {
    it('should return true when current time is past expiresAt', () => {
      const entity = new AISuggestionEntity();
      entity.expiresAt = createPastDate(1);

      expect(entity.isExpired()).toBe(true);
    });

    it('should return false when current time is before expiresAt', () => {
      const entity = new AISuggestionEntity();
      entity.expiresAt = createFutureDate(1);

      expect(entity.isExpired()).toBe(false);
    });

    it('should handle exact time boundary', () => {
      const entity = new AISuggestionEntity();
      entity.expiresAt = new Date();

      expect(entity.isExpired()).toBe(false);
    });
  });

  describe('isPending', () => {
    it('should return true for PENDING status', () => {
      const entity = new AISuggestionEntity();
      entity.status = AISuggestionStatus.PENDING;

      expect(entity.isPending()).toBe(true);
    });

    it('should return false for ACCEPTED status', () => {
      const entity = new AISuggestionEntity();
      entity.status = AISuggestionStatus.ACCEPTED;

      expect(entity.isPending()).toBe(false);
    });

    it('should return false for REJECTED status', () => {
      const entity = new AISuggestionEntity();
      entity.status = AISuggestionStatus.REJECTED;

      expect(entity.isPending()).toBe(false);
    });

    it('should return false for EXPIRED status', () => {
      const entity = new AISuggestionEntity();
      entity.status = AISuggestionStatus.EXPIRED;

      expect(entity.isPending()).toBe(false);
    });
  });

  describe('status transitions', () => {
    it('should accept suggestion', () => {
      const entity = new AISuggestionEntity();
      entity.status = AISuggestionStatus.PENDING;

      entity.accept();

      expect(entity.status).toBe(AISuggestionStatus.ACCEPTED);
    });

    it('should reject suggestion', () => {
      const entity = new AISuggestionEntity();
      entity.status = AISuggestionStatus.PENDING;

      entity.reject();

      expect(entity.status).toBe(AISuggestionStatus.REJECTED);
    });

    it('should expire suggestion', () => {
      const entity = new AISuggestionEntity();
      entity.status = AISuggestionStatus.PENDING;

      entity.expire();

      expect(entity.status).toBe(AISuggestionStatus.EXPIRED);
    });

    it('should allow transition from PENDING to ACCEPTED', () => {
      const entity = new AISuggestionEntity();
      entity.status = AISuggestionStatus.PENDING;

      entity.accept();

      expect(entity.status).toBe(AISuggestionStatus.ACCEPTED);
    });

    it('should allow transition from PENDING to REJECTED', () => {
      const entity = new AISuggestionEntity();
      entity.status = AISuggestionStatus.PENDING;

      entity.reject();

      expect(entity.status).toBe(AISuggestionStatus.REJECTED);
    });
  });
});
