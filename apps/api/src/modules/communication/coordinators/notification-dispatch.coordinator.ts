import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { NotificationChannel, NotificationStatus, RecipientType } from '../dto/notification.enums';
import { NotificationEntity } from '../entities/notification.entity';
import { TemplateEntity } from '../entities/template.entity';
import {
  ChannelProvider,
  ChannelProviderRegistry,
  RenderedMessage,
  Recipient,
  SendResult,
} from '../providers/channel-provider.interface';
import { PreferenceService } from '../services/preference.service';
import { TemplateService } from '../services/template.service';

/**
 * Input for dispatching a notification
 */
export interface NotificationInput {
  recipientId: string;
  recipientType: RecipientType;
  templateName: string;
  variables: Record<string, string>;
  channels: NotificationChannel[];
  fallbackChannels?: NotificationChannel[];
  workspaceId: string;
  locale?: string;
  correlationId?: string;
  causationId?: string;
  metadata?: Record<string, unknown>;
  recipientContact?: {
    email?: string;
    phone?: string;
    deviceToken?: string;
    whatsappId?: string;
  };
}

/**
 * Result of a single dispatch operation
 */
export interface DispatchResult {
  success: boolean;
  notificationId: string;
  channel?: NotificationChannel;
  messageId?: string;
  providerReference?: string;
  error?: string;
  skippedReason?: string;
  fallbackUsed?: boolean;
  retriesRemaining?: number;
}

/**
 * Result of batch dispatch operation
 */
export interface BatchDispatchResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  results: DispatchResult[];
}

/**
 * Delivery status for a notification
 */
export interface DeliveryStatus {
  notificationId: string;
  status: NotificationStatus;
  channel: NotificationChannel;
  sentAt: Date | null;
  failedAt: Date | null;
  error: string | null;
  attempts: number;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}

/**
 * Coordinator configuration
 */
export interface DispatchConfig {
  defaultRateLimit: RateLimitConfig;
  maxRetries: number;
  retryDelayMs: number;
  enableFallback: boolean;
}

interface RateLimitState {
  recipientId: string;
  channel: NotificationChannel;
  minuteCount: number;
  hourCount: number;
  dayCount: number;
  minuteResetAt: Date;
  hourResetAt: Date;
  dayResetAt: Date;
}

const DEFAULT_CONFIG: DispatchConfig = {
  defaultRateLimit: {
    maxPerMinute: 5,
    maxPerHour: 50,
    maxPerDay: 200,
  },
  maxRetries: 3,
  retryDelayMs: 1000,
  enableFallback: true,
};

const CHANNEL_FALLBACK_ORDER: NotificationChannel[] = [
  NotificationChannel.PUSH,
  NotificationChannel.SMS,
  NotificationChannel.EMAIL,
  NotificationChannel.WHATSAPP,
];

@Injectable()
export class NotificationDispatchCoordinator {
  private readonly logger = new Logger(NotificationDispatchCoordinator.name);
  private readonly providerRegistry = new ChannelProviderRegistry();
  private readonly rateLimitStates = new Map<string, RateLimitState>();
  private config: DispatchConfig = { ...DEFAULT_CONFIG };

