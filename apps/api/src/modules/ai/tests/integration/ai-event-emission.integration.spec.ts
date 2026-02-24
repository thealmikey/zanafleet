import { Test, TestingModule } from '@nestjs/testing';

import { AIEventListenerService } from '../../services/ai-event-listener.service';
import { AISuggestionStoreService } from '../../services/ai-suggestion-store.service';
import { AIRiskAnalyzerService } from '../../services/ai-risk-analyzer.service';
import { EventBusService } from '@api/core/event-bus';
import { AISuggestionGeneratedEventV1 } from '../../events/ai-suggestion-generated.event';
import { AIHangingStateDetectedEventV1 } from '../../events/ai-hanging-state-detected.event';
import { AIRiskAnalyzedEventV1, AIRiskFactor } from '../../events/ai-risk-analyzed.event';
import { testUuid, createMockSuggestionEntity, createPastDate } from '../utils/test-helpers';

/**
 * Integration tests for AI Event Emission
 * These tests verify the event emission flow and payload structure
 */
describe('AI Event Emission Integration', () => {
  let suggestionStore: jest.Mocked<AISuggestionStoreService>;
  let riskAnalyzer: jest.Mocked<AIRiskAnalyzerService>;

  beforeEach(async () => {
    const mockSuggestionStore = {
      createSuggestion: jest.fn(),
    };

    const mockRiskAnalyzer = {
      analyzeRisk: jest.fn().mockResolvedValue({
        riskScore: 25,
        riskFactors: [{ factor: 'test', weight: 0.25, description: 'Test' }],
        analysisTimestamp: new Date(),
      }),
    };

    const mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIEventListenerService,
        { provide: AISuggestionStoreService, useValue: mockSuggestionStore },
        { provide: AIRiskAnalyzerService, useValue: mockRiskAnalyzer },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    // Module is created for dependency injection setup
    // Services are created fresh in each test for isolation
    suggestionStore = module.get(AISuggestionStoreService);
    riskAnalyzer = module.get(AIRiskAnalyzerService);
  });

  describe('AI.Suggestion.GeneratedV1 Event', () => {
    it('should emit AI.Suggestion.GeneratedV1 with correct structure', async () => {
      const suggestion = createMockSuggestionEntity();
      suggestionStore.createSuggestion.mockResolvedValue(suggestion as any);

      const service = new AIEventListenerService(suggestionStore, riskAnalyzer);
      const result = await service.generateSuggestion({
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
      });

      expect(result).toBeInstanceOf(AISuggestionGeneratedEventV1);
      expect(result?.eventType).toBe('AISuggestionGeneratedEvent-V1');
    });

    it('should include all required fields in event', async () => {
      const suggestion = createMockSuggestionEntity();
      suggestionStore.createSuggestion.mockResolvedValue(suggestion as any);

      const service = new AIEventListenerService(suggestionStore, riskAnalyzer);
      const result = await service.generateSuggestion({
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
      });

      expect(result?.eventId).toBeDefined();
      expect(result?.aggregateId).toBeDefined();
      expect(result?.actorId).toBeDefined();
      expect(result?.suggestionId).toBeDefined();
      expect(result?.contextType).toBeDefined();
      expect(result?.contextId).toBeDefined();
      expect(result?.workflowState).toBeDefined();
      expect(result?.capability).toBeDefined();
      expect(result?.reason).toBeDefined();
      expect(result?.confidence).toBeDefined();
    });

    it('should include riskScore in event', async () => {
      const suggestion = createMockSuggestionEntity({ riskScore: 30 });
      suggestionStore.createSuggestion.mockResolvedValue(suggestion as any);

      const service = new AIEventListenerService(suggestionStore, riskAnalyzer);
      const result = await service.generateSuggestion({
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
      });

      expect(result?.riskScore).toBe(30);
    });

    it('should include expiresAt in event', async () => {
      const suggestion = createMockSuggestionEntity({ expiresAt: new Date(Date.now() + 86400000) });
      suggestionStore.createSuggestion.mockResolvedValue(suggestion as any);

      const service = new AIEventListenerService(suggestionStore, riskAnalyzer);
      const result = await service.generateSuggestion({
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
      });

      expect(result?.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('Event Payload Structure Validation', () => {
    it('should have correct eventType format', async () => {
      const suggestion = createMockSuggestionEntity();
      suggestionStore.createSuggestion.mockResolvedValue(suggestion as any);

      const service = new AIEventListenerService(suggestionStore, riskAnalyzer);
      const result = await service.generateSuggestion({
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
      });

      expect(result?.eventType).toMatch(/^AISuggestionGeneratedEvent-V\d+$/);
    });

    it('should have correct eventVersion format', async () => {
      const suggestion = createMockSuggestionEntity();
      suggestionStore.createSuggestion.mockResolvedValue(suggestion as any);

      const service = new AIEventListenerService(suggestionStore, riskAnalyzer);
      const result = await service.generateSuggestion({
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
      });

      expect(result?.eventVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Correlation ID Propagation', () => {
    it('should propagate correlation ID', async () => {
      const correlationId = testUuid();
      const suggestion = createMockSuggestionEntity();
      suggestionStore.createSuggestion.mockResolvedValue(suggestion as any);

      const service = new AIEventListenerService(suggestionStore, riskAnalyzer);
      const result = await service.generateSuggestion({
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        correlationId,
      });

      expect(result?.correlationId).toBe(correlationId);
    });

    it('should propagate causation ID', async () => {
      const causationId = testUuid();
      const suggestion = createMockSuggestionEntity();
      suggestionStore.createSuggestion.mockResolvedValue(suggestion as any);

      const service = new AIEventListenerService(suggestionStore, riskAnalyzer);
      const result = await service.generateSuggestion({
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        causationId,
      });

      expect(result?.causationId).toBe(causationId);
    });

    it('should handle nested correlation chains', async () => {
      const correlationId = testUuid();
      const causationId = testUuid();
      const suggestion = createMockSuggestionEntity();
      suggestionStore.createSuggestion.mockResolvedValue(suggestion as any);

      const service = new AIEventListenerService(suggestionStore, riskAnalyzer);
      const result = await service.generateSuggestion({
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        correlationId,
        causationId,
      });

      expect(result?.correlationId).toBe(correlationId);
      expect(result?.causationId).toBe(causationId);
    });
  });

  describe('AI.HangingState.DetectedV1 Event', () => {
    it('should create event with correct structure', () => {
      const event = new AIHangingStateDetectedEventV1({
        eventId: testUuid(),
        aggregateId: testUuid(),
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        stateEnteredAt: createPastDate(10),
        durationMs: 600000,
        expectedDurationMs: 300000,
      });

      expect(event.eventType).toBe('AIHangingStateDetectedEvent-V1');
      expect(event.durationMs).toBe(600000);
      expect(event.expectedDurationMs).toBe(300000);
    });

    it('should calculate severity ratio correctly', () => {
      const event = new AIHangingStateDetectedEventV1({
        eventId: testUuid(),
        aggregateId: testUuid(),
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        stateEnteredAt: createPastDate(10),
        durationMs: 600000,
        expectedDurationMs: 300000,
      });

      expect(event.getSeverityRatio()).toBe(2);
    });
  });

  describe('AIRiskAnalyzedEventV1', () => {
    it('should create event with risk factors', () => {
      const event = new AIRiskAnalyzedEventV1({
        eventId: testUuid(),
        aggregateId: testUuid(),
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        capability: 'submit_for_review',
        riskScore: 35,
        riskFactors: [
          new AIRiskFactor({
            factor: 'capability_confidence',
            weight: 0.25,
            description: 'Confidence: 75%',
          }),
        ],
        confidence: 0.75,
      });

      expect(event.riskScore).toBe(35);
      expect(event.riskFactors.length).toBe(1);
    });

    it('should serialize correctly', () => {
      const event = new AIRiskAnalyzedEventV1({
        eventId: testUuid(),
        aggregateId: testUuid(),
        actorId: testUuid(),
        contextType: 'workflow',
        contextId: testUuid(),
        workflowState: 'pending',
        capability: 'submit_for_review',
        riskScore: 35,
        riskFactors: [new AIRiskFactor({ factor: 'test', weight: 0.25, description: 'Test' })],
        confidence: 0.75,
      });

      const json = event.toJSON();
      expect(json.riskScore).toBe(35);
    });
  });
});
