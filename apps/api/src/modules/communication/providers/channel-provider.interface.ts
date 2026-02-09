import { NotificationChannel } from '../dto/notification.enums';

/**
 * Rendered message ready for delivery
 */
export interface RenderedMessage {
  subject: string | null;
  body: string;
  templateId?: string;
  templateVersion?: number;
}

/**
 * Recipient information for message delivery
 */
export interface Recipient {
  recipientId: string;
  recipientType: string;
  email?: string;
  phone?: string;
  deviceToken?: string;
  whatsappId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of a send operation
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  providerReference?: string;
  errorCode?: string;
  errorMessage?: string;
  deliveredAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Channel provider interface for multi-channel notification delivery.
 * Implementations should handle the specifics of each delivery channel.
 */
export interface ChannelProvider {
  readonly providerId: string;
  readonly channel: NotificationChannel;
  readonly displayName: string;

  /**
   * Send a rendered message to a recipient
   */
  send(message: RenderedMessage, recipient: Recipient): Promise<SendResult>;

  /**
   * Check if the provider supports delivering to this recipient
   */
  canDeliver(recipient: Recipient): boolean;

  /**
   * Get the current health/availability status of the provider
   */
  isHealthy(): Promise<boolean>;
}

/**
 * Registry for channel providers, supporting multiple providers per channel
 */
export class ChannelProviderRegistry {
  private readonly providers = new Map<NotificationChannel, ChannelProvider[]>();
  private readonly providerById = new Map<string, ChannelProvider>();

  /**
   * Register a channel provider
   */
  register(provider: ChannelProvider): void {
    const channelProviders = this.providers.get(provider.channel) ?? [];
    channelProviders.push(provider);
    this.providers.set(provider.channel, channelProviders);
    this.providerById.set(provider.providerId, provider);
  }

  /**
   * Get all providers for a channel
   */
  getByChannel(channel: NotificationChannel): ChannelProvider[] {
    return this.providers.get(channel) ?? [];
  }

  /**
   * Get the primary (first registered) provider for a channel
   */
  getPrimary(channel: NotificationChannel): ChannelProvider | undefined {
    const providers = this.providers.get(channel);
    return providers?.[0];
  }

  /**
   * Get a specific provider by ID
   */
  get(providerId: string): ChannelProvider | undefined {
    return this.providerById.get(providerId);
  }

  /**
   * Check if any provider is registered for a channel
   */
  hasChannel(channel: NotificationChannel): boolean {
    const providers = this.providers.get(channel);
    return (providers?.length ?? 0) > 0;
  }

  /**
   * Get all registered channel types
   */
  getRegisteredChannels(): NotificationChannel[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all registered provider IDs
   */
  getRegisteredIds(): string[] {
    return Array.from(this.providerById.keys());
  }

  /**
   * Remove a provider by ID
   */
  unregister(providerId: string): boolean {
    const provider = this.providerById.get(providerId);
    if (!provider) {
      return false;
    }

    this.providerById.delete(providerId);
    const channelProviders = this.providers.get(provider.channel);
    if (channelProviders) {
      const filtered = channelProviders.filter((p) => p.providerId !== providerId);
      if (filtered.length > 0) {
        this.providers.set(provider.channel, filtered);
      } else {
        this.providers.delete(provider.channel);
      }
    }

    return true;
  }
}