  constructor(
    private readonly templateService: TemplateService,
    private readonly preferenceService: PreferenceService,
    @Optional()
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository?: Repository<NotificationEntity>,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  /**
   * Dispatch a notification through configured channels
   */
  async dispatch(input: NotificationInput): Promise<DispatchResult> {
    const notificationId = uuidv4();
    this.logger.log(`Dispatching notification ${notificationId} for recipient ${input.recipientId}`);

    try {
      const preferredChannel = await this.selectChannel(input);

      if (!preferredChannel) {
        const skippedResult = this.createSkippedResult(
          notificationId,
          'No enabled channels available for recipient',
        );
        await this.emitSkippedEvent(input, skippedResult);
        return skippedResult;
      }

      const rateLimitCheck = this.checkRateLimit(
        input.recipientId,
        preferredChannel,
      );

      if (!rateLimitCheck.allowed) {
        const skippedResult = this.createSkippedResult(
          notificationId,
          `Rate limit exceeded: ${rateLimitCheck.reason ?? ''}`,
        );
        await this.emitSkippedEvent(input, skippedResult);
        return skippedResult;
      }

      const template = await this.templateService.findByName(input.templateName, {
        workspaceId: input.workspaceId,
        locale: input.locale,
        channel: preferredChannel,
      });

      if (!template) {
        return this.createFailedResult(
          notificationId,
          `Template not found: ${input.templateName}`,
        );
      }

      const validation = this.templateService.validateVariables(template, input.variables);
      if (!validation.isValid) {
        return this.createFailedResult(
          notificationId,
          'Template validation failed: missing or invalid variables',
        );
      }

      const rendered = this.templateService.render(template, input.variables);

      const result = await this.sendWithFallback(
        notificationId,
        input,
        rendered,
        preferredChannel,
        template,
      );

      this.incrementRateLimit(input.recipientId, result.channel ?? preferredChannel);

      return result;
    } catch (error) {
      this.logger.error(`Dispatch failed for ${notificationId}:`, error);

      const failedResult = this.createFailedResult(
        notificationId,
        error instanceof Error ? error.message : 'Unexpected error during dispatch',
      );

      await this.emitFailedEvent(input, failedResult);

      return failedResult;
    }
  }

  /**
   * Dispatch multiple notifications in batch
   */
  async dispatchBatch(inputs: NotificationInput[]): Promise<BatchDispatchResult> {
    this.logger.log(`Processing batch dispatch for ${inputs.length} notifications`);

    const results: DispatchResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const input of inputs) {
      try {
        const result = await this.dispatch(input);
        results.push(result);

        if (result.success) {
          successCount++;
        } else if (result.skippedReason) {
          skippedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        this.logger.error(`Batch item failed for recipient ${input.recipientId}:`, error);
        failedCount++;
        results.push(
          this.createFailedResult(
            uuidv4(),
            error instanceof Error ? error.message : 'Batch processing error',
          ),
        );
      }
    }

    this.logger.log(
      `Batch dispatch completed: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped`,
    );

    return {
      success: failedCount === 0,
      totalProcessed: inputs.length,
      successCount,
      failedCount,
      skippedCount,
      results,
    };
  }

  /**
   * Get delivery status for a notification
   */
  async getDeliveryStatus(notificationId: string): Promise<DeliveryStatus | null> {
    if (!this.notificationRepository) {
      return null;
    }

    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      return null;
    }

    return {
      notificationId: notification.id,
      status: notification.status,
      channel: notification.channel,
      sentAt: notification.sentAt,
      failedAt: notification.failedAt,
      error: notification.error,
      attempts: notification.attempts,
    };
  }

  /**
   * Register a channel provider
   */
  registerChannelProvider(provider: ChannelProvider): void {
    this.logger.log(`Registering channel provider: ${provider.providerId} for ${provider.channel}`);
    this.providerRegistry.register(provider);
  }

  /**
   * Unregister a channel provider
   */
  unregisterChannelProvider(providerId: string): boolean {
    return this.providerRegistry.unregister(providerId);
  }

  /**
   * Get provider registry for testing
   */
  getProviderRegistry(): ChannelProviderRegistry {
    return this.providerRegistry;
  }

  /**
   * Update coordinator configuration
   */
  updateConfig(config: Partial<DispatchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): DispatchConfig {
    return { ...this.config };
  }

  /**
   * Clear rate limit state (for testing)
   */
  clearRateLimits(): void {
    this.rateLimitStates.clear();
  }

