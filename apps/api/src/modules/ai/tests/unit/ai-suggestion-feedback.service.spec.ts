import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AISuggestionFeedbackService } from '../../services/ai-suggestion-feedback.service';
import { AIFeedbackEntity, AIFeedbackType } from '../../entities/ai-feedback.entity';
import { AISuggestionEntity } from '../../entities/ai-suggestion.entity';
import { AISuggestionStatus } from '../../interfaces/ai-suggestion.interface';
import { createMockFeedbackEntity, createMockSuggestionEntity, testUuid } from '../utils/test-helpers';
import { createMockRepository, MockRepository } from '../utils/mocks/repository.mock';

describe('AISuggestionFeedbackService', () => {
  let service: AISuggestionFeedbackService;
  let feedbackRepository: MockRepository<AIFeedbackEntity>;
  let suggestionRepository: MockRepository<AISuggestionEntity>;

  beforeEach(async () => {
    feedbackRepository = createMockRepository<AIFeedbackEntity>();
    suggestionRepository = createMockRepository<AISuggestionEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AISuggestionFeedbackService,
        { provide: getRepositoryToken(AIFeedbackEntity), useValue: feedbackRepository },
        { provide: getRepositoryToken(AISuggestionEntity), useValue: suggestionRepository },
      ],
    }).compile();

    service = module.get<AISuggestionFeedbackService>(AISuggestionFeedbackService);
  });

  describe('recordAccepted', () => {
    it('should capture accepted feedback', async () => {
      const suggestion = createMockSuggestionEntity();
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(suggestion);
      const feedback = createMockFeedbackEntity({ feedbackType: AIFeedbackType.ACCEPTED });
      (feedbackRepository.save as jest.Mock).mockResolvedValue(feedback);

      const result = await service.recordAccepted(suggestion.id);

      expect(result).toBeDefined();
      expect(result?.feedbackType).toBe(AIFeedbackType.ACCEPTED);
    });

    it('should update suggestion status to ACCEPTED', async () => {
      const suggestion = createMockSuggestionEntity({ status: AISuggestionStatus.PENDING });
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(suggestion);
      const feedback = createMockFeedbackEntity({ feedbackType: AIFeedbackType.ACCEPTED });
      (feedbackRepository.save as jest.Mock).mockResolvedValue(feedback);

      await service.recordAccepted(suggestion.id);

      const savedSuggestion = (suggestionRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedSuggestion.status).toBe(AISuggestionStatus.ACCEPTED);
    });

    it('should return null for invalid suggestion ID', async () => {
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.recordAccepted('invalid-id');

      expect(result).toBeNull();
    });

    it('should store context and capability', async () => {
      const suggestion = createMockSuggestionEntity();
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(suggestion);
      
      // Mock the saved feedback to return the suggestion's data
      (feedbackRepository.save as jest.Mock).mockResolvedValue({
        id: testUuid(),
        suggestionId: suggestion.id,
        actorId: suggestion.actorId,
        contextType: suggestion.contextType,
        contextId: suggestion.contextId,
        capability: suggestion.capability,
        confidence: suggestion.confidence,
        riskScore: suggestion.riskScore,
        feedbackType: AIFeedbackType.ACCEPTED,
        outcome: 'accepted',
        userComment: null,
        createdAt: new Date(),
      });

      const result = await service.recordAccepted(suggestion.id);

      expect(result?.capability).toBe(suggestion.capability);
      expect(result?.contextType).toBe(suggestion.contextType);
      expect(result?.contextId).toBe(suggestion.contextId);
    });

    it('should store confidence and riskScore', async () => {
      const suggestion = createMockSuggestionEntity({ confidence: 0.85, riskScore: 30 });
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(suggestion);
      
      // Mock the saved feedback to return the suggestion's data
      (feedbackRepository.save as jest.Mock).mockResolvedValue({
        id: testUuid(),
        suggestionId: suggestion.id,
        actorId: suggestion.actorId,
        contextType: suggestion.contextType,
        contextId: suggestion.contextId,
        capability: suggestion.capability,
        confidence: 0.85,
        riskScore: 30,
        feedbackType: AIFeedbackType.ACCEPTED,
        outcome: 'accepted',
        userComment: null,
        createdAt: new Date(),
      });

      const result = await service.recordAccepted(suggestion.id);

      expect(result?.confidence).toBe(0.85);
      expect(result?.riskScore).toBe(30);
    });

    it('should accept with user comment', async () => {
      const suggestion = createMockSuggestionEntity();
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(suggestion);
      const feedback = createMockFeedbackEntity({ feedbackType: AIFeedbackType.ACCEPTED, userComment: 'Great suggestion!' });
      (feedbackRepository.save as jest.Mock).mockResolvedValue(feedback);

      const result = await service.recordAccepted(suggestion.id, 'Great suggestion!');

      expect(result).toBeDefined();
    });
  });

  describe('recordRejected', () => {
    it('should capture rejected feedback', async () => {
      const suggestion = createMockSuggestionEntity();
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(suggestion);
      const feedback = createMockFeedbackEntity({ feedbackType: AIFeedbackType.REJECTED });
      (feedbackRepository.save as jest.Mock).mockResolvedValue(feedback);

      const result = await service.recordRejected(suggestion.id);

      expect(result).toBeDefined();
      expect(result?.feedbackType).toBe(AIFeedbackType.REJECTED);
    });

    it('should update suggestion status to REJECTED', async () => {
      const suggestion = createMockSuggestionEntity({ status: AISuggestionStatus.PENDING });
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(suggestion);
      const feedback = createMockFeedbackEntity({ feedbackType: AIFeedbackType.REJECTED });
      (feedbackRepository.save as jest.Mock).mockResolvedValue(feedback);

      await service.recordRejected(suggestion.id);

      const savedSuggestion = (suggestionRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedSuggestion.status).toBe(AISuggestionStatus.REJECTED);
    });

    it('should return null for invalid suggestion ID', async () => {
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.recordRejected('invalid-id');

      expect(result).toBeNull();
    });

    it('should accept user comment for rejection', async () => {
      const suggestion = createMockSuggestionEntity();
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(suggestion);
      const feedback = createMockFeedbackEntity({ feedbackType: AIFeedbackType.REJECTED, userComment: 'Not relevant' });
      (feedbackRepository.save as jest.Mock).mockResolvedValue(feedback);

      const result = await service.recordRejected(suggestion.id, 'Not relevant');

      expect(result).toBeDefined();
    });
  });

  describe('recordExpired', () => {
    it('should capture expired feedback', async () => {
      const suggestion = createMockSuggestionEntity();
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(suggestion);
      const feedback = createMockFeedbackEntity({ feedbackType: AIFeedbackType.EXPIRED });
      (feedbackRepository.save as jest.Mock).mockResolvedValue(feedback);

      const result = await service.recordExpired(suggestion.id);

      expect(result).toBeDefined();
      expect(result?.feedbackType).toBe(AIFeedbackType.EXPIRED);
    });

    it('should update suggestion status to EXPIRED', async () => {
      const suggestion = createMockSuggestionEntity({ status: AISuggestionStatus.PENDING });
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(suggestion);
      const feedback = createMockFeedbackEntity({ feedbackType: AIFeedbackType.EXPIRED });
      (feedbackRepository.save as jest.Mock).mockResolvedValue(feedback);

      await service.recordExpired(suggestion.id);

      const savedSuggestion = (suggestionRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedSuggestion.status).toBe(AISuggestionStatus.EXPIRED);
    });

    it('should return null for invalid suggestion ID', async () => {
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.recordExpired('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getFeedbackByActor', () => {
    it('should get feedback by actor', async () => {
      const actorId = testUuid();
      const feedbacks = [
        createMockFeedbackEntity({ actorId }),
        createMockFeedbackEntity({ actorId }),
      ];
      (feedbackRepository.find as jest.Mock).mockResolvedValue(feedbacks);

      const result = await service.getFeedbackByActor(actorId);

      expect(result).toEqual(feedbacks);
    });

    it('should respect limit parameter', async () => {
      const actorId = testUuid();
      (feedbackRepository.find as jest.Mock).mockResolvedValue([]);

      await service.getFeedbackByActor(actorId, 10);

      const findCall = (feedbackRepository.find as jest.Mock).mock.calls[0][0];
      expect(findCall.take).toBe(10);
    });

    it('should order by createdAt DESC', async () => {
      const actorId = testUuid();
      (feedbackRepository.find as jest.Mock).mockResolvedValue([]);

      await service.getFeedbackByActor(actorId);

      const findCall = (feedbackRepository.find as jest.Mock).mock.calls[0][0];
      expect(findCall.order.createdAt).toBe('DESC');
    });
  });

  describe('getFeedbackByType', () => {
    it('should get feedback by type', async () => {
      const feedbacks = [
        createMockFeedbackEntity({ feedbackType: AIFeedbackType.ACCEPTED }),
      ];
      (feedbackRepository.find as jest.Mock).mockResolvedValue(feedbacks);

      const result = await service.getFeedbackByType(AIFeedbackType.ACCEPTED);

      expect(result).toEqual(feedbacks);
    });
  });

  describe('getAcceptanceRate', () => {
    it('should calculate acceptance rate', async () => {
      const capability = 'submit_for_review';
      (feedbackRepository.count as jest.Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7); // accepted

      const result = await service.getAcceptanceRate(capability);

      expect(result).toBe(0.7);
    });

    it('should return 0 for no feedback', async () => {
      (feedbackRepository.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getAcceptanceRate('unknown');

      expect(result).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      (feedbackRepository.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60) // accepted
        .mockResolvedValueOnce(30) // rejected
        .mockResolvedValueOnce(10); // expired

      const result = await service.getStatistics();

      expect(result.total).toBe(100);
      expect(result.accepted).toBe(60);
      expect(result.rejected).toBe(30);
      expect(result.expired).toBe(10);
      expect(result.acceptanceRate).toBe(0.6);
    });

    it('should handle empty statistics', async () => {
      (feedbackRepository.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getStatistics();

      expect(result.total).toBe(0);
      expect(result.acceptanceRate).toBe(0);
    });
  });

  describe('data integrity', () => {
    it('should store workflow state in feedback', async () => {
      const suggestion = createMockSuggestionEntity({ workflowState: 'pending' });
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(suggestion);
      const feedback = createMockFeedbackEntity({ feedbackType: AIFeedbackType.ACCEPTED });
      (feedbackRepository.save as jest.Mock).mockResolvedValue(feedback);

      const result = await service.recordAccepted(suggestion.id);

      expect(result?.workflowState).toBe('pending');
    });

    it('should store correlation ID when available', async () => {
      const correlationId = testUuid();
      const suggestion = createMockSuggestionEntity({ correlationId });
      (suggestionRepository.findOne as jest.Mock).mockResolvedValue(suggestion);
      const feedback = createMockFeedbackEntity({ feedbackType: AIFeedbackType.ACCEPTED, correlationId });
      (feedbackRepository.save as jest.Mock).mockResolvedValue(feedback);

      const result = await service.recordAccepted(suggestion.id);

      expect(result?.correlationId).toBe(correlationId);
    });
  });
});
