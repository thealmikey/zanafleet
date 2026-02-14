import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IEventHandler, EventsHandler, EventBus } from '@nestjs/cqrs';

import { InteractionEventEntity, InteractionEventType } from '../entities/interaction-event.entity';
import { InteractionStreamEntity } from '../entities/interaction-stream.entity';
import { InteractionEventCreatedEventV1 } from '../events/interaction-event-created.event';
import { InteractionEventRepository } from '../repositories/interaction-event.repository';
import { InteractionStreamRepository } from '../repositories/interaction-stream.repository';

import {
  InteractionIntelligenceContext,
  AIRecommendation,
  AIActionType,
  IntentType,
  SentimentType,
  InteractionIntelligenceConfig,
  DEFAULT_INTELLIGENCE_CONFIG,
} from './interaction-intelligence-context';
import { InteractionIntelligenceEngine } from './interaction-intelligence-engine';

/**
 * Events emitted by AI Orchestrator
 */
export enum InteractionAIEvent {
  AIRESPONSE_GENERATED = 'interaction.ai.response.generated',
  INTENT_DETECTED = 'interaction.ai.intent.detected',
  ESCALATION_REQUIRED = 'interaction.ai.escalation.required',
  WORKFLOW_TRIGGERED = 'interaction.ai.workflow.triggered',
  SUMMARIZATION_GENERATED = 'interaction.ai.summarization.generated',
}

/**
 * AI Response Generated Event Payload
 */
export interface AIResponseGeneratedPayload {
  streamId: string;
  originalEventId: string;
  response: string;
  intent?: IntentType;
  sentiment?: SentimentType;
  confidence: number;
  suggestedActions?: string[];
}

/**
 * Intent Detected Event Payload
 */
export interface IntentDetectedPayload {
  streamId: string;
  eventId: string;
  intent: IntentType;
  entities: Record<string, string>;
  confidence: number;
}

/**
 * Escalation Required Event Payload
 */
export interface EscalationRequiredPayload {
  streamId: string;
  eventId: string;
  reason: string;
  sentiment?: SentimentType;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Workflow Triggered Event Payload
 */
export interface WorkflowTriggeredPayload {
  streamId: string;
  eventId: string;
  workflowType: string;
  payload: Record<string, unknown>;
}

/**
 * AI Response Generated Event
 */
export class AIResponseGeneratedEvent {
  constructor(
    public readonly streamId: string,
    public readonly originalEventId: string,
    public readonly response: string,
    public readonly intent: IntentType | undefined,
    public readonly sentiment: SentimentType | undefined,
    public readonly confidence: number,
    public readonly suggestedActions: string[] | undefined,
  ) {}
}

/**
 * Intent Detected Event
 */
export class IntentDetectedEvent {
  constructor(
    public readonly streamId: string,
    public readonly eventId: string,
    public readonly intent: IntentType,
    public readonly entities: Record<string, string>,
    public readonly confidence: number,
  ) {}
}

/**
 * Escalation Required Event
 */
export class EscalationRequiredEvent {
  constructor(
    public readonly streamId: string,
    public readonly eventId: string,
    public readonly reason: string,
    public readonly sentiment: SentimentType | undefined,
    public readonly priority: 'high' | 'medium' | 'low',
  ) {}
}

/**
 * Workflow Triggered Event
 */
export class WorkflowTriggeredEvent {
  constructor(
    public readonly streamId: string,
    public readonly eventId: string,
    public readonly workflowType: string,
    public readonly payload: Record<string, unknown>,
  ) {}
}

/**
 * InteractionEventCreatedEventHandler
 * 
 * Handles InteractionEventCreatedEventV1 and triggers AI orchestration
 */
@EventsHandler(InteractionEventCreatedEventV1)
export class InteractionEventAIOHandler implements IEventHandler<InteractionEventCreatedEventV1> {
  private readonly logger = new Logger(InteractionEventAIOHandler.name);

  constructor(
    private readonly eventBus: EventBus,
    private readonly intelligenceEngine: InteractionIntelligenceEngine,
    private readonly eventRepository: InteractionEventRepository,
    private readonly streamRepository: InteractionStreamRepository,
  ) {}

  async handle(event: InteractionEventCreatedEventV1): Promise<void> {
    this.logger.debug(`Processing AI orchestration for event ${event.interactionEventId} in stream ${event.streamId}`);

    try {
      // Build intelligence context
      const context = await this.buildIntelligenceContext(event.streamId, event.interactionEventId);

      // Skip AI processing for non-human events
      if (!context.currentEvent || !this.shouldProcessEvent(context.currentEvent)) {
        this.logger.debug('Skipping AI processing for non-human event');
        return;
      }

      // Run intelligence analysis
      const recommendation = await this.intelligenceEngine.analyze(context);

      // Process recommendation and emit new events
      await this.processRecommendation(context, recommendation);

    } catch (error) {
      this.logger.error(`Error in AI orchestration: ${error}`, error);
      // Don't throw - AI failures should not break the main flow
    }
  }