  private async selectChannel(input: NotificationInput): Promise<NotificationChannel | null> {
    const orderedChannels = this.orderChannelsByPreference(input.channels);

    for (const channel of orderedChannels) {
      const isEnabled = await this.preferenceService.isEnabled(
        input.recipientId,
        input.recipientType,
        channel,
        input.workspaceId,
      );

      if (!isEnabled) {
        this.logger.debug(
          `Channel ${channel} disabled by preference for ${input.recipientId}`,
        );
        continue;
      }

      if (!this.providerRegistry.hasChannel(channel)) {
        this.logger.debug(`No provider registered for channel ${channel}`);
        continue;
      }

      const provider = this.providerRegistry.getPrimary(channel);
      if (provider && this.canDeliverToRecipient(provider, input)) {
        return channel;
      }
    }

    return null;
  }

  private orderChannelsByPreference(channels: NotificationChannel[]): NotificationChannel[] {
    return channels.sort((a, b) => {
      const indexA = CHANNEL_FALLBACK_ORDER.indexOf(a);
      const indexB = CHANNEL_FALLBACK_ORDER.indexOf(b);
      return indexA - indexB;
    });
  }

  private canDeliverToRecipient(provider: ChannelProvider, input: NotificationInput): boolean {
    const recipient = this.buildRecipient(input);
    return provider.canDeliver(recipient);
  }

  private buildRecipient(input: NotificationInput): Recipient {
    return {
      recipientId: input.recipientId,
      recipientType: input.recipientType,
      email: input.recipientContact?.email,
      phone: input.recipientContact?.phone,
      deviceToken: input.recipientContact?.deviceToken,
      whatsappId: input.recipientContact?.whatsappId,
      metadata: input.metadata,
    };
  }

  private async sendWithFallback(
    notificationId: string,
    input: NotificationInput,
    rendered: RenderedMessage,
    primaryChannel: NotificationChannel,
    template: TemplateEntity,
  ): Promise<DispatchResult> {
    const recipient = this.buildRecipient(input);

    const primaryResult = await this.attemptSend(
      notificationId,
      primaryChannel,
      rendered,
      recipient,
      input,
      template,
    );

    if (primaryResult.success) {
      return primaryResult;
    }

    if (!this.config.enableFallback || !input.fallbackChannels?.length) {
      return primaryResult;
    }

    for (const fallbackChannel of input.fallbackChannels) {
      if (fallbackChannel === primaryChannel) {
        continue;
      }

      const isEnabled = await this.preferenceService.isEnabled(
        input.recipientId,
        input.recipientType,
        fallbackChannel,
        input.workspaceId,
      );

      if (!isEnabled) {
        continue;
      }

      const rateLimitCheck = this.checkRateLimit(input.recipientId, fallbackChannel);
      if (!rateLimitCheck.allowed) {
        continue;
      }

      const fallbackTemplate = await this.templateService.findByName(input.templateName, {
        workspaceId: input.workspaceId,
        locale: input.locale,
        channel: fallbackChannel,
      });

      if (!fallbackTemplate) {
        continue;
      }

      const fallbackRendered = this.templateService.render(fallbackTemplate, input.variables);

      const fallbackResult = await this.attemptSend(
        notificationId,
        fallbackChannel,
        fallbackRendered,
        recipient,
        input,
        fallbackTemplate,
      );

      if (fallbackResult.success) {
        this.incrementRateLimit(input.recipientId, fallbackChannel);
        return {
          ...fallbackResult,
          fallbackUsed: true,
        };
      }
    }

    return {
      ...primaryResult,
      error: `Primary channel failed and all fallbacks exhausted. Last error: ${primaryResult.error ?? ''}`,
    };
  }

