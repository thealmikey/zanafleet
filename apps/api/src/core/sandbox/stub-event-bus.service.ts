/**
 * Stub Event Bus
 *
 * Mock event bus that doesn't actually publish events.
 * Used in sandbox mode to avoid external dependencies.
 */

import { Injectable, Logger } from '@nestjs/common';

import { BaseEvent } from '../event-bus/interfaces/base-event.interface';

/**
 * Stub Event Bus
 *
 * A no-op event bus implementation for sandbox mode.
 */
@Injectable()
export class StubEventBusService {
  private readonly logger = new Logger(StubEventBusService.name);

  /**
   * Published events counter
   */
  private publishedCount = 0;

  /**
   * Publish an event (no-op in stub mode)
   */
  async publish<T extends BaseEvent>(event: T): Promise<void> {
    this.publishedCount++;
    this.logger.debug(`[STUB] Event published: ${event.eventType}`);
    // No-op: event is not actually published
  }

  /**
   * Publish multiple events (no-op in stub mode)
   */
  async publishBatch<T extends BaseEvent>(events: T[]): Promise<void> {
    this.publishedCount += events.length;
    this.logger.debug(`[STUB] Batch of ${events.length} events published`);
    // No-op: events are not actually published
  }

  /**
   * Subscribe to events (no-op in stub mode)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  subscribe<T extends BaseEvent>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _eventType: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _handler: (event: T) => void | Promise<void>
  ): void {
    // No-op: subscriptions are not registered
    this.logger.debug('[STUB] Subscription attempted (not registered)');
  }

  /**
   * Get published events count
   */
  getPublishedCount(): number {
    return this.publishedCount;
  }

  /**
   * Reset the counter
   */
  reset(): void {
    this.publishedCount = 0;
  }

  /**
   * Check if event would be published
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  wouldPublish(_eventType: string): boolean {
    return true; // Always returns true to indicate event would be published
  }
}
