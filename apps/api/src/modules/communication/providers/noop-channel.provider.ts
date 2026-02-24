import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { NotificationChannel } from '../dto/notification.enums';

import {
  ChannelProvider,
  RenderedMessage,
  Recipient,
  SendResult,
} from './channel-provider.interface';

/**
 * No-operation channel provider for testing and development.
 * Always returns success for all send operations.
 */
@Injectable()
export class NoOpChannelProvider implements ChannelProvider {
  private readonly logger = new Logger(NoOpChannelProvider.name);

  readonly providerId: string;
  readonly channel: NotificationChannel;
  readonly displayName: string;

  private shouldFail = false;
  private failureMessage = 'Simulated failure';
  private sentMessages: Array<{ message: RenderedMessage; recipient: Recipient }> = [];

  constructor(channel: NotificationChannel, providerId?: string) {
    this.channel = channel;
    this.providerId = providerId ?? `noop-${channel.toLowerCase()}`;
    this.displayName = `No-Op ${channel} Provider`;
  }

  async send(message: RenderedMessage, recipient: Recipient): Promise<SendResult> {
    this.logger.debug(
      `NoOp send called for channel ${this.channel}, recipient: ${recipient.recipientId}`
    );

    this.sentMessages.push({ message, recipient });

    if (this.shouldFail) {
      return {
        success: false,
        errorCode: 'SIMULATED_FAILURE',
        errorMessage: this.failureMessage,
      };
    }

    return {
      success: true,
      messageId: uuidv4(),
      providerReference: `noop_${this.channel.toLowerCase()}_${Date.now()}`,
      deliveredAt: new Date(),
      metadata: {
        channel: this.channel,
        simulatedDelivery: true,
      },
    };
  }

  canDeliver(recipient: Recipient): boolean {
    switch (this.channel) {
      case NotificationChannel.EMAIL:
        return !!recipient.email;
      case NotificationChannel.SMS:
        return !!recipient.phone;
      case NotificationChannel.PUSH:
        return !!recipient.deviceToken;
      case NotificationChannel.WHATSAPP:
        return !!recipient.whatsappId || !!recipient.phone;
      default:
        return true;
    }
  }

  async isHealthy(): Promise<boolean> {
    return !this.shouldFail;
  }

  /**
   * Configure the provider to simulate failures (for testing)
   */
  setFailure(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail;
    if (message) {
      this.failureMessage = message;
    }
  }

  /**
   * Get all sent messages (for testing assertions)
   */
  getSentMessages(): Array<{ message: RenderedMessage; recipient: Recipient }> {
    return [...this.sentMessages];
  }

  /**
   * Clear sent messages history (for test cleanup)
   */
  clearSentMessages(): void {
    this.sentMessages = [];
  }

  /**
   * Get count of sent messages
   */
  getSentCount(): number {
    return this.sentMessages.length;
  }
}

/**
 * Factory to create NoOp providers for all channels
 */
export function createNoOpProviders(): NoOpChannelProvider[] {
  return [
    new NoOpChannelProvider(NotificationChannel.SMS),
    new NoOpChannelProvider(NotificationChannel.EMAIL),
    new NoOpChannelProvider(NotificationChannel.PUSH),
    new NoOpChannelProvider(NotificationChannel.WHATSAPP),
  ];
}
