import { Injectable, Logger } from '@nestjs/common';

import {
  InteractionIntelligenceContext,
  IntentType,
  SentimentType,
  AIActionType,
  ReasoningStep,
  IntentDetectionResult,
  SentimentAnalysisResult,
  AIRecommendation,
  AIResponse,
  InteractionIntelligenceConfig,
  DEFAULT_INTELLIGENCE_CONFIG,
} from './interaction-intelligence-context';

/**
 * Keywords for intent detection
 */
const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  [IntentType.CREATE_ORDER]: ['book', 'order', 'move', 'transport', 'ship', 'deliver', 'create'],
  [IntentType.CHECK_STATUS]: ['status', 'where', 'track', 'eta', 'arriving', 'progress', 'update'],
  [IntentType.CANCEL_ORDER]: ['cancel', 'stop', 'abort', 'terminate', 'undo'],
  [IntentType.MODIFY_ORDER]: ['change', 'modify', 'update', 'edit', 'reschedule', 'adjust'],
  [IntentType.MAKE_PAYMENT]: ['pay', 'payment', 'checkout', 'bill', 'invoice', 'charge'],
  [IntentType.GET_SUPPORT]: ['help', 'support', 'issue', 'problem', 'complaint', 'contact'],
  [IntentType.GET_ESTIMATE]: ['quote', 'estimate', 'price', 'cost', 'rate', 'pricing'],
  [IntentType.SCHEDULE_PICKUP]: ['pickup', 'schedule', 'time', 'date', 'appointment'],
  [IntentType.ASK_QUESTION]: ['what', 'how', 'when', 'where', 'why', 'question'],
  [IntentType.GIVE_FEEDBACK]: ['feedback', 'review', 'rating', 'experience', 'thoughts'],
  [IntentType.UNKNOWN]: [],
};

/**
 * Intent priority (higher = more preferred when scores are tied)
 * Used as secondary sort criterion
 */
const INTENT_PRIORITY: Record<IntentType, number> = {
  [IntentType.CREATE_ORDER]: 1,
  [IntentType.CHECK_STATUS]: 10,
  [IntentType.CANCEL_ORDER]: 8,
  [IntentType.MODIFY_ORDER]: 7,
  [IntentType.MAKE_PAYMENT]: 6,
  [IntentType.GET_SUPPORT]: 5,
  [IntentType.GET_ESTIMATE]: 4,
  [IntentType.SCHEDULE_PICKUP]: 3,
  [IntentType.ASK_QUESTION]: 2,
  [IntentType.GIVE_FEEDBACK]: 1,
  [IntentType.UNKNOWN]: 0,
};

/**
 * Frustrated sentiment keywords
 */
const NEGATIVE_KEYWORDS = [
  'frustrated',
  'angry',
  'terrible',
  'awful',
  'horrible',
  'worst',
  'hate',
  'disappointed',
  'unacceptable',
  'ridiculous',
  'pathetic',
  'useless',
  'waste',
  'never',
  'stuck',
];

/**
 * Positive sentiment keywords
 */
const POSITIVE_KEYWORDS = [
  'great',
  'excellent',
  'amazing',
  'wonderful',
  'fantastic',
  'love',
  'perfect',
  'awesome',
  'thank',
  'thanks',
  'appreciate',
  'happy',
  'satisfied',
  'best',
];

/**
 * Escalation keywords
 */
const ESCALATION_KEYWORDS = [
  'manager',
  'supervisor',
  'escalate',
  'complaint',
  'legal',
  'lawyer',
  'sue',
  'refund',
  'compensation',
  'CEO',
  'director',
  'immediately',
  'urgent',
];

/**
 * Intelligence Engine Version
 */
export const INTELLIGENCE_ENGINE_VERSION = '1.0.0';

/**
 * InteractionIntelligenceEngine
 *
 * Core engine for analyzing interaction events and generating AI recommendations.
 * Implements pattern similar to MoveIntelligenceEngine.
 *
 * Three-phase operation:
 * 1. Intent Detection - understand what the user wants
 * 2. Sentiment Analysis - understand how the user feels
 * 3. Recommendation Synthesis - generate appropriate response
 */
@Injectable()
export class InteractionIntelligenceEngine {
  private readonly logger = new Logger(InteractionIntelligenceEngine.name);
  private config: InteractionIntelligenceConfig;

  constructor(config?: Partial<InteractionIntelligenceConfig>) {
    this.config = { ...DEFAULT_INTELLIGENCE_CONFIG, ...config };
  }

