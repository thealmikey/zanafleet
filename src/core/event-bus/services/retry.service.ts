import { Injectable, Logger } from '@nestjs/common';

import { RetryDefaults } from '../event-bus.constants';

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  multiplier?: number;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
}

/**
 * RetryService
 *
 * Implements exponential backoff retry logic for failed operations.
 * Default configuration: max 3 retries with delays of 1s, 2s, 4s.
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  /**
   * Executes an operation with exponential backoff retry logic
   * @param operation - The async operation to execute
   * @param options - Retry configuration options
   * @returns RetryResult containing success status, result/error, and attempt count
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<RetryResult<T>> {
    const maxRetries = options.maxRetries ?? RetryDefaults.MAX_RETRIES;
    const baseDelayMs = options.baseDelayMs ?? RetryDefaults.BASE_DELAY_MS;
    const multiplier = options.multiplier ?? RetryDefaults.MULTIPLIER;

    let lastError: Error | undefined;
    let attempts = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      attempts = attempt + 1;

      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts,
        };
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delayMs = this.calculateDelay(attempt, baseDelayMs, multiplier);
          this.logger.warn(
            `Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. Retrying in ${delayMs}ms...`,
          );

          if (options.onRetry) {
            options.onRetry(attempt + 1, lastError, delayMs);
          }

          await this.delay(delayMs);
        } else {
          this.logger.error(
            `All ${maxRetries + 1} attempts failed. Last error: ${lastError.message}`,
          );
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
    };
  }

  /**
   * Calculates the delay for a given attempt using exponential backoff
   * @param attempt - The current attempt number (0-indexed)
   * @param baseDelayMs - The base delay in milliseconds
   * @param multiplier - The exponential multiplier
   * @returns The delay in milliseconds
   */
  calculateDelay(attempt: number, baseDelayMs: number, multiplier: number): number {
    return baseDelayMs * Math.pow(multiplier, attempt);
  }

  /**
   * Returns the sequence of delays for the configured retry attempts
   * Useful for testing and documentation
   */
  getDelaySequence(
    maxRetries: number = RetryDefaults.MAX_RETRIES,
    baseDelayMs: number = RetryDefaults.BASE_DELAY_MS,
    multiplier: number = RetryDefaults.MULTIPLIER,
  ): number[] {
    const delays: number[] = [];
    for (let i = 0; i < maxRetries; i++) {
      delays.push(this.calculateDelay(i, baseDelayMs, multiplier));
    }
    return delays;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
