/**
 * Media Perception Configuration
 *
 * Configuration interface and defaults for the media perception feature.
 * Provides feature toggles and runtime configuration for media analysis.
 *
 * @module media-insight/config
 */

import { registerAs } from '@nestjs/config';

/**
 * Media Perception Configuration Interface
 *
 * Defines all configuration options for the media perception feature.
 */
export interface MediaPerceptionConfig {
  /**
   * Master toggle for the entire media perception feature
   * When false, all media analysis is skipped
   */
  enabled: boolean;

  /**
   * Minimum confidence threshold (0-1) for media insights to be used
   * Insights below this threshold are discarded
   */
  confidenceThreshold: number;

  /**
   * Override threshold for intelligence recommendations
   * If confidence exceeds this, AI recommendation overrides legacy
   */
  overrideThreshold: number;

  /**
   * Maximum time to wait for media analysis (ms)
   * After this timeout, legacy estimation is used
   */
  analysisTimeoutMs: number;

  /**
   * Whether to process media asynchronously
   * When true, booking returns immediately and analysis happens in background
   */
  asyncProcessing: boolean;

  /**
   * Vision provider to use: 'openai', 'google', 'azure', 'noop'
   */
  provider: string;

  /**
   * OpenAI-specific configuration
   */
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };

  /**
   * Feature flags for specific capabilities
   */
  features: {
    volumeEstimation: boolean;
    laborEstimation: boolean;
    fragilityDetection: boolean;
    itemDetection: boolean;
  };
}

/**
 * Media Perception Configuration Factory
 *
 * Registers the configuration with NestJS ConfigModule.
 * Reads values from environment variables with sensible defaults.
 */
export const mediaPerceptionConfig = registerAs(
  'mediaPerception',
  (): MediaPerceptionConfig => ({
    enabled: process.env.MEDIA_PERCEPTION_ENABLED === 'true',
    confidenceThreshold: parseFloat(process.env.MEDIA_PERCEPTION_CONFIDENCE_THRESHOLD || '0.7'),
    overrideThreshold: parseFloat(process.env.MEDIA_PERCEPTION_OVERRIDE_THRESHOLD || '0.85'),
    analysisTimeoutMs: parseInt(process.env.MEDIA_PERCEPTION_TIMEOUT_MS || '30000', 10),
    asyncProcessing: process.env.MEDIA_PERCEPTION_ASYNC !== 'false', // Default true
    provider: process.env.MEDIA_PERCEPTION_PROVIDER || 'noop',
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
    },
    features: {
      volumeEstimation: process.env.MEDIA_FEATURE_VOLUME !== 'false',
      laborEstimation: process.env.MEDIA_FEATURE_LABOR !== 'false',
      fragilityDetection: process.env.MEDIA_FEATURE_FRAGILITY !== 'false',
      itemDetection: process.env.MEDIA_FEATURE_ITEMS !== 'false',
    },
  })
);

/**
 * Default Media Perception Configuration
 *
 * Hardcoded defaults used when configuration is not available.
 * Feature is DISABLED by default for safety.
 */
export const DEFAULT_MEDIA_PERCEPTION_CONFIG: MediaPerceptionConfig = {
  enabled: false,
  confidenceThreshold: 0.7,
  overrideThreshold: 0.85,
  analysisTimeoutMs: 30000,
  asyncProcessing: true,
  provider: 'noop',
  openai: {
    apiKey: '',
    model: 'gpt-4o',
    maxTokens: 4096,
  },
  features: {
    volumeEstimation: true,
    laborEstimation: true,
    fragilityDetection: true,
    itemDetection: true,
  },
};
