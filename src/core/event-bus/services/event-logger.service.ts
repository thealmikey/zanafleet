import { Injectable, Logger } from '@nestjs/common';
import { BaseEvent } from '../interfaces/base-event.interface';

/**
 * Log entry structure for events
 */
export interface EventLogEntry {
  eventId: string;
  eventType: string;
  eventVersion: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: string;
  subject?: string;
  correlationId?: string;
  causationId?: string;
}

/**
 * EventLoggerService
 *
 * Provides structured logging for all events passing through the Event Bus.
 * Logs events in a consistent format for auditing and debugging.
 */
@Injectable()
export class EventLoggerService {
  private readonly logger = new Logger('EventBus');

  /**
   * Logs an event being published
   * @param event - The event being published
   * @param subject - The NATS subject the event is published to
   */
  logPublish(event: BaseEvent, subject: string): void {
    const entry = this.createLogEntry(event, subject);
    this.logger.log(`[PUBLISH] ${this.formatLogEntry(entry)}`);
  }

  /**
   * Logs an event being received
   * @param event - The event being received
   * @param subject - The NATS subject the event was received from
   */
  logReceive(event: BaseEvent, subject: string): void {
    const entry = this.createLogEntry(event, subject);
    this.logger.log(`[RECEIVE] ${this.formatLogEntry(entry)}`);
  }

  /**
   * Logs a successful event processing
   * @param event - The event that was processed
   * @param handlerName - The name of the handler that processed the event
   */
  logProcessed(event: BaseEvent, handlerName: string): void {
    const entry = this.createLogEntry(event);
    this.logger.log(`[PROCESSED] ${this.formatLogEntry(entry)} handler=${handlerName}`);
  }

  /**
   * Logs a skipped event (duplicate)
   * @param event - The event that was skipped
   * @param reason - The reason for skipping
   */
  logSkipped(event: BaseEvent, reason: string): void {
    const entry = this.createLogEntry(event);
    this.logger.warn(`[SKIPPED] ${this.formatLogEntry(entry)} reason=${reason}`);
  }

  /**
   * Logs a failed event processing
   * @param event - The event that failed
   * @param error - The error that occurred
   * @param attempt - The attempt number (for retries)
   */
  logFailed(event: BaseEvent, error: Error, attempt?: number): void {
    const entry = this.createLogEntry(event);
    const attemptStr = attempt !== undefined ? ` attempt=${attempt}` : '';
    this.logger.error(
      `[FAILED] ${this.formatLogEntry(entry)}${attemptStr} error=${error.message}`,
    );
  }

  /**
   * Logs a retry attempt
   * @param event - The event being retried
   * @param attempt - The current attempt number
   * @param delayMs - The delay before the next retry
   */
  logRetry(event: BaseEvent, attempt: number, delayMs: number): void {
    const entry = this.createLogEntry(event);
    this.logger.warn(
      `[RETRY] ${this.formatLogEntry(entry)} attempt=${attempt} delayMs=${delayMs}`,
    );
  }

  private createLogEntry(event: BaseEvent, subject?: string): EventLogEntry {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      occurredAt:
        event.occurredAt instanceof Date
          ? event.occurredAt.toISOString()
          : String(event.occurredAt),
      subject,
      correlationId: event.correlationId,
      causationId: event.causationId,
    };
  }

  private formatLogEntry(entry: EventLogEntry): string {
    const parts = [
      `eventId=${entry.eventId}`,
      `eventType=${entry.eventType}`,
      `aggregateId=${entry.aggregateId}`,
      `occurredAt=${entry.occurredAt}`,
    ];

    if (entry.subject) {
      parts.push(`subject=${entry.subject}`);
    }

    if (entry.correlationId) {
      parts.push(`correlationId=${entry.correlationId}`);
    }

    return parts.join(' ');
  }
}
