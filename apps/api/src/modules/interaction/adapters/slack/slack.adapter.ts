import { Injectable, Logger } from '@nestjs/common';

import { InteractionEventType, InteractionActorType } from '../../entities/interaction-event.entity';
import {
  IInteractionAdapter,
  AdapterInput,
  NormalizedEvent,
} from '../base/adapter.interface';

/**
 * Slack Message Interface
 * Expected structure from Slack webhook/events
 */
interface SlackMessage {
  type: string;
  channel?: string;
  user?: string;
  text?: string;
  ts?: string;
  event?: {
    type: string;
    channel?: string;
    user?: string;
    text?: string;
    ts?: string;
  };
  challenge?: string;
}

/**
 * SlackAdapter
 * 
 * Normalizes Slack messages into InteractionEvents.
 * 
 * Supported event types:
 * - message (direct messages and channel messages)
 * - app_mention (mentions in channels)
 * - url_verification (for Slack endpoint verification)
 */
@Injectable()
export class SlackAdapter implements IInteractionAdapter {
  readonly adapterId = 'slack';
  readonly adapterName = 'Slack Integration';
  readonly supportedInputTypes = ['message', 'app_mention', 'url_verification', 'event_callback'];

  private readonly logger = new Logger(SlackAdapter.name);

  /**
   * Normalize Slack input to InteractionEvent format
   */
  normalize(input: AdapterInput): NormalizedEvent {
    const slackMessage = input.rawInput as SlackMessage;

    // Handle URL verification challenge
    if (slackMessage.challenge) {
      return {
        actorId: 'slack-system',
        actorType: InteractionActorType.EXTERNAL_INTEGRATION,
        eventType: InteractionEventType.WEBHOOK_EVENT,
        payload: {
          challenge: slackMessage.challenge,
          type: 'url_verification',
        },
      };
    }

    // Extract message from event callback
    const message = slackMessage.event || slackMessage;

    // Extract context from Slack channel
    const { contextType, contextId } = this.extractContextFromChannel(message.channel || '');

    // Determine event type based on message type
    let eventType = InteractionEventType.SLACK_MESSAGE;
    if (message.type === 'app_mention') {
      eventType = InteractionEventType.SLACK_MESSAGE;
    }

    return {
      streamId: this.deriveStreamId(contextType, contextId),
      contextType,
      contextId,
      actorId: message.user || 'unknown',
      actorType: InteractionActorType.EXTERNAL_INTEGRATION,
      eventType,
      payload: {
        slackChannel: message.channel,
        slackUser: message.user,
        slackTimestamp: message.ts,
        text: message.text,
        integrationType: 'SLACK',
        rawType: message.type,
      },
    };
  }

  /**
   * Validate input is valid Slack message
   */
  validate(input: AdapterInput): boolean {
    const message = input.rawInput as SlackMessage;
    return !!(
      message &&
      (message.challenge || message.event || message.type)
    );
  }

  /**
   * Extract context from Slack channel name
   * Expected format: "order-{orderId}" or "delivery-{deliveryId}"
   */
  extractContext(input: AdapterInput): { contextType: string; contextId: string } | null {
    const slackMessage = input.rawInput as SlackMessage;
    const message = slackMessage.event || slackMessage;
    const channel = message.channel || '';

    return this.extractContextFromChannel(channel);
  }

  /**
   * Extract context type and ID from channel name
   */
  private extractContextFromChannel(channel: string): { contextType: string; contextId: string } {
    // Parse channel name to extract context
    // Slack channels typically start with 'C' for public, 'D' for DM, 'G' for private
    // We use the channel ID to look up context in the payload

    // Default to GENERAL context if no specific context found
    if (!channel || channel.length < 2) {
      return { contextType: 'GENERAL', contextId: 'default' };
    }

    // For now, default to general support context
    // In production, this would look up channel-to-context mapping
    return { contextType: 'SUPPORT_TICKET', contextId: channel };
  }

  /**
   * Derive stream ID from context
   * In production, this would check if stream exists
   */
  private deriveStreamId(contextType: string, contextId: string): string {
    return `${contextType}-${contextId}`;
  }
}
