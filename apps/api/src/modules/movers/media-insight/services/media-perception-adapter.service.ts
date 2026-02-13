/**
 * Media Perception Adapter Service
 *
 * Main adapter service that orchestrates media analysis through vision AI providers.
 * Handles media reference resolution, provider failover, and result normalization.
 *
 * @module media-insight/services
 */

import { Injectable, Logger, Optional } from '@nestjs/common';

import type { MediaInsight, MediaInsightErrorCode, MediaInsightStatus , MediaInsightResult } from '../interfaces';
import { NoopVisionProvider } from '../providers/noop-vision.provider';
import type { IVisionProvider, VisionProviderConfig } from '../providers/vision-provider.interface';

import { MediaPerceptionFeatureService } from './media-perception-feature.service';

/**
 * Media reference for analysis.
 * Supports both URLs and internal asset references.
 */
export interface MediaReference {
  /** Direct URL to the media, if accessible */
  url?: string;

  /** Media asset ID from the media module */
  assetId?: string;

  /** Type of media */
  type: 'image' | 'video';
}

/**
 * Provider type enumeration.
 */
export type VisionProviderType = 'noop' | 'openai' | 'google' | 'azure';

/**
 * Configuration for the media perception adapter.
 */
export interface MediaPerceptionConfig {
  /** Whether media analysis is enabled */
  enabled: boolean;

  /** Minimum confidence threshold for using media insight */
  confidenceThreshold: number;

  /** Provider configuration */
  provider: {
    /** Type of provider to use */
    type: VisionProviderType;

    /** API key for authentication */
    apiKey?: string;

    /** API endpoint URL */
    endpoint?: string;

    /** Model identifier */
    model?: string;

    /** Request timeout in milliseconds */
    timeout?: number;

    /** Maximum retries on failure */
    maxRetries?: number;
  };
}

/**
 * Default configuration for media perception.
 */
export const DEFAULT_MEDIA_PERCEPTION_CONFIG: MediaPerceptionConfig = {
  enabled: false,
  confidenceThreshold: 0.7,
  provider: {
    type: 'noop',
  },
};

/**
 * MediaPerceptionAdapter
 *
 * Service that orchestrates media analysis through vision AI providers.
 *
 * Key responsibilities:
 * - Media reference resolution
 * - Video frame extraction (future)
 * - Provider failover
 * - Result normalization
 * - Error handling (never throws)
 *
 * Design principles:
 * - Non-blocking: Never blocks the booking flow
 * - Graceful degradation: Returns null on failure
 * - Toggleable: Can be disabled via configuration
 */
@Injectable()
export class MediaPerceptionAdapter {
  private readonly logger = new Logger(MediaPerceptionAdapter.name);

  private provider: IVisionProvider;
  private config: MediaPerceptionConfig;

  /**
   * Create the MediaPerceptionAdapter.
   *
   * @param noopProvider - Injected no-op provider as default fallback
   * @param featureService - Optional feature toggle service for runtime checks
   */
  constructor(
    private readonly noopProvider: NoopVisionProvider,
    @Optional() private readonly featureService?: MediaPerceptionFeatureService
  ) {
    this.provider = noopProvider;
    this.config = DEFAULT_MEDIA_PERCEPTION_CONFIG;
  }

  /**
   * Initialize the adapter with configuration.
   *
   * @param config - Media perception configuration
   */
  async initialize(config: MediaPerceptionConfig): Promise<void> {
    this.config = config;

    if (!config.enabled) {
      this.logger.log('Media perception disabled, using noop provider');
      this.provider = this.noopProvider;
      return;
    }

    // Provider would be injected based on config.provider.type
    // For now, default to noop provider
    // In a full implementation, this would use a factory to create the appropriate provider
    this.provider = this.noopProvider;

    const providerConfig: VisionProviderConfig = {
      apiKey: config.provider.apiKey,
      endpoint: config.provider.endpoint,
      model: config.provider.model,
      timeout: config.provider.timeout,
      maxRetries: config.provider.maxRetries,
    };

    await this.provider.initialize(providerConfig);

    this.logger.log(
      `Media perception initialized with provider: ${this.provider.name}, enabled: ${config.enabled}`
    );
  }