  /**
   * Generate a recommendation from the interaction context
   */
  async analyze(context: InteractionIntelligenceContext): Promise<AIRecommendation> {
    this.logger.debug('Analyzing interaction context for AI recommendation');

    const reasoningChain: ReasoningStep[] = [];
    const startTime = Date.now();

    // If no current event, return no-action recommendation
    if (!context.currentEvent) {
      return this.createNoActionRecommendation(reasoningChain, 'No current event to analyze');
    }

    const event = context.currentEvent;

    // Phase 1: Intent Detection (if enabled and event is a human message)
    let intentResult: IntentDetectionResult | undefined;
    if (this.config.enableIntentDetection && this.isHumanMessageEvent(event)) {
      intentResult = this.detectIntent(event, context);
      reasoningChain.push(...intentResult.reasoning);
    }

    // Phase 2: Sentiment Analysis (if enabled and event is a human message)
    let sentimentResult: SentimentAnalysisResult | undefined;
    if (this.config.enableSentimentAnalysis && this.isHumanMessageEvent(event)) {
      sentimentResult = this.analyzeSentiment(event);
      reasoningChain.push(...sentimentResult.reasoning);
    }

    // Phase 3: Recommendation Synthesis
    const recommendation = this.synthesizeRecommendation(
      context,
      intentResult,
      sentimentResult,
      reasoningChain
    );

    const elapsedMs = Date.now() - startTime;
    this.logger.log(
      `Analysis completed in ${elapsedMs}ms with confidence ${recommendation.confidenceScore}`
    );

    return recommendation;
  }

