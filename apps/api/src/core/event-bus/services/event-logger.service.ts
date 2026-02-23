import { Injectable, Logger } from '@nestjs/common';

import { BaseEvent } from '../interfaces/base-event.interface';

/**
 * Context information for event logging (multi-tenant awareness)
 */
export interface EventLogContext {
  workspaceId?: string;
  actorId?: string;
}

/**
 * Log entry structure for events
 */
export interface EventLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  eventId: string;
  eventType: string;
  eventVersion: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: string;
  subject?: string;
  correlationId?: string;
  causationId?: string;
  workspaceId?: string;
  actorId?: string;
  action: 'PUBLISH' | 'RECEIVE' | 'PROCESSED' | 'SKIPPED' | 'FAILED' | 'RETRY';
  handlerName?: string;
  reason?: string;
  attempt?: number;
  delayMs?: number;
  errorMessage?: string;
  durationMs?: number;
}

/**
 * EventLoggerService
 *
 * Provides structured logging for all events passing through the Event Bus.
 * Logs events in a consistent JSON format for auditing and debugging.
 * Includes multi-tenant context (workspaceId, actorId) when available.
 */
@Injectable()
export class EventLoggerService {
  private readonly logger = new Logger('EventBus');

  /**
   * Set the current tenant context for all subsequent log calls
   */
  private context: EventLogContext = {};

  /**
   * Set the tenant context for event logging
   */
  setContext(context: EventLogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear the tenant context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Get current tenant context
   */
  getContext(): EventLogContext {
    return { ...this.context };
  }

  /**
   * Logs an event being published
   * @param event - The event being published
   * @param subject - The NATS subject the event is published to
   * @param context - Optional override for tenant context
   */
  logPublish(event: BaseEvent, subject: string, context?: EventLogContext): void {
    const entry = this.createLogEntry(event, 'PUBLISH', subject, context);
    this.logEntry(entry);
  }

  /**
   * Logs an event being received
   * @param event - The event being received
   * @param subject - The NATS subject the event was received from
   * @param context - Optional override for tenant context
   */
  logReceive(event: BaseEvent, subject: string, context?: EventLogContext): void {
    const entry = this.createLogEntry(event, 'RECEIVE', subject, context);
    this.logEntry(entry);
  }

  /**
   * Logs a successful event processing
   * @param event - The event that was processed
   * @param handlerName - The name of the handler that processed the event
   * @param context - Optional override for tenant context
   * @param durationMs - Optional duration of processing
   */
  logProcessed(event: BaseEvent, handlerName: string, context?: EventLogContext, durationMs?: number): void {
    const entry = this.createLogEntry(event, 'PROCESSED', undefined, context);
    entry.handlerName = handlerName;
    entry.durationMs = durationMs;
    this.logEntry(entry);
  }

  /**
   * Logs a skipped event (duplicate)
   * @param event - The event that was skipped
   * @param reason - The reason for skipping
   * @param context - Optional override for tenant context
   */
  logSkipped(event: BaseEvent, reason: string, context?: EventLogContext): void {
    const entry = this.createLogEntry(event, 'SKIPPED', undefined, context);
    entry.reason = reason;
    this.logEntry(entry);
  }

  /**
   * Logs a failed event processing
   * @param event - The event that failed
   * @param error - The error that occurred
   * @param attempt - The attempt number (for retries)
   * @param context - Optional override for tenant context
   */
  logFailed(event: BaseEvent, error: Error, attempt?: number, context?: EventLogContext): void {
    const entry = this.createLogEntry(event, 'FAILED', undefined, context);
    entry.errorMessage = error.message;
    entry.attempt = attempt;
    this.logEntry(entry);
  }

  /**
   * Logs a retry attempt
   * @param event - The event being retried
   * @param attempt - The current attempt number
   * @param delayMs - The delay before the next retry
   * @param context - Optional override for tenant context
   */
  logRetry(event: BaseEvent, attempt: number, delayMs: number, context?: EventLogContext): void {
    const entry = this.createLogEntry(event, 'RETRY', undefined, context);
    entry.attempt = attempt;
    entry.delayMs = delayMs;
    this.logEntry(entry);
  }

  private createLogEntry(
    event: BaseEvent,
    action: EventLogEntry['action'],
    subject?: string,
    overrideContext?: EventLogContext,
  ): EventLogEntry {
    const ctx = overrideContext || this.context;
    
    return {
      timestamp: new Date().toISOString(),
      level: action === 'FAILED' ? 'error' : action === 'RETRY' || action === 'SKIPPED' ? 'warn' : 'info',
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
      workspaceId: ctx.workspaceId,
      actorId: ctx.actorId,
      action,
    };
  }

  private logEntry(entry: EventLogEntry): void {
    // Output as structured JSON for machine parsing
    const jsonLog = JSON.stringify(entry);

    switch (entry.level) {
      case 'error':
        this.logger.error(jsonLog);
        break;
      case 'warn':
        this.logger.warn(jsonLog);
        break;
      default:
        this.logger.log(jsonLog);
    }
  }
}