  private async attemptSend(
    notificationId: string,
    channel: NotificationChannel,
    rendered: RenderedMessage,
    recipient: Recipient,
    input: NotificationInput,
    template: TemplateEntity,
  ): Promise<DispatchResult> {
    const provider = this.providerRegistry.getPrimary(channel);

    if (!provider) {
      return this.createFailedResult(
        notificationId,
        `No provider available for channel ${channel}`,
        channel,
      );
    }

    if (!provider.canDeliver(recipient)) {
      return this.createFailedResult(
        notificationId,
        `Provider cannot deliver to recipient via ${channel}`,
        channel,
      );
    }

    let lastError: Error | undefined;
    let sendResult: SendResult | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        sendResult = await provider.send(rendered, recipient);

        if (sendResult.success) {
          await this.recordNotification(
            notificationId,
            input,
            template,
            rendered,
            channel,
            NotificationStatus.SENT,
            sendResult,
          );

          await this.emitSentEvent(input, notificationId, channel, sendResult);

          return {
            success: true,
            notificationId,
            channel,
            messageId: sendResult.messageId,
            providerReference: sendResult.providerReference,
          };
        }

        lastError = new Error(sendResult.errorMessage ?? 'Send failed');
        this.logger.warn(
          `Send attempt ${attempt}/${this.config.maxRetries} failed: ${sendResult.errorMessage ?? ''}`,
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Send attempt ${attempt}/${this.config.maxRetries} threw error: ${lastError.message}`,
        );
      }

      if (attempt < this.config.maxRetries) {
        await this.sleep(this.config.retryDelayMs * attempt);
      }
    }

    const errorMessage = lastError?.message ?? sendResult?.errorMessage ?? 'Unknown error';

    await this.recordNotification(
      notificationId,
      input,
      template,
      rendered,
      channel,
      NotificationStatus.FAILED,
      undefined,
      errorMessage,
    );

    await this.emitFailedEvent(input, {
      success: false,
      notificationId,
      channel,
      error: errorMessage,
    });

    return this.createFailedResult(notificationId, errorMessage, channel);
  }

  private checkRateLimit(
    recipientId: string,
    channel: NotificationChannel,
  ): { allowed: boolean; reason?: string } {
    const key = `${recipientId}:${channel}`;
    const now = new Date();
    const state = this.rateLimitStates.get(key);

    if (!state) {
      return { allowed: true };
    }

    if (now >= state.minuteResetAt) {
      state.minuteCount = 0;
      state.minuteResetAt = new Date(now.getTime() + 60000);
    }

    if (now >= state.hourResetAt) {
      state.hourCount = 0;
      state.hourResetAt = new Date(now.getTime() + 3600000);
    }

    if (now >= state.dayResetAt) {
      state.dayCount = 0;
      state.dayResetAt = new Date(now.getTime() + 86400000);
    }

    const limits = this.config.defaultRateLimit;

    if (state.minuteCount >= limits.maxPerMinute) {
      return { allowed: false, reason: 'Per-minute limit exceeded' };
    }

    if (state.hourCount >= limits.maxPerHour) {
      return { allowed: false, reason: 'Per-hour limit exceeded' };
    }

    if (state.dayCount >= limits.maxPerDay) {
      return { allowed: false, reason: 'Per-day limit exceeded' };
    }

    return { allowed: true };
  }

  private incrementRateLimit(recipientId: string, channel: NotificationChannel): void {
    const key = `${recipientId}:${channel}`;
    const now = new Date();

    let state = this.rateLimitStates.get(key);

    if (!state) {
      state = {
        recipientId,
        channel,
        minuteCount: 0,
        hourCount: 0,
        dayCount: 0,
        minuteResetAt: new Date(now.getTime() + 60000),
        hourResetAt: new Date(now.getTime() + 3600000),
        dayResetAt: new Date(now.getTime() + 86400000),
      };
      this.rateLimitStates.set(key, state);
    }

    state.minuteCount++;
    state.hourCount++;
    state.dayCount++;
  }

  private async recordNotification(
    notificationId: string,
    input: NotificationInput,
    template: TemplateEntity,
    rendered: RenderedMessage,
    channel: NotificationChannel,
    status: NotificationStatus,
    sendResult?: SendResult,
    error?: string,
  ): Promise<void> {
    if (!this.notificationRepository) {
      return;
    }

    const notification = new NotificationEntity();
    notification.id = notificationId;
    notification.channel = channel;
    notification.recipientId = input.recipientId;
    notification.recipientType = input.recipientType;
    notification.status = status;
    notification.templateId = template.id;
    notification.renderedSubject = rendered.subject;
    notification.renderedBody = rendered.body;
    notification.workspaceId = input.workspaceId;
    notification.correlationId = input.correlationId ?? null;
    notification.causationId = input.causationId ?? null;
    notification.attempts = 1;

    if (status === NotificationStatus.SENT) {
      notification.sentAt = sendResult?.deliveredAt ?? new Date();
    } else if (status === NotificationStatus.FAILED) {
      notification.failedAt = new Date();
      notification.error = error ?? null;
    }

    await this.notificationRepository.save(notification);
  }

  private async emitSentEvent(
    input: NotificationInput,
    notificationId: string,
    channel: NotificationChannel,
    sendResult: SendResult,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Communication.Notification.SentV1',
      aggregateId: notificationId,
      aggregateType: 'Notification',
      payload: {
        notificationId,
        recipientId: input.recipientId,
        recipientType: input.recipientType,
        channel,
        templateName: input.templateName,
        workspaceId: input.workspaceId,
        messageId: sendResult.messageId,
        providerReference: sendResult.providerReference,
        sentAt: sendResult.deliveredAt?.toISOString() ?? new Date().toISOString(),
      },
      occurredAt: new Date(),
      correlationId: input.correlationId,
      causationId: input.causationId,
    };

    await this.eventBusService
      .publish(NatsSubjects.Notification.SENT_V1, event)
      .catch((error: unknown) => {
        this.logger.error(`Failed to publish NotificationSentEvent: ${(error as Error).message}`);
      });
  }

  private async emitFailedEvent(
    input: NotificationInput,
    result: DispatchResult,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Communication.Notification.FailedV1',
      aggregateId: result.notificationId,
      aggregateType: 'Notification',
      payload: {
        notificationId: result.notificationId,
        recipientId: input.recipientId,
        recipientType: input.recipientType,
        channel: result.channel,
        templateName: input.templateName,
        workspaceId: input.workspaceId,
        error: result.error,
        failedAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
      correlationId: input.correlationId,
      causationId: input.causationId,
    };

    await this.eventBusService
      .publish(NatsSubjects.Notification.FAILED_V1, event)
      .catch((error: unknown) => {
        this.logger.error(`Failed to publish NotificationFailedEvent: ${(error as Error).message}`);
      });
  }

  private async emitSkippedEvent(
    input: NotificationInput,
    result: DispatchResult,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Communication.Notification.SkippedV1',
      aggregateId: result.notificationId,
      aggregateType: 'Notification',
      payload: {
        notificationId: result.notificationId,
        recipientId: input.recipientId,
        recipientType: input.recipientType,
        channels: input.channels,
        templateName: input.templateName,
        workspaceId: input.workspaceId,
        reason: result.skippedReason,
        skippedAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
      correlationId: input.correlationId,
      causationId: input.causationId,
    };

    await this.eventBusService
      .publish(NatsSubjects.Notification.SKIPPED_V1, event)
      .catch((error: unknown) => {
        this.logger.error(`Failed to publish NotificationSkippedEvent: ${(error as Error).message}`);
      });
  }

  private createFailedResult(
    notificationId: string,
    error: string,
    channel?: NotificationChannel,
  ): DispatchResult {
    return {
      success: false,
      notificationId,
      channel,
      error,
    };
  }

  private createSkippedResult(
    notificationId: string,
    skippedReason: string,
  ): DispatchResult {
    return {
      success: false,
      notificationId,
      skippedReason,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
