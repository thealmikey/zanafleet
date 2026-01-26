import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { IdempotencyDefaults } from '../event-bus.constants';

/**
 * Entry in the idempotency store
 */
interface IdempotencyEntry {
  eventId: string;
  processedAt: number;
}

/**
 * IdempotencyService
 *
 * Manages processed event IDs to prevent duplicate processing.
 * Uses an in-memory Set with TTL-based cleanup for simplicity.
 *
 * For production, this should be backed by Redis for distributed idempotency.
 */
@Injectable()
export class IdempotencyService implements OnModuleDestroy {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly processedEvents: Map<string, IdempotencyEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly ttlMs: number;

  constructor() {
    this.ttlMs = IdempotencyDefaults.TTL_MS;
    this.startCleanupTask();
  }

  onModuleDestroy(): void {
    this.stopCleanupTask();
  }

  /**
   * Checks if an event has already been processed
   * @param eventId - The unique event identifier
   * @returns true if the event was already processed (duplicate)
   */
  isProcessed(eventId: string): boolean {
    const entry = this.processedEvents.get(eventId);
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.processedEvents.delete(eventId);
      return false;
    }

    return true;
  }

  /**
   * Marks an event as processed
   * @param eventId - The unique event identifier
   */
  markAsProcessed(eventId: string): void {
    this.processedEvents.set(eventId, {
      eventId,
      processedAt: Date.now(),
    });
    this.logger.debug(`Event marked as processed: ${eventId}`);
  }

  /**
   * Checks if an event is a duplicate and marks it as processed if not
   * @param eventId - The unique event identifier
   * @returns true if the event is a duplicate (should skip processing)
   */
  checkAndMark(eventId: string): boolean {
    if (this.isProcessed(eventId)) {
      this.logger.warn(`Duplicate event detected: ${eventId}`);
      return true;
    }

    this.markAsProcessed(eventId);
    return false;
  }

  /**
   * Removes an event from the processed set (for testing or rollback scenarios)
   * @param eventId - The unique event identifier
   */
  remove(eventId: string): void {
    this.processedEvents.delete(eventId);
  }

  /**
   * Clears all processed events (for testing)
   */
  clear(): void {
    this.processedEvents.clear();
  }

  /**
   * Returns the count of currently tracked events
   */
  getProcessedCount(): number {
    return this.processedEvents.size;
  }

  private isExpired(entry: IdempotencyEntry): boolean {
    return Date.now() - entry.processedAt > this.ttlMs;
  }

  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, IdempotencyDefaults.CLEANUP_INTERVAL_MS);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  private stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [eventId, entry] of this.processedEvents.entries()) {
      if (now - entry.processedAt > this.ttlMs) {
        this.processedEvents.delete(eventId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(`Cleanup removed ${removedCount} expired event(s)`);
    }
  }
}
