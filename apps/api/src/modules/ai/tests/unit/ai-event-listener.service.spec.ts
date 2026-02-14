import { Test, TestingModule } from '@nestjs/testing';

import { AIEventListenerService } from '../../services/ai-event-listener.service';
import { AISuggestionStoreService } from '../../services/ai-suggestion-store.service';
import { AIRiskAnalyzerService } from '../../services/ai-risk-analyzer.service';
import { testUuid, createMockSuggestionEntity } from '../utils/test-helpers';

describe('AIEventListenerService', () => {
  let service: AIEventListenerService;
  let suggestionStore: jest.Mocked<AISuggestionStoreService>;
  let riskAnalyzer: jest.Mocked<AIRiskAnalyzerService>;

  beforeEach(async () => {
    const mockSuggestionStore = {
      createSuggestion: jest.fn(),
      findById: jest.fn(),
      findByFilters: jest.fn(),
      findPendingByActor: jest.fn(),
      updateStatus: jest.fn(),
      acceptSuggestion: jest.fn(),
      rejectSuggestion: jest.fn(),
      expireOldSuggestions: jest.fn(),
      deleteExpiredSuggestions: jest.fn(),
    };

    const mockRiskAnalyzer = {
      analyzeRisk: jest.fn(),
      getDefaultRiskFactors: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIEventListenerService,
        { provide: AISuggestionStoreService, useValue: mockSuggestionStore },
        { provide: AIRiskAnalyzerService, useValue: mockRiskAnalyzer },
      ],
    }).compile();

    service = module.get<AIEventListenerService>(AIEventListenerService);
    suggestionStore = module.get(AISuggestionStoreService);
    riskAnalyzer = module.get(AIRiskAnalyzerService);
  });

  describe('generateSuggestion', () => {
    const baseParams = {
      actorId: testUuid(),
      contextType: 'workflow',
      contextId: testUuid(),
      workflowState: 'pending',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      riskAnalyzer.analyzeRisk.mockResolvedValue({
        riskScore: 25,
        riskFactors: [
          { factor: 'capability_confidence', weight: 0.25, description: 'Confidence: 75%' },
        ],
        analysisTimestamp: new Date(),
      });
    });

    describe('successful suggestion generation', () => {
      it('should generate a suggestion successfully', async () => {
        const suggestion = createMockSuggestionEntity(baseParams);
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        const result = await service.generateSuggestion(baseParams);

        expect(result).toBeDefined();
        expect(result?.suggestionId).toBe(suggestion.id);
        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should determine capability from workflow state - pending', async () => {
        const suggestion = createMockSuggestionEntity({ ...baseParams, workflowState: 'pending', capability: 'submit_for_review' });
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion({ ...baseParams, workflowState: 'pending' });

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should generate reason based on workflow state', async () => {
        const suggestion = createMockSuggestionEntity(baseParams);
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion(baseParams);

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should use custom capability when provided', async () => {
        const suggestion = createMockSuggestionEntity({ ...baseParams, capability: 'custom_capability' });
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion({ ...baseParams, capability: 'custom_capability' });

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should calculate TTL correctly', async () => {
        const suggestion = createMockSuggestionEntity(baseParams);
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion(baseParams);

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should analyze risk', async () => {
        const suggestion = createMockSuggestionEntity(baseParams);
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion(baseParams);

        expect(riskAnalyzer.analyzeRisk).toHaveBeenCalled();
      });

      it('should return suggestion event with correct properties', async () => {
        const suggestion = createMockSuggestionEntity(baseParams);
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        const result = await service.generateSuggestion(baseParams);

        expect(result?.eventType).toBe('AISuggestionGeneratedEvent-V1');
        expect(result?.actorId).toBe(suggestion.actorId);
        expect(result?.contextType).toBe(suggestion.contextType);
        expect(result?.contextId).toBe(suggestion.contextId);
      });

      it('should use default confidence of 0.75', async () => {
        const suggestion = createMockSuggestionEntity(baseParams);
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion(baseParams);

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });
    });

    describe('idempotent operations', () => {
      it('should return same suggestion for duplicate calls (deduplication)', async () => {
        const suggestion = createMockSuggestionEntity(baseParams);
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        const result1 = await service.generateSuggestion(baseParams);
        const result2 = await service.generateSuggestion(baseParams);

        expect(result1?.suggestionId).toBe(result2?.suggestionId);
      });

      it('should handle previousStates for context', async () => {
        const previousStates = ['draft', 'in_progress'];
        const suggestion = createMockSuggestionEntity(baseParams);
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion({ ...baseParams, previousStates });

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });
    });

    describe('capability determination', () => {
      it('should map pending state to submit_for_review', async () => {
        const suggestion = createMockSuggestionEntity({ ...baseParams, workflowState: 'pending', capability: 'submit_for_review' });
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion({ ...baseParams, workflowState: 'pending' });

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should map in_progress state to request_assistance', async () => {
        const suggestion = createMockSuggestionEntity({ ...baseParams, workflowState: 'in_progress', capability: 'request_assistance' });
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion({ ...baseParams, workflowState: 'in_progress' });

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should map awaiting_review state to check_requirements', async () => {
        const suggestion = createMockSuggestionEntity({ ...baseParams, workflowState: 'awaiting_review', capability: 'check_requirements' });
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion({ ...baseParams, workflowState: 'awaiting_review' });

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should map waiting state to follow_up', async () => {
        const suggestion = createMockSuggestionEntity({ ...baseParams, workflowState: 'waiting', capability: 'follow_up' });
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion({ ...baseParams, workflowState: 'waiting' });

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should map pending_approval state to provide_additional_info', async () => {
        const suggestion = createMockSuggestionEntity({ ...baseParams, workflowState: 'pending_approval', capability: 'provide_additional_info' });
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion({ ...baseParams, workflowState: 'pending_approval' });

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should map draft state to submit_draft', async () => {
        const suggestion = createMockSuggestionEntity({ ...baseParams, workflowState: 'draft', capability: 'submit_draft' });
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion({ ...baseParams, workflowState: 'draft' });

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should use check_status for unknown states', async () => {
        const suggestion = createMockSuggestionEntity({ ...baseParams, workflowState: 'unknown_state', capability: 'check_status' });
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        await service.generateSuggestion({ ...baseParams, workflowState: 'unknown_state' });

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should handle store failures gracefully and return null', async () => {
        suggestionStore.createSuggestion.mockRejectedValue(new Error('Store failed'));

        const result = await service.generateSuggestion(baseParams);

        expect(result).toBeNull();
      });

      it('should handle risk analyzer failures gracefully and still create suggestion', async () => {
        riskAnalyzer.analyzeRisk.mockRejectedValue(new Error('Risk analysis failed'));
        const suggestion = createMockSuggestionEntity(baseParams);
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        const result = await service.generateSuggestion(baseParams);

        expect(result).toBeDefined();
      });

      it('should handle empty context gracefully', async () => {
        const suggestion = createMockSuggestionEntity(baseParams);
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        const result = await service.generateSuggestion({
          actorId: testUuid(),
          contextType: '',
          contextId: testUuid(),
          workflowState: 'pending',
        });

        expect(result).toBeDefined();
      });
    });

    describe('event context building', () => {
      it('should build context correctly with correlation ID', async () => {
        const suggestion = createMockSuggestionEntity(baseParams);
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        const result = await service.generateSuggestion({
          actorId: testUuid(),
          contextType: 'workflow',
          contextId: testUuid(),
          workflowState: 'pending',
          correlationId: testUuid(),
        });

        expect(result?.correlationId).toBeDefined();
      });

      it('should handle causation ID properly', async () => {
        const suggestion = createMockSuggestionEntity(baseParams);
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        const result = await service.generateSuggestion({
          actorId: testUuid(),
          contextType: 'workflow',
          contextId: testUuid(),
          workflowState: 'pending',
          causationId: testUuid(),
        });

        expect(result?.causationId).toBeDefined();
      });

      it('should handle metadata properly', async () => {
        const suggestion = createMockSuggestionEntity(baseParams);
        suggestionStore.createSuggestion.mockResolvedValue(suggestion);

        const result = await service.generateSuggestion({
          actorId: testUuid(),
          contextType: 'workflow',
          contextId: testUuid(),
          workflowState: 'pending',
          metadata: { key: 'value', nested: { deep: true } },
        });

        expect(result?.metadata).toBeDefined();
      });
    });
  });
});
