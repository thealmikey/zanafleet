import { AIFeedbackEntity, AIFeedbackType } from '../../entities/ai-feedback.entity';
import { testUuid } from '../utils/test-helpers';

describe('AIFeedbackEntity', () => {
  describe('fromAcceptedSuggestion', () => {
    it('should create entity from accepted suggestion', () => {
      const params = {
        id: testUuid(),
        actorId: testUuid(),
        suggestionId: testUuid(),
        capability: 'submit_for_review',
        confidence: 0.85,
        riskScore: 20,
        reason: 'Good suggestion',
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        userComment: 'Great!',
        correlationId: testUuid(),
      };

      const entity = AIFeedbackEntity.fromAcceptedSuggestion(params);

      expect(entity.id).toBe(params.id);
      expect(entity.actorId).toBe(params.actorId);
      expect(entity.suggestionId).toBe(params.suggestionId);
      expect(entity.feedbackType).toBe(AIFeedbackType.ACCEPTED);
      expect(entity.capability).toBe(params.capability);
      expect(entity.confidence).toBe(params.confidence);
      expect(entity.riskScore).toBe(params.riskScore);
      expect(entity.reason).toBe(params.reason);
      expect(entity.userComment).toBe(params.userComment);
      expect(entity.contextType).toBe(params.contextType);
      expect(entity.contextId).toBe(params.contextId);
      expect(entity.workflowState).toBe(params.workflowState);
      expect(entity.correlationId).toBe(params.correlationId);
    });

    it('should set userComment to null when not provided', () => {
      const params = {
        id: testUuid(),
        actorId: testUuid(),
        suggestionId: testUuid(),
        capability: 'submit_for_review',
        confidence: 0.85,
        reason: 'Good suggestion',
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
      };

      const entity = AIFeedbackEntity.fromAcceptedSuggestion(params);

      expect(entity.userComment).toBeNull();
    });
  });

  describe('fromRejectedSuggestion', () => {
    it('should create entity from rejected suggestion', () => {
      const params = {
        id: testUuid(),
        actorId: testUuid(),
        suggestionId: testUuid(),
        capability: 'submit_for_review',
        confidence: 0.85,
        riskScore: 20,
        reason: 'Good suggestion',
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        userComment: 'Not relevant',
        correlationId: testUuid(),
      };

      const entity = AIFeedbackEntity.fromRejectedSuggestion(params);

      expect(entity.feedbackType).toBe(AIFeedbackType.REJECTED);
      expect(entity.userComment).toBe(params.userComment);
    });

    it('should set userComment to null when not provided', () => {
      const params = {
        id: testUuid(),
        actorId: testUuid(),
        suggestionId: testUuid(),
        capability: 'submit_for_review',
        confidence: 0.85,
        reason: 'Good suggestion',
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
      };

      const entity = AIFeedbackEntity.fromRejectedSuggestion(params);

      expect(entity.userComment).toBeNull();
    });
  });

  describe('fromExpiredSuggestion', () => {
    it('should create entity from expired suggestion', () => {
      const params = {
        id: testUuid(),
        actorId: testUuid(),
        suggestionId: testUuid(),
        capability: 'submit_for_review',
        confidence: 0.85,
        riskScore: 20,
        reason: 'Good suggestion',
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        correlationId: testUuid(),
      };

      const entity = AIFeedbackEntity.fromExpiredSuggestion(params);

      expect(entity.feedbackType).toBe(AIFeedbackType.EXPIRED);
      expect(entity.userComment).toBeNull();
    });

    it('should not include userComment for expired suggestions', () => {
      const params = {
        id: testUuid(),
        actorId: testUuid(),
        suggestionId: testUuid(),
        capability: 'submit_for_review',
        confidence: 0.85,
        reason: 'Good suggestion',
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        userComment: 'Should be ignored',
      };

      const entity = AIFeedbackEntity.fromExpiredSuggestion(params);

      expect(entity.userComment).toBeNull();
    });
  });

  describe('AIFeedbackType enum', () => {
    it('should have ACCEPTED type', () => {
      expect(AIFeedbackType.ACCEPTED).toBe('accepted');
    });

    it('should have REJECTED type', () => {
      expect(AIFeedbackType.REJECTED).toBe('rejected');
    });

    it('should have EXPIRED type', () => {
      expect(AIFeedbackType.EXPIRED).toBe('expired');
    });
  });
});
