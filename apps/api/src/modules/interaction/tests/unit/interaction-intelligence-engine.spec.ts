import {
  InteractionEventEntity,
  InteractionEventType,
  InteractionActorType,
} from '../../entities/interaction-event.entity';
import {
  InteractionStreamEntity,
  InteractionStreamState,
  InteractionContextType,
} from '../../entities/interaction-stream.entity';
import {
  InteractionIntelligenceContext,
  IntentType,
  SentimentType,
  AIActionType,
} from '../../intelligence/interaction-intelligence-context';
import {
  InteractionIntelligenceEngine,
  INTELLIGENCE_ENGINE_VERSION,
} from '../../intelligence/interaction-intelligence-engine';

describe('InteractionIntelligenceEngine', () => {
  let engine: InteractionIntelligenceEngine;

  beforeEach(() => {
    // Create engine with lower threshold to trigger workflows at lower confidence
    engine = new InteractionIntelligenceEngine({
      minConfidenceThreshold: 0.5,
    });
  });

  describe('Version', () => {
    it('should have a version number', () => {
      expect(INTELLIGENCE_ENGINE_VERSION).toBe('1.0.0');
    });
  });

  describe('analyze', () => {
    it('should return no-action recommendation when no current event', async () => {
      const context = createMockContext({ hasCurrentEvent: false });
      const result = await engine.analyze(context);

      expect(result.action).toBe(AIActionType.RESPOND);
      expect(result.confidenceScore).toBe(1.0);
    });

    it('should detect CREATE_ORDER intent from message', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'I want to book a move for tomorrow',
      });
      const result = await engine.analyze(context);

      expect(result.intentDetected?.intent).toBe(IntentType.CREATE_ORDER);
      expect(result.intentDetected?.confidence).toBeGreaterThan(0.5);
    });

    it('should detect CHECK_STATUS intent from message', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'Where is my order? I want to track the delivery',
      });
      const result = await engine.analyze(context);

      expect(result.intentDetected?.intent).toBe(IntentType.CHECK_STATUS);
    });

    it('should detect CANCEL_ORDER intent from message', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'I need to cancel my order please',
      });
      const result = await engine.analyze(context);

      expect(result.intentDetected?.intent).toBe(IntentType.CANCEL_ORDER);
    });

    it('should detect GET_SUPPORT intent from message', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'I need help with my delivery issue',
      });
      const result = await engine.analyze(context);

      expect(result.intentDetected?.intent).toBe(IntentType.GET_SUPPORT);
    });

    it('should detect GET_ESTIMATE intent from message', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'Can you give me a quote for moving?',
      });
      const result = await engine.analyze(context);

      expect(result.intentDetected?.intent).toBe(IntentType.GET_ESTIMATE);
    });

    it('should detect positive sentiment', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'Thank you so much! Great service, I really appreciate it!',
      });
      const result = await engine.analyze(context);

      expect(result.sentimentAnalysis?.sentiment).toBe(SentimentType.POSITIVE);
      expect(result.sentimentAnalysis?.confidence).toBeGreaterThan(0.6);
    });

    it('should detect negative sentiment', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'This is terrible, I am very frustrated with the awful service',
      });
      const result = await engine.analyze(context);

      // With 3 negative keywords, FRUSTRATED is expected
      expect(result.sentimentAnalysis?.sentiment).toBe(SentimentType.FRUSTRATED);
    });

    it('should detect frustrated sentiment with strong negative keywords', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message:
          'This is unacceptable! I am completely frustrated and angry with this useless service',
      });
      const result = await engine.analyze(context);

      expect(result.sentimentAnalysis?.sentiment).toBe(SentimentType.FRUSTRATED);
    });

    it('should detect neutral sentiment', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'What are your business hours?',
      });
      const result = await engine.analyze(context);

      expect(result.sentimentAnalysis?.sentiment).toBe(SentimentType.NEUTRAL);
    });

    it('should trigger escalation on frustrated sentiment', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'This is ridiculous! I want to speak to a manager immediately',
      });
      const result = await engine.analyze(context);

      expect(result.shouldEscalate).toBe(true);
    });

    it('should trigger escalation on escalation keywords', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'I want to escalate this to the CEO',
      });
      const result = await engine.analyze(context);

      expect(result.shouldEscalate).toBe(true);
    });

    it('should trigger workflow for CREATE_ORDER intent', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'I want to create a new order for moving',
      });
      const result = await engine.analyze(context);

      expect(result.shouldTriggerWorkflow).toBe(true);
      expect(result.workflowType).toBe('CREATE_ORDER');
    });

    it('should trigger workflow for CANCEL_ORDER intent', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'Please cancel my order #12345',
      });
      const result = await engine.analyze(context);

      expect(result.shouldTriggerWorkflow).toBe(true);
      expect(result.workflowType).toBe('CANCEL_ORDER');
    });

    it('should trigger workflow for GET_SUPPORT intent', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'I need support for my delivery problem',
      });
      const result = await engine.analyze(context);

      expect(result.shouldTriggerWorkflow).toBe(true);
      expect(result.workflowType).toBe('CREATE_SUPPORT_TICKET');
    });

    it('should generate appropriate response for CREATE_ORDER', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'I want to book a move',
      });
      const result = await engine.analyze(context);

      expect(result.response).toBeDefined();
      expect(result.response?.message).toContain('order');
      expect(result.response?.suggestedActions).toBeDefined();
    });

    it('should generate appropriate response for CHECK_STATUS', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'Where is my delivery?',
      });
      const result = await engine.analyze(context);

      expect(result.response).toBeDefined();
      expect(result.response?.message).toContain('status');
    });

    it('should not process non-human events', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.SYSTEM_NOTIFICATION,
        message: 'Order has been delivered',
      });
      const result = await engine.analyze(context);

      expect(result.intentDetected).toBeUndefined();
      expect(result.sentimentAnalysis).toBeUndefined();
    });

    it('should include reasoning steps in recommendation', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'I need help',
      });
      const result = await engine.analyze(context);

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should handle Slack messages', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.SLACK_MESSAGE,
        message: 'Can I get a quote?',
      });
      const result = await engine.analyze(context);

      expect(result.intentDetected).toBeDefined();
      expect(result.intentDetected?.intent).toBe(IntentType.GET_ESTIMATE);
    });

    it('should handle Ticket responses', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.TICKET_RESPONSE,
        message: 'I want to change my delivery address',
      });
      const result = await engine.analyze(context);

      expect(result.intentDetected).toBeDefined();
      expect(result.intentDetected?.intent).toBe(IntentType.MODIFY_ORDER);
    });
  });

  describe('extractEntities', () => {
    it('should extract order ID from message', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'What is the status of order #12345?',
      });
      const result = await engine.analyze(context);

      expect(result.intentDetected?.entities.orderId).toBeDefined();
    });

    it('should extract phone number from message', async () => {
      const context = createMockContext({
        eventType: InteractionEventType.HUMAN_MESSAGE,
        message: 'Call me at +254712345678',
      });
      const result = await engine.analyze(context);

      expect(result.intentDetected?.entities.phone).toBeDefined();
    });
  });
});

