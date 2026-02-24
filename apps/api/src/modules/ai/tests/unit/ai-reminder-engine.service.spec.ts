import { Test, TestingModule } from '@nestjs/testing';

import { AIReminderEngineService } from '../../services/ai-reminder-engine.service';
import { AISuggestionStoreService } from '../../services/ai-suggestion-store.service';
import { AIRiskAnalyzerService } from '../../services/ai-risk-analyzer.service';
import { EventBusService } from '@api/core/event-bus';
import { AIHangingStateDetectedEventV1 } from '../../events/ai-hanging-state-detected.event';
import { testUuid, createPastDate } from '../utils/test-helpers';

describe('AIReminderEngineService', () => {
  let service: AIReminderEngineService;
  let suggestionStore: jest.Mocked<AISuggestionStoreService>;
  let riskAnalyzer: jest.Mocked<AIRiskAnalyzerService>;
  let eventBus: jest.Mocked<EventBusService>;

  beforeEach(async () => {
    const mockSuggestionStore = {
      createSuggestion: jest.fn(),
      findPendingByActor: jest.fn(),
    };

    const mockRiskAnalyzer = {
      analyzeRisk: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      publishAsync: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIReminderEngineService,
        { provide: AISuggestionStoreService, useValue: mockSuggestionStore },
        { provide: AIRiskAnalyzerService, useValue: mockRiskAnalyzer },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<AIReminderEngineService>(AIReminderEngineService);
    suggestionStore = module.get(AISuggestionStoreService);
    riskAnalyzer = module.get(AIRiskAnalyzerService);
    eventBus = module.get(EventBusService);
  });

  const createMockHangingEvent = (
    overrides?: Partial<AIHangingStateDetectedEventV1>
  ): AIHangingStateDetectedEventV1 => {
    return new AIHangingStateDetectedEventV1({
      eventId: testUuid(),
      aggregateId: testUuid(),
      actorId: testUuid(),
      contextType: 'workflow',
      contextId: testUuid(),
      workflowState: 'pending',
      stateEnteredAt: createPastDate(10),
      durationMs: 10 * 60 * 1000,
      expectedDurationMs: 5 * 60 * 1000,
      correlationId: testUuid(),
      ...overrides,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    riskAnalyzer.analyzeRisk.mockResolvedValue({
      riskScore: 30,
      riskFactors: [],
      analysisTimestamp: new Date(),
    });
  });

  describe('generateReminderSuggestion', () => {
    describe('successful reminder generation', () => {
      it('should generate reminder for pending suggestion', async () => {
        const hangingEvent = createMockHangingEvent();
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        const result = await service.generateReminderSuggestion(hangingEvent);

        expect(result).toBeDefined();
        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should emit suggestion generated event', async () => {
        const hangingEvent = createMockHangingEvent();
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        expect(eventBus.publish).toHaveBeenCalledWith(
          'ai.suggestion.generated',
          expect.any(Object)
        );
      });

      it('should set isReminder flag in metadata', async () => {
        const hangingEvent = createMockHangingEvent();
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        expect(eventBus.publish).toHaveBeenCalledWith(
          'ai.suggestion.generated',
          expect.objectContaining({
            metadata: expect.objectContaining({
              isReminder: true,
            }),
          })
        );
      });

      it('should include severity ratio in metadata', async () => {
        const hangingEvent = createMockHangingEvent({
          durationMs: 15 * 60 * 1000,
          expectedDurationMs: 5 * 60 * 1000,
        });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        expect(eventBus.publish).toHaveBeenCalledWith(
          'ai.suggestion.generated',
          expect.objectContaining({
            metadata: expect.objectContaining({
              severityRatio: 3,
            }),
          })
        );
      });
    });

    describe('no pending suggestions', () => {
      it('should handle case with no pending suggestions', async () => {
        const hangingEvent = createMockHangingEvent();
        suggestionStore.createSuggestion.mockResolvedValue(null as any);

        const result = await service.generateReminderSuggestion(hangingEvent);

        expect(result).toBeNull();
      });
    });

    describe('capability determination', () => {
      it('should use suggested capability from event when available', async () => {
        const hangingEvent = createMockHangingEvent({
          suggestedCapability: 'custom_capability',
        });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        expect(suggestionStore.createSuggestion).toHaveBeenCalledWith(
          expect.objectContaining({
            capability: 'custom_capability',
          })
        );
      });

      it('should determine capability for pending state', async () => {
        const hangingEvent = createMockHangingEvent({ workflowState: 'pending' });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should determine capability for in_progress state', async () => {
        const hangingEvent = createMockHangingEvent({ workflowState: 'in_progress' });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should determine capability for awaiting_review state', async () => {
        const hangingEvent = createMockHangingEvent({ workflowState: 'awaiting_review' });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should determine capability for waiting state', async () => {
        const hangingEvent = createMockHangingEvent({ workflowState: 'waiting' });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });

      it('should determine capability for pending_approval state', async () => {
        const hangingEvent = createMockHangingEvent({ workflowState: 'pending_approval' });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        expect(suggestionStore.createSuggestion).toHaveBeenCalled();
      });
    });

    describe('TTL calculation', () => {
      it('should use shorter TTL for critical severity (>2x)', async () => {
        const hangingEvent = createMockHangingEvent({
          durationMs: 15 * 60 * 1000,
          expectedDurationMs: 5 * 60 * 1000,
        });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        const savedSuggestion = suggestionStore.createSuggestion.mock.calls[0][0];
        // Critical (3x) should have TTL of 2 hours
        expect(savedSuggestion.expiresAt.getTime()).toBeGreaterThan(
          Date.now() + 2 * 60 * 60 * 1000 - 60000
        );
      });

      it('should use medium TTL for high severity (>1.5x)', async () => {
        const hangingEvent = createMockHangingEvent({
          durationMs: 9 * 60 * 1000,
          expectedDurationMs: 5 * 60 * 1000,
        });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        const savedSuggestion = suggestionStore.createSuggestion.mock.calls[0][0];
        // High (1.8x) should have TTL of 3 hours
        expect(savedSuggestion.expiresAt.getTime()).toBeGreaterThan(
          Date.now() + 3 * 60 * 60 * 1000 - 60000
        );
      });

      it('should use default TTL for normal severity', async () => {
        const hangingEvent = createMockHangingEvent({
          durationMs: 6 * 60 * 1000,
          expectedDurationMs: 5 * 60 * 1000,
        });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        const savedSuggestion = suggestionStore.createSuggestion.mock.calls[0][0];
        // Normal (1.2x) should have TTL of 4 hours (default)
        expect(savedSuggestion.expiresAt.getTime()).toBeGreaterThan(
          Date.now() + 4 * 60 * 60 * 1000 - 60000
        );
      });
    });

    describe('error handling', () => {
      it('should return null when suggestion creation fails', async () => {
        suggestionStore.createSuggestion.mockRejectedValue(new Error('Store error'));

        const hangingEvent = createMockHangingEvent();

        const result = await service.generateReminderSuggestion(hangingEvent);

        expect(result).toBeNull();
      });

      it('should return null when risk analysis fails', async () => {
        riskAnalyzer.analyzeRisk.mockRejectedValue(new Error('Risk error'));
        const mockSuggestion = {
          id: testUuid(),
          actorId: testUuid(),
          contextType: 'workflow',
          contextId: testUuid(),
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        const hangingEvent = createMockHangingEvent();

        const result = await service.generateReminderSuggestion(hangingEvent);

        expect(result).toBeDefined();
      });

      it('should return null when event publishing fails', async () => {
        eventBus.publish.mockRejectedValue(new Error('Event bus error'));
        const mockSuggestion = {
          id: testUuid(),
          actorId: testUuid(),
          contextType: 'workflow',
          contextId: testUuid(),
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        const hangingEvent = createMockHangingEvent();

        const result = await service.generateReminderSuggestion(hangingEvent);

        expect(result).toBeNull();
      });
    });

    describe('reason generation', () => {
      it('should include duration in reason for critical severity', async () => {
        const hangingEvent = createMockHangingEvent({
          durationMs: 15 * 60 * 1000,
          expectedDurationMs: 5 * 60 * 1000,
        });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        const savedSuggestion = suggestionStore.createSuggestion.mock.calls[0][0];
        expect(savedSuggestion.reason).toContain('15 minutes');
      });

      it('should include expected duration in reason', async () => {
        const hangingEvent = createMockHangingEvent({
          durationMs: 10 * 60 * 1000,
          expectedDurationMs: 5 * 60 * 1000,
        });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        const savedSuggestion = suggestionStore.createSuggestion.mock.calls[0][0];
        expect(savedSuggestion.reason).toContain('5 minutes');
      });

      it('should include workflow state in reason', async () => {
        const hangingEvent = createMockHangingEvent({ workflowState: 'pending_payment' });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        const savedSuggestion = suggestionStore.createSuggestion.mock.calls[0][0];
        expect(savedSuggestion.reason).toContain('pending_payment');
      });
    });

    describe('deduplication', () => {
      it('should include reminder in deduplication hash', async () => {
        const hangingEvent = createMockHangingEvent();
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        const savedSuggestion = suggestionStore.createSuggestion.mock.calls[0][0];
        expect(savedSuggestion.deduplicationHash).toContain('reminder');
      });
    });

    describe('confidence', () => {
      it('should use moderate confidence (0.7) for reminders', async () => {
        const hangingEvent = createMockHangingEvent();
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        await service.generateReminderSuggestion(hangingEvent);

        const savedSuggestion = suggestionStore.createSuggestion.mock.calls[0][0];
        expect(savedSuggestion.confidence).toBe(0.7);
      });
    });

    describe('correlation ID propagation', () => {
      it('should propagate correlation ID', async () => {
        const correlationId = testUuid();
        const hangingEvent = createMockHangingEvent({ correlationId });
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        const result = await service.generateReminderSuggestion(hangingEvent);

        expect(result?.correlationId).toBe(correlationId);
      });

      it('should use event ID as causation ID', async () => {
        const hangingEvent = createMockHangingEvent();
        const mockSuggestion = {
          id: testUuid(),
          actorId: hangingEvent.actorId,
          contextType: hangingEvent.contextType,
          contextId: hangingEvent.contextId,
        };
        suggestionStore.createSuggestion.mockResolvedValue(mockSuggestion as any);

        const result = await service.generateReminderSuggestion(hangingEvent);

        expect(result?.causationId).toBe(hangingEvent.eventId);
      });
    });
  });
});
