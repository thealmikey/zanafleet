import { Injectable, Logger } from '@nestjs/common';
import {
  TelemetryEvent,
  ScreenRenderedEvent,
  ActionInvokedEvent,
  ActionSucceededEvent,
  ActionFailedEvent,
} from '../schema/v1/types';

/**
 * Telemetry Service
 * Emits telemetry events for analytics and monitoring
 */
@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly eventBuffer: TelemetryEvent[] = [];
  private readonly bufferSize = 100;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic flush
    this.flushInterval = setInterval(() => this.flush(), 30000);
  }

  /**
   * Emit a telemetry event
   */
  emit(event: TelemetryEvent): void {
    this.eventBuffer.push(event);
    
    if (this.eventBuffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  /**
   * Emit screen rendered event
   */
  emitScreenRendered(event: Omit<ScreenRenderedEvent, 'event' | 'timestamp'>): void {
    this.emit({
      ...event,
      event: 'ScreenRendered',
      timestamp: new Date().toISOString(),
    } as ScreenRenderedEvent);
  }

  /**
   * Emit action invoked event
   */
  emitActionInvoked(event: Omit<ActionInvokedEvent, 'event' | 'timestamp'>): void {
    this.emit({
      ...event,
      event: 'ActionInvoked',
      timestamp: new Date().toISOString(),
    } as ActionInvokedEvent);
  }

  /**
   * Emit action succeeded event
   */
  emitActionSucceeded(event: Omit<ActionSucceededEvent, 'event' | 'timestamp'>): void {
    this.emit({
      ...event,
      event: 'ActionSucceeded',
      timestamp: new Date().toISOString(),
    } as ActionSucceededEvent);
  }

  /**
   * Emit action failed event
   */
  emitActionFailed(event: Omit<ActionFailedEvent, 'event' | 'timestamp'>): void {
    this.emit({
      ...event,
      event: 'ActionFailed',
      timestamp: new Date().toISOString(),
    } as ActionFailedEvent);
  }

  /**
   * Emit suggestion displayed event
   */
  emitSuggestionDisplayed(data: {
    actorId: string;
    suggestionId: string;
    suggestionType: string;
    targetId: string;
    confidence: number;
    correlationId: string;
    contextId: string;
    contextType: string;
  }): void {
    this.emit({
      ...data,
      event: 'SuggestionDisplayed',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit region refreshed event
   */
  emitRegionRefreshed(data: {
    actorId: string;
    regionId: string;
    refreshType: 'manual' | 'automatic' | 'polling' | 'websocket';
    dataSourceId: string;
    duration: number;
    correlationId: string;
    contextId: string;
    contextType: string;
  }): void {
    this.emit({
      ...data,
      event: 'RegionRefreshed',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Flush buffered events
   */
  private flush(): void {
    if (this.eventBuffer.length === 0) return;

    const events = this.eventBuffer.splice(0, this.eventBuffer.length);
    
    // Log events (in production, send to analytics service)
    for (const event of events) {
      this.logger.debug(`Telemetry: ${event.event}`, {
        correlationId: event.correlationId,
        actorId: event.actorId,
        contextType: event.contextType,
      });
    }

    this.logger.debug(`Flushed ${events.length} telemetry events`);
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    // Flush remaining events
    this.flush();
  }
}