  /**
   * Build intelligence context from stream and event data
   */
  private async buildIntelligenceContext(
    streamId: string,
    currentEventId: string,
  ): Promise<InteractionIntelligenceContext> {
    // Get stream
    const stream = await this.streamRepository.findById(streamId);
    if (!stream) {
      throw new Error(`Stream not found: ${streamId}`);
    }

    // Get current event
    const currentEvent = await this.eventRepository.findById(currentEventId);
    if (!currentEvent) {
      throw new Error(`Event not found: ${currentEventId}`);
    }

    // Get recent events for context
    const recentEvents = await this.eventRepository.findByStreamId(streamId);

    return {
      stream,
      recentEvents,
      participantIds: stream.participantIds || [],
      contextType: stream.contextType,
      contextId: stream.contextId,
      currentEvent,
      metadata: stream.metadata,
      builtAt: new Date(),
    };
  }

  /**
   * Determine if event should be processed by AI
   */
  private shouldProcessEvent(event: InteractionEventEntity): boolean {
    // Only process human messages by default
    const humanEventTypes = [
      InteractionEventType.HUMAN_MESSAGE,
      InteractionEventType.HUMAN_ACTION,
    ];

    // Also process external integration messages
    humanEventTypes.push(
      InteractionEventType.SLACK_MESSAGE,
      InteractionEventType.TICKET_RESPONSE,
      InteractionEventType.EMAIL_RECEIVED,
    );

    return humanEventTypes.includes(event.eventType);
  }

  /**
   * Process recommendation and emit new events
   */
  private async processRecommendation(
    context: InteractionIntelligenceContext,
    recommendation: AIRecommendation,
  ): Promise<void> {
    const streamId = context.stream.id;
    const eventId = context.currentEvent!.id;

    // Emit AI response generated event
    if (recommendation.response) {
      const responseEvent = new AIResponseGeneratedEvent(
        streamId,
        eventId,
        recommendation.response.message,
        recommendation.intentDetected?.intent,
        recommendation.sentimentAnalysis?.sentiment,
        recommendation.confidenceScore,
        recommendation.response.suggestedActions,
      );

      this.eventBus.publish(responseEvent);
      this.logger.debug(`Emitted AI response generated for stream ${streamId}`);
    }

    // Emit intent detected event
    if (recommendation.intentDetected && recommendation.intentDetected.confidence >= 0.7) {
      const intentEvent = new IntentDetectedEvent(
        streamId,
        eventId,
        recommendation.intentDetected.intent,
        recommendation.intentDetected.entities,
        recommendation.intentDetected.confidence,
      );

      this.eventBus.publish(intentEvent);
      this.logger.debug(`Emitted intent detected: ${recommendation.intentDetected.intent} for stream ${streamId}`);
    }

    // Emit escalation required event
    if (recommendation.shouldEscalate) {
      const escalationEvent = new EscalationRequiredEvent(
        streamId,
        eventId,
        `AI detected need for escalation: ${recommendation.action}`,
        recommendation.sentimentAnalysis?.sentiment,
        recommendation.sentimentAnalysis?.sentiment === SentimentType.FRUSTRATED ? 'high' : 'medium',
      );

      this.eventBus.publish(escalationEvent);
      this.logger.warn(`Emitted escalation required for stream ${streamId}`);
    }

    // Emit workflow triggered event
    if (recommendation.shouldTriggerWorkflow && recommendation.workflowType) {
      const workflowEvent = new WorkflowTriggeredEvent(
        streamId,
        eventId,
        recommendation.workflowType,
        recommendation.workflowPayload || {},
      );

      this.eventBus.publish(workflowEvent);
      this.logger.debug(`Emitted workflow triggered: ${recommendation.workflowType} for stream ${streamId}`);
    }
  }
}

/**
 * InteractionAIOrchestratorService
 * 
 * Provides utility methods for AI orchestration
 */
@Injectable()
export class InteractionAIOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(InteractionAIOrchestratorService.name);
  private config: InteractionIntelligenceConfig;

  constructor(
    private readonly intelligenceEngine: InteractionIntelligenceEngine,
    private readonly eventRepository: InteractionEventRepository,
    private readonly streamRepository: InteractionStreamRepository,
    config?: Partial<InteractionIntelligenceConfig>,
  ) {
    this.config = { ...DEFAULT_INTELLIGENCE_CONFIG, ...config };
  }

  /**
   * Module initialization
   */
  onModuleInit(): void {
    this.logger.log('InteractionAIOrchestratorService initialized');
  }

  /**
   * Manually trigger analysis for a stream (for testing or manual review)
   */
  async analyzeStream(streamId: string): Promise<AIRecommendation | null> {
    const stream = await this.streamRepository.findById(streamId);
    if (!stream) {
      return null;
    }

    const recentEvents = await this.eventRepository.findByStreamId(streamId);

    const context: InteractionIntelligenceContext = {
      stream,
      recentEvents,
      participantIds: stream.participantIds || [],
      contextType: stream.contextType,
      contextId: stream.contextId,
      metadata: stream.metadata,
      builtAt: new Date(),
    };

    return this.intelligenceEngine.analyze(context);
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<InteractionIntelligenceConfig>): void {
    this.config = { ...this.config, ...config };
    this.intelligenceEngine.setConfig(config);
  }

  /**
   * Get current configuration
   */
  getConfig(): InteractionIntelligenceConfig {
    return { ...this.config };
  }
}
