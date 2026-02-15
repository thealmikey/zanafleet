/**
 * Media Perception Feature Service
 *
 * Service for checking feature toggles and configuration for media perception.
 * Provides runtime feature flag checks for the media analysis pipeline.
 *
 * @module media-insight/services
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  MediaPerceptionConfig,
  DEFAULT_MEDIA_PERCEPTION_CONFIG,
} from '../config/media-perception.config';

/**
 * MediaPerceptionFeatureService
 *
 * Provides runtime feature toggle checks for the media perception feature.
 * All feature checks are performed at runtime, allowing configuration changes
 * without code deployment.
 *
 * Key responsibilities:
 * - Check if media perception is enabled
 * - Check specific feature flags
 * - Provide threshold values for confidence and override decisions
 * - Determine if media should be processed based on config and availability
 *
 * Design principles:
 * - Default to DISABLED for safety
 * - All checks are runtime (not compile-time)
 * - Configuration changes do not require code changes
 */
@Injectable()
export class MediaPerceptionFeatureService {
  private readonly logger = new Logger(MediaPerceptionFeatureService.name);
  private readonly config: MediaPerceptionConfig;

  constructor(private readonly configService: ConfigService) {
    // Get configuration from NestJS ConfigModule, fallback to defaults
    this.config = this.configService.get<MediaPerceptionConfig>('mediaPerception') ?? {
      ...DEFAULT_MEDIA_PERCEPTION_CONFIG,
    };
  }

  /**
   * Check if media perception is enabled.
   *
   * This is the master toggle for the entire feature.
   * When false, all media analysis is skipped.
   *
   * @returns True if media perception is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if a specific feature is enabled.
   *
   * Returns false if the master toggle is disabled,
   * regardless of the individual feature flag.
   *
   * @param feature - Feature key to check
   * @returns True if the feature is enabled and master toggle is on
   */
  isFeatureEnabled(feature: keyof MediaPerceptionConfig['features']): boolean {
    return this.isEnabled() && this.config.features[feature];
  }

  /**
   * Get confidence threshold for accepting media insights.
   *
   * Insights with confidence below this threshold are discarded.
   *
   * @returns Confidence threshold value (0-1)
   */
  getConfidenceThreshold(): number {
    return this.config.confidenceThreshold;
  }

  /**
   * Get override threshold for AI recommendations.
   *
   * When confidence exceeds this threshold, AI recommendations
   * can override legacy estimation values.
   *
   * @returns Override threshold value (0-1)
   */
  getOverrideThreshold(): number {
    return this.config.overrideThreshold;
  }

  /**
   * Check if async processing is enabled.
   *
   * When true, booking returns immediately and analysis
   * happens in the background.
   *
   * @returns True if async processing is enabled
   */
  isAsyncProcessing(): boolean {
    return this.config.asyncProcessing;
  }

  /**
   * Get analysis timeout in milliseconds.
   *
   * After this timeout, legacy estimation is used instead
   * of waiting for media analysis.
   *
   * @returns Timeout in milliseconds
   */
  getAnalysisTimeoutMs(): number {
    return this.config.analysisTimeoutMs;
  }

  /**
   * Get configured provider name.
   *
   * @returns Provider name (e.g., 'openai', 'noop')
   */
  getProvider(): string {
    return this.config.provider;
  }

  /**
   * Get OpenAI-specific configuration.
   *
   * @returns OpenAI configuration object
   */
  getOpenAIConfig(): MediaPerceptionConfig['openai'] {
    return this.config.openai;
  }

  /**
   * Check if media should be processed based on config and media availability.
   *
   * This is a convenience method that combines multiple checks:
   * 1. Media must be available (hasMedia)
   * 2. Feature must be enabled
   *
   * @param hasMedia - Whether media is available for analysis
   * @returns True if media should be processed
   */
  shouldProcessMedia(hasMedia: boolean): boolean {
    if (!hasMedia) {
      return false;
    }

    if (!this.isEnabled()) {
      this.logger.debug('Media perception disabled by configuration');
      return false;
    }

    return true;
  }

  /**
   * Check if intelligence recommendation should override legacy.
   *
   * This determines whether AI-generated values should replace
   * legacy estimation values based on confidence score.
   *
   * @param confidenceScore - Confidence score of the AI insight (0-1)
   * @returns True if AI should override legacy values
   */
  shouldOverrideLegacy(confidenceScore: number): boolean {
    if (!this.isEnabled()) {
      return false;
    }

    return confidenceScore >= this.config.overrideThreshold;
  }

  /**
   * Get full configuration for debugging or admin purposes.
   *
   * Returns a copy of the current configuration.
   * Sensitive values (like API keys) should be redacted in production logs.
   *
   * @returns Copy of the full configuration
   */
  getFullConfig(): MediaPerceptionConfig {
    return { ...this.config };
  }

  /**
   * Check if volume estimation feature is enabled.
   *
   * @returns True if volume estimation is enabled
   */
  isVolumeEstimationEnabled(): boolean {
    return this.isFeatureEnabled('volumeEstimation');
  }

  /**
   * Check if labor estimation feature is enabled.
   *
   * @returns True if labor estimation is enabled
   */
  isLaborEstimationEnabled(): boolean {
    return this.isFeatureEnabled('laborEstimation');
  }

  /**
   * Check if fragility detection feature is enabled.
   *
   * @returns True if fragility detection is enabled
   */
  isFragilityDetectionEnabled(): boolean {
    return this.isFeatureEnabled('fragilityDetection');
  }

  /**
   * Check if item detection feature is enabled.
   *
   * @returns True if item detection is enabled
   */
  isItemDetectionEnabled(): boolean {
    return this.isFeatureEnabled('itemDetection');
  }
}