  /**
   * Analyze media references and return structured MediaInsight.
   *
   * This method NEVER throws - it returns a result with null insight on failure.
   *
   * Flow:
   * 1. Validate input
   * 2. Check if feature is enabled (via feature service or config)
   * 3. Check provider availability
   * 4. Extract image URLs from media references
   * 5. Call vision provider
   * 6. Validate and return result
   *
   * @param mediaRefs - Array of media references to analyze
   * @returns MediaInsightResult with analysis or failure information
   */
  async analyzeMedia(mediaRefs: MediaReference[]): Promise<MediaInsightResult> {
    const startTime = Date.now();

    // Layer 1: Input validation
    if (!mediaRefs || mediaRefs.length === 0) {
      return this.createResult(
        'skipped',
        null,
        'NO_MEDIA_PROVIDED',
        'No media references provided',
        startTime
      );
    }

    // Layer 2: Feature toggle check (prefer feature service, fallback to config)
    const isEnabled = this.featureService?.isEnabled() ?? this.config.enabled;
    if (!isEnabled) {
      this.logger.debug('Media perception disabled, returning null insight');
      return this.createResult(
        'skipped',
        null,
        'FEATURE_DISABLED',
        'Media perception feature is disabled',
        startTime
      );
    }

    // Layer 3: Provider availability check
    if (!this.provider.isAvailable) {
      return this.createResult(
        'failed',
        null,
        'PROVIDER_UNAVAILABLE',
        'Vision provider not available',
        startTime
      );
    }

    try {
      // Extract image URLs from media references
      const imageUrls = this.extractImageUrls(mediaRefs);

      if (imageUrls.length === 0) {
        return this.createResult(
          'skipped',
          null,
          'NO_MEDIA_PROVIDED',
          'No valid image URLs found in media references',
          startTime
        );
      }

      // Call vision provider
      const response = await this.provider.analyze({
        imageUrls,
        prompt: this.getAnalysisPrompt(),
      });

      // Layer 4: Result validation
      if (!response.parsedInsight) {
        return this.createResult(
          'failed',
          null,
          'INVALID_RESPONSE',
          'Failed to parse vision response',
          startTime
        );
      }

      // Check confidence threshold
      if (response.parsedInsight.perceptionConfidence < this.config.confidenceThreshold) {
        this.logger.debug(
          `Insight confidence ${response.parsedInsight.perceptionConfidence} below threshold ${this.config.confidenceThreshold}`
        );
      }

      // Add metadata to insight
      const insight: MediaInsight = {
        ...response.parsedInsight,
        analyzedAt: new Date().toISOString(),
        mediaReferences: imageUrls,
      };

      this.logger.log(
        `Media analysis completed with confidence ${insight.perceptionConfidence}`
      );

      return this.createResult('success', insight, undefined, undefined, startTime);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Media analysis failed: ${errorMessage}`);

      return this.createResult(
        'failed',
        null,
        'PROVIDER_TIMEOUT',
        errorMessage,
        startTime
      );
    }
  }

  /**
   * Check if the adapter is enabled and available.
   *
   * @returns True if media analysis can be performed
   */
  isEnabled(): boolean {
    return this.config.enabled && this.provider.isAvailable;
  }

  /**
   * Get the current provider name.
   *
   * @returns Provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Perform a health check on the adapter.
   *
   * @returns True if the adapter is healthy
   */
  async healthCheck(): Promise<boolean> {
    if (!this.config.enabled) {
      return true; // Disabled is considered healthy
    }

    return this.provider.healthCheck();
  }

  /**
   * Extract image URLs from media references.
   *
   * @param mediaRefs - Media references
   * @returns Array of image URLs
   */
  private extractImageUrls(mediaRefs: MediaReference[]): string[] {
    return mediaRefs
      .filter((ref) => ref.type === 'image' && ref.url)
      .map((ref) => ref.url as string);
  }

  /**
   * Get the analysis prompt for the vision provider.
   *
   * @returns Analysis prompt string
   */
  private getAnalysisPrompt(): string {
    return `Analyze these images for a moving estimate.

Identify all visible items and provide:
1. A list of detected items with their category and size
2. Estimated total volume in cubic meters
3. Labor intensity (1-5 movers needed)
4. Fragility score (0-1)
5. Whether special handling is required
6. Overall confidence in the analysis (0-1)

Return a structured JSON response.`;
  }

  /**
   * Create a MediaInsightResult.
   *
   * @param status - Result status
   * @param insight - MediaInsight or null
   * @param errorCode - Error code if failed
   * @param errorMessage - Error message if failed
   * @param startTime - Start time for processing time calculation
   * @returns MediaInsightResult
   */
  private createResult(
    status: MediaInsightStatus,
    insight: MediaInsight | null,
    errorCode?: MediaInsightErrorCode,
    errorMessage?: string,
    startTime?: number
  ): MediaInsightResult {
    return {
      status,
      insight,
      errorCode,
      errorMessage,
      processingTimeMs: startTime ? Date.now() - startTime : 0,
    };
  }
}
