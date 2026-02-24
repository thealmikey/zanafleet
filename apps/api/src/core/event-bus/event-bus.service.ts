import { Injectable, Inject, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';

import { MetricsService } from '../metrics/metrics.service';

import { NATS_CLIENT, buildSubjectFromEventType } from './event-bus.constants';
import { BaseEvent, SerializedEvent } from './interfaces/base-event.interface';
import { EventLoggerService } from './services/event-logger.service';
import { RetryService } from './services/retry.service';

/**
 * Publish options for event bus
 */
export interface PublishOptions {
  subject?: string;
  retry?: boolean;
  timeoutMs?: number;
}

/**
 * EventBusService
 *
 * Service wrapping the NATS client for publishing domain events.
 * Provides serialization, retry logic, structured logging, and metrics.
 */
@Injectable()
export class EventBusService implements OnModuleInit {
  private readonly logger = new Logger(EventBusService.name);
  private isConnected = false;
  private publishFailureCount = 0;
  private publishFailuresBySubject: Map<string, number> = new Map();

  constructor(
    @Inject(NATS_CLIENT) private readonly natsClient: ClientProxy,
    private readonly eventLogger: EventLoggerService,
    private readonly retryService: RetryService,
    @Optional() private readonly metricsService?: MetricsService
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.natsClient.connect();
      this.isConnected = true;
      this.logger.log('Successfully connected to NATS');
    } catch (error) {
      this.logger.error(`Failed to connect to NATS: ${(error as Error).message}`);
      this.isConnected = false;
    }
  }

  /**
   * Publishes an event to the NATS message bus
   * @param subject - The NATS subject to publish to (auto-derived from eventType if not provided)
   * @param event - The event to publish
   * @param options - Optional publish configuration
   */
  async publish(
    subject: string,
    event: BaseEvent,
    options: Omit<PublishOptions, 'subject'> = {}
  ): Promise<void> {
    const startTime = Date.now();

    if (!this.isConnected) {
      try {
        await this.natsClient.connect();
        this.isConnected = true;
        this.logger.log('Reconnected to NATS');
      } catch (error) {
        const connectionError =
          error instanceof Error ? error : new Error('NATS client is not connected');
        this.eventLogger.logFailed(event, connectionError);
        this.recordPublishFailure(subject);

        // Record metrics for failed publish
        if (this.metricsService) {
          this.metricsService.incrementEventsPublishedFailed(event.eventType, subject);
        }

        throw connectionError;
      }
    }

    const serialized = this.serializeEvent(event);
    const shouldRetry = options.retry ?? true;
    const timeoutMs = options.timeoutMs ?? 5000;

    this.eventLogger.logPublish(event, subject);

    const publishOperation = async (): Promise<void> => {
      await firstValueFrom(
        this.natsClient.emit(subject, serialized).pipe(
          timeout(timeoutMs),
          catchError((error) => {
            throw error;
          })
        )
      );
    };

    if (shouldRetry) {
      const result = await this.retryService.executeWithRetry(publishOperation, {
        onRetry: (attempt: number, error: Error, delayMs: number): void => {
          this.eventLogger.logRetry(event, attempt, delayMs);
          this.logger.warn(`Retry ${attempt} for event ${event.eventId}: ${error.message}`);
        },
      });

      if (!result.success) {
        const error = result.error ?? new Error('Unknown error during publish');
        this.eventLogger.logFailed(event, error, result.attempts);
        this.recordPublishFailure(subject);

        // Record metrics for failed publish
        if (this.metricsService) {
          this.metricsService.incrementEventsPublishedFailed(event.eventType, subject);
        }

        throw error;
      }
    } else {
      try {
        await publishOperation();
      } catch (error) {
        this.eventLogger.logFailed(event, error as Error);
        this.recordPublishFailure(subject);

        // Record metrics for failed publish
        if (this.metricsService) {
          this.metricsService.incrementEventsPublishedFailed(event.eventType, subject);
        }

        throw error;
      }
    }

    // Record metrics for successful publish
    const duration = (Date.now() - startTime) / 1000;
    if (this.metricsService) {
      this.metricsService.incrementEventsPublished(event.eventType, subject);
      this.metricsService.observeEventPublishDuration(event.eventType, subject, duration);
    }
  }

  /**
   * Publishes an event using the subject derived from the event type
   * @param event - The event to publish
   * @param options - Optional publish configuration
   */
  async publishEvent(event: BaseEvent, options: PublishOptions = {}): Promise<void> {
    const subject = options.subject ?? buildSubjectFromEventType(event.eventType);
    await this.publish(subject, event, options);
  }

  /**
   * Serializes an event to the transport format
   * @param event - The event to serialize
   * @returns The serialized event
   */
  serializeEvent(event: BaseEvent): SerializedEvent {
    const {
      eventId,
      eventType,
      eventVersion,
      occurredAt,
      aggregateId,
      aggregateType,
      correlationId,
      causationId,
      ...payload
    } = event;

    return {
      eventId,
      eventType,
      eventVersion,
      occurredAt: occurredAt instanceof Date ? occurredAt.toISOString() : occurredAt,
      aggregateId,
      aggregateType,
      correlationId,
      causationId,
      payload: payload as Record<string, unknown>,
    };
  }

  /**
   * Deserializes an event from transport format
   * @param serialized - The serialized event data
   * @returns The deserialized event object
   */
  deserializeEvent(serialized: SerializedEvent): BaseEvent & Record<string, unknown> {
    return {
      eventId: serialized.eventId,
      eventType: serialized.eventType,
      eventVersion: serialized.eventVersion,
      occurredAt: new Date(serialized.occurredAt),
      aggregateId: serialized.aggregateId,
      aggregateType: serialized.aggregateType,
      correlationId: serialized.correlationId,
      causationId: serialized.causationId,
      ...serialized.payload,
    };
  }

  /**
   * Returns the connection status
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Returns the total count of publish failures since service startup.
   * Useful for monitoring and alerting on event bus connectivity issues.
   */
  getPublishFailureCount(): number {
    return this.publishFailureCount;
  }

  /**
   * Returns publish failure counts grouped by NATS subject.
   * Useful for identifying specific event types experiencing issues.
   */
  getPublishFailuresBySubject(): Map<string, number> {
    return new Map(this.publishFailuresBySubject);
  }

  /**
   * Resets all failure counters. Primarily for testing purposes.
   */
  resetPublishFailureCounters(): void {
    this.publishFailureCount = 0;
    this.publishFailuresBySubject.clear();
  }

  /**
   * Records a publish failure for tracking and alerting purposes.
   * @param subject - The NATS subject that failed
   */
  private recordPublishFailure(subject: string): void {
    this.publishFailureCount++;
    const currentCount = this.publishFailuresBySubject.get(subject) ?? 0;
    this.publishFailuresBySubject.set(subject, currentCount + 1);
  }
}