  /**
   * Detect intent from a message event
   */
  private detectIntent(
    event: { payload: Record<string, unknown> },
    _context: InteractionIntelligenceContext
  ): IntentDetectionResult {
    const reasoningChain: ReasoningStep[] = [];
    const message = this.extractMessageText(event);
    const messageLower = message.toLowerCase();

    // Check for intent keywords
    const matchedIntents: { intent: IntentType; score: number }[] = [];

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      if (intent === IntentType.UNKNOWN) continue;

      let score = 0;
      for (const keyword of keywords) {
        if (messageLower.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }

      if (score > 0) {
        matchedIntents.push({ intent: intent as IntentType, score });
      }
    }

    // Determine best intent
    let detectedIntent: IntentType;
    let confidence: number;

    if (matchedIntents.length === 0) {
      detectedIntent = IntentType.ASK_QUESTION;
      confidence = 0.5;
    } else {
      // Sort by score (descending), then by priority (descending) for stable tie-breaking
      matchedIntents.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // When scores are tied, prefer higher priority intents
        return (INTENT_PRIORITY[b.intent] || 0) - (INTENT_PRIORITY[a.intent] || 0);
      });
      detectedIntent = matchedIntents[0].intent;
      confidence = Math.min(0.5 + matchedIntents[0].score * 0.15, 0.95);
    }

    reasoningChain.push({
      step: 'Intent Detection',
      reasoning: `Analyzed message "${message.substring(
        0,
        50
      )}..." - detected intent: ${detectedIntent}`,
      confidence,
      timestamp: new Date(),
    });

    // Extract entities (simple keyword-based extraction)
    const entities = this.extractEntities(message, detectedIntent);

    return {
      intent: detectedIntent,
      entities,
      confidence,
      reasoning: reasoningChain,
    };
  }

  /**
   * Analyze sentiment from a message event
   */
  private analyzeSentiment(event: { payload: Record<string, unknown> }): SentimentAnalysisResult {
    const reasoningChain: ReasoningStep[] = [];
    const message = this.extractMessageText(event).toLowerCase();

    let positiveCount = 0;
    let negativeCount = 0;

    for (const keyword of POSITIVE_KEYWORDS) {
      if (message.includes(keyword)) positiveCount++;
    }

    for (const keyword of NEGATIVE_KEYWORDS) {
      if (message.includes(keyword)) negativeCount++;
    }

    let sentiment: SentimentType;
    let confidence: number;

    if (negativeCount > positiveCount) {
      sentiment = negativeCount >= 2 ? SentimentType.FRUSTRATED : SentimentType.NEGATIVE;
      confidence = Math.min(0.6 + negativeCount * 0.15, 0.95);
    } else if (positiveCount > negativeCount) {
      sentiment = SentimentType.POSITIVE;
      confidence = Math.min(0.6 + positiveCount * 0.15, 0.95);
    } else {
      sentiment = SentimentType.NEUTRAL;
      confidence = 0.7;
    }

    reasoningChain.push({
      step: 'Sentiment Analysis',
      reasoning: `Analyzed message tone: ${sentiment} (positive: ${positiveCount}, negative: ${negativeCount})`,
      confidence,
      timestamp: new Date(),
    });

    return {
      sentiment,
      confidence,
      reasoning: reasoningChain,
    };
  }

  /**
   * Synthesize recommendation based on analysis results
   */
  private synthesizeRecommendation(
    context: InteractionIntelligenceContext,
    intentResult?: IntentDetectionResult,
    sentimentResult?: SentimentAnalysisResult,
    reasoningChain?: ReasoningStep[]
  ): AIRecommendation {
    const reasoning = reasoningChain || [];

    // Determine if should escalate based on sentiment or keywords
    const shouldEscalate = this.determineEscalation(context, sentimentResult);

    // Determine if should trigger workflow
    const { shouldTriggerWorkflow, workflowType, workflowPayload } = this.determineWorkflow(
      intentResult,
      sentimentResult
    );

    // Determine primary action
    const action = this.determineAction(intentResult, sentimentResult, shouldEscalate);

    // Generate response message
    const response = this.generateResponse(context, intentResult, sentimentResult, action);

    // Calculate overall confidence
    let confidenceScore = 0.5;
    if (intentResult && sentimentResult) {
      confidenceScore = (intentResult.confidence + sentimentResult.confidence) / 2;
    } else if (intentResult) {
      confidenceScore = intentResult.confidence;
    } else if (sentimentResult) {
      confidenceScore = sentimentResult.confidence;
    }

    reasoning.push({
      step: 'Recommendation Synthesis',
      reasoning: `Action: ${action}, Escalate: ${shouldEscalate}, Workflow: ${
        workflowType || 'none'
      }`,
      confidence: confidenceScore,
      timestamp: new Date(),
    });

    return {
      action,
      response,
      intentDetected: intentResult,
      sentimentAnalysis: sentimentResult,
      shouldEscalate,
      shouldTriggerWorkflow,
      workflowType,
      workflowPayload,
      reasoning,
      confidenceScore,
    };
  }

  /**
   * Determine if conversation should be escalated
   */
  private determineEscalation(
    context: InteractionIntelligenceContext,
    sentimentResult?: SentimentAnalysisResult
  ): boolean {
    // Check sentiment
    if (
      sentimentResult &&
      (sentimentResult.sentiment === SentimentType.FRUSTRATED ||
        (sentimentResult.sentiment === SentimentType.NEGATIVE && sentimentResult.confidence > 0.8))
    ) {
      return true;
    }

    // Check current event for escalation keywords
    if (context.currentEvent) {
      const message = this.extractMessageText(context.currentEvent).toLowerCase();
      for (const keyword of ESCALATION_KEYWORDS) {
        if (message.includes(keyword)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Determine if a workflow should be triggered
   */
  private determineWorkflow(
    intentResult?: IntentDetectionResult,
    _sentimentResult?: SentimentAnalysisResult
  ): {
    shouldTriggerWorkflow: boolean;
    workflowType?: string;
    workflowPayload?: Record<string, unknown>;
  } {
    if (!intentResult || intentResult.confidence < this.config.minConfidenceThreshold) {
      return { shouldTriggerWorkflow: false };
    }

    switch (intentResult.intent) {
      case IntentType.CREATE_ORDER:
        return {
          shouldTriggerWorkflow: true,
          workflowType: 'CREATE_ORDER',
          workflowPayload: { entities: intentResult.entities },
        };
      case IntentType.CANCEL_ORDER:
        return {
          shouldTriggerWorkflow: true,
          workflowType: 'CANCEL_ORDER',
          workflowPayload: { entities: intentResult.entities },
        };
      case IntentType.GET_SUPPORT:
        return {
          shouldTriggerWorkflow: true,
          workflowType: 'CREATE_SUPPORT_TICKET',
          workflowPayload: { entities: intentResult.entities },
        };
      default:
        return { shouldTriggerWorkflow: false };
    }
  }

  /**
   * Determine the appropriate action
   */
  private determineAction(
    intentResult?: IntentDetectionResult,
    sentimentResult?: SentimentAnalysisResult,
    shouldEscalate?: boolean
  ): AIActionType {
    if (shouldEscalate) {
      return AIActionType.ESCALATE;
    }

    if (sentimentResult?.sentiment === SentimentType.FRUSTRATED) {
      return AIActionType.ASK_CLARIFICATION;
    }

    if (!intentResult || intentResult.intent === IntentType.ASK_QUESTION) {
      return AIActionType.RESPOND;
    }

    if (intentResult.intent === IntentType.CHECK_STATUS) {
      return AIActionType.RESPOND;
    }

    return AIActionType.DETECT_INTENT;
  }

  /**
   * Generate response message
   */
  private generateResponse(
    context: InteractionIntelligenceContext,
    intentResult?: IntentDetectionResult,
    sentimentResult?: SentimentAnalysisResult,
    action?: AIActionType
  ): AIResponse | undefined {
    if (!context.currentEvent) {
      return undefined;
    }

    let message = '';
    const suggestedActions: string[] = [];

    // Base response on detected intent
    switch (intentResult?.intent) {
      case IntentType.CREATE_ORDER:
        message = "I'd be happy to help you create an order. Let me gather the necessary details.";
        suggestedActions.push('Start Order Flow', 'Get Quote First');
        break;
      case IntentType.CHECK_STATUS:
        message = 'Let me check the status of your request.';
        suggestedActions.push('View Details', 'Track Package');
        break;
      case IntentType.CANCEL_ORDER:
        message = 'I understand you want to cancel. Let me process that for you.';
        suggestedActions.push('Confirm Cancellation', 'See Cancellation Policy');
        break;
      case IntentType.GET_SUPPORT:
        message = "I'm here to help. Please describe the issue you're experiencing.";
        suggestedActions.push('Create Ticket', 'Live Chat');
        break;
      case IntentType.GET_ESTIMATE:
        message = "I'll help you get an estimate. What are the pickup and delivery locations?";
        suggestedActions.push('Get Quick Quote', 'Speak to Agent');
        break;
      default:
        message = 'Thank you for your message. How can I assist you further?';
    }

    // Add sentiment-aware adjustments
    if (sentimentResult?.sentiment === SentimentType.FRUSTRATED) {
      message = 'I apologize for any frustration. ' + message;
    } else if (sentimentResult?.sentiment === SentimentType.POSITIVE) {
      message = 'Thank you! ' + message;
    }

    return {
      message,
      action: action || AIActionType.RESPOND,
      confidence: intentResult?.confidence || 0.5,
      suggestedActions: this.config.enableSuggestedActions ? suggestedActions : undefined,
    };
  }

  /**
   * Extract message text from event payload
   */
  private extractMessageText(event: { payload: Record<string, unknown> }): string {
    const payload = event.payload;
    if (typeof payload.message === 'string') {
      return payload.message;
    }
    if (typeof payload.text === 'string') {
      return payload.text;
    }
    if (typeof payload.content === 'string') {
      return payload.content;
    }
    return '';
  }

  /**
   * Check if event is a human message or external message that should be analyzed
   */
  private isHumanMessageEvent(event: { eventType: string }): boolean {
    // Process human messages
    if (event.eventType === 'HUMAN_MESSAGE') return true;
    // Also process external events that may contain user intent
    if (
      event.eventType === 'SLACK_MESSAGE' ||
      event.eventType === 'TICKET_RESPONSE' ||
      event.eventType === 'WEBCHAT_MESSAGE' ||
      event.eventType === 'HUMAN_ACTION'
    ) {
      return true;
    }
    return false;
  }

  /**
   * Extract entities from message based on intent
   */
  private extractEntities(message: string, _intent: IntentType): Record<string, string> {
    const entities: Record<string, string> = {};

    // Simple extraction - in production, use NER
    const orderIdMatch = message.match(/order[:#\s]+([a-z0-9-]+)/i);
    if (orderIdMatch) {
      entities.orderId = orderIdMatch[1];
    }

    const phoneMatch = message.match(/(\+?[\d\s]{10,})/);
    if (phoneMatch) {
      entities.phone = phoneMatch[1].trim();
    }

    return entities;
  }

  /**
   * Create a no-action recommendation
   */
  private createNoActionRecommendation(
    reasoningChain: ReasoningStep[],
    reason: string
  ): AIRecommendation {
    reasoningChain.push({
      step: 'No Action',
      reasoning: reason,
      confidence: 1.0,
      timestamp: new Date(),
    });

    return {
      action: AIActionType.RESPOND,
      shouldEscalate: false,
      shouldTriggerWorkflow: false,
      reasoning: reasoningChain,
      confidenceScore: 1.0,
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<InteractionIntelligenceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): InteractionIntelligenceConfig {
    return { ...this.config };
  }
}
