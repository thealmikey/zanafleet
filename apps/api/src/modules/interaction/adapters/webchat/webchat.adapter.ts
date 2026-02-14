import { Injectable, Logger } from '@nestjs/common';

import { InteractionEventType, InteractionActorType } from '../../entities/interaction-event.entity';
import {
  IInteractionAdapter,
  AdapterInput,
  NormalizedEvent,
} from '../base/adapter.interface';

/**
 * WebChat Message Interface
 * Expected structure from web chat input
 */
interface WebChatMessage {
  userId: string;
  sessionId: string;
  message: string;
  messageType?: 'text' | 'action' | 'attachment';
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * WebChatAdapter
 * 
 * Normalizes web chat messages into InteractionEvents.
 * 
 * Supported message types:
 * - text (regular text messages)
 * - action (user actions like button clicks)
 * - attachment (file uploads, images)
 */
@Injectable()
export class WebChatAdapter implements IInteractionAdapter {
  readonly adapterId = 'webchat';
  readonly adapterName = 'Web Chat Integration';
  readonly supportedInputTypes = ['text', 'action', 'attachment'];

  private readonly logger = new Logger(WebChatAdapter.name);

  /**
   * Normalize web chat input to InteractionEvent format
   */
  normalize(input: AdapterInput): NormalizedEvent {
    const chatMessage = input.rawInput as WebChatMessage;

    // Determine event type based on message type
    let eventType = InteractionEventType.HUMAN_MESSAGE;
    if (chatMessage.messageType === 'action') {
      eventType = InteractionEventType.HUMAN_ACTION;
    }

    return {
      streamId: chatMessage.sessionId,
      contextType: 'GENERAL',
      contextId: chatMessage.sessionId,
      actorId: chatMessage.userId,
      actorType: InteractionActorType.USER,
      eventType,
      payload: {
        message: chatMessage.message,
        messageType: chatMessage.messageType || 'text',
        sessionId: chatMessage.sessionId,
        metadata: chatMessage.metadata,
        timestamp: chatMessage.timestamp || input.timestamp.toISOString(),
      },
    };
  }

  /**
   * Validate input is valid web chat message
   */
  validate(input: AdapterInput): boolean {
    const message = input.rawInput as WebChatMessage;
    return !!(
      message &&
      message.userId &&
      message.sessionId &&
      message.message
    );
  }

  /**
   * Extract context from web chat message
   * Uses session ID as context for now
   */
  extractContext(input: AdapterInput): { contextType: string; contextId: string } | null {
    const message = input.rawInput as WebChatMessage;
    if (!message.sessionId) {
      return null;
    }

    return {
      contextType: 'GENERAL',
      contextId: message.sessionId,
    };
  }
}
