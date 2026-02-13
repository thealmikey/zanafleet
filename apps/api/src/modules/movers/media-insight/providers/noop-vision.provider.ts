/**
 * No-op Vision Provider
 *
 * A no-op provider implementation for when AI integration is not configured.
 * This provider always returns empty results and is used as the default fallback.
 *
 * @module media-insight/providers
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  IVisionProvider,
  VisionProviderConfig,
  VisionAnalysisRequest,
  VisionAnalysisResponse,
} from './vision-provider.interface';
import { createEmptyMediaInsight } from '../utils';

/**
 * No-op vision provider for when AI integration is not configured.
 *
 * This provider:
 * - Always returns empty MediaInsight results
 * - Is always "available" (but returns no useful data)
 * - Logs warnings when used
 *
 * Used as the default provider when no AI provider is configured,
 * ensuring the system continues to function without media analysis.
 */
@Injectable()
export class NoopVisionProvider implements IVisionProvider {
  readonly name = 'noop';
  readonly isAvailable = true;

  private readonly logger = new Logger(NoopVisionProvider.name);

  /**
   * Initialize the no-op provider.
   * Logs a warning to indicate that media analysis is disabled.
   *
   * @param _config - Configuration (ignored)
   */
  async initialize(_config: VisionProviderConfig): Promise<void> {
    this.logger.warn(
      'NoopVisionProvider initialized - media analysis disabled. ' +
        'Configure a vision provider (e.g., OpenAI) to enable media analysis.'
    );
  }

  /**
   * Analyze media and return empty insight.
   * This implementation returns a default empty MediaInsight structure.
   *
   * @param _request - Analysis request (ignored)
   * @returns Empty MediaInsight response
   */
  async analyze(_request: VisionAnalysisRequest): Promise<VisionAnalysisResponse> {
    this.logger.debug('NoopVisionProvider.analyze called - returning empty insight');

    return {
      rawResponse: null,
      parsedInsight: createEmptyMediaInsight('noop-v1'),
      processingTimeMs: 0,
      modelVersion: 'noop-v1',
    };
  }

  /**
   * Health check for the no-op provider.
   * Always returns true as this provider is always "healthy" (just non-functional).
   *
   * @returns Always true
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }
}