/**
 * Helper function to create mock context for testing
 */
function createMockContext(options: {
  hasCurrentEvent?: boolean;
  eventType?: InteractionEventType;
  message?: string;
}): InteractionIntelligenceContext {
  const mockStream: InteractionStreamEntity = {
    id: 'stream-123',
    contextType: InteractionContextType.ORDER,
    contextId: 'order-456',
    state: InteractionStreamState.ACTIVE,
    metadata: {},
    participantIds: ['user-1', 'user-2'],
    createdAt: new Date(),
    updatedAt: new Date(),
    events: [],
    hasParticipant: () => true,
    addParticipant: () => {},
    archive: () => {},
    close: () => {},
  };

  const mockEvent: InteractionEventEntity | undefined =
    options.hasCurrentEvent !== false
      ? {
          id: 'event-123',
          streamId: 'stream-123',
          actorId: 'user-1',
          actorType: InteractionActorType.USER,
          eventType: options.eventType || InteractionEventType.HUMAN_MESSAGE,
          payload: {
            message: options.message || 'Hello',
          },
          createdAt: new Date(),
          stream: mockStream,
          getEventTypeDisplayName: () => 'Human Message',
          isHumanEvent: () => true,
          isAIEvent: () => false,
          isExternalEvent: () => false,
          isSystemEvent: () => false,
        }
      : undefined;

  return {
    stream: mockStream,
    recentEvents: mockEvent ? [mockEvent] : [],
    participantIds: ['user-1'],
    contextType: InteractionContextType.ORDER,
    contextId: 'order-456',
    currentEvent: mockEvent,
    metadata: {},
    builtAt: new Date(),
  };
}
