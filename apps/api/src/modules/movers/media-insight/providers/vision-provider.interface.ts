/**
 * Vision Provider Interface
 *
 * Defines the interface for pluggable vision AI providers that can analyze
 * media (images/videos) and return structured MediaInsight results.
 *
 * @module media-insight/providers
 */

import type { MediaInsight } from '../interfaces';

/**
 * Configuration for vision AI providers.
 * All fields are optional as they may be provided via environment variables.
 */
export interface VisionProviderConfig {
  /** API key for authentication with the provider */
  apiKey?: string;

  /** API endpoint URL (for Azure or custom deployments) */
  endpoint?: string;

  /** Model identifier to use for analysis */
  model?: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Maximum retries on failure */
  maxRetries?: number;
}

/**
 * Request structure for vision analysis.
 */
export interface VisionAnalysisRequest {
  /** Array of image URLs to analyze */
  imageUrls: string[];

  /** Optional custom prompt for the analysis */
  prompt?: string;
}

/**
 * Response structure from vision analysis.
 */
export interface VisionAnalysisResponse {
  /** Raw response from the AI provider for debugging */
  rawResponse: unknown;

  /** Parsed and validated MediaInsight, or null if parsing failed */
  parsedInsight: MediaInsight | null;

  /** Time taken for the analysis in milliseconds */
  processingTimeMs: number;

  /** Model version used for the analysis */
  modelVersion: string;
}

/**
 * Interface for pluggable vision AI providers.
 *
 * Implementations connect to external multimodal AI services
 * such as OpenAI GPT-4 Vision, Google Gemini, or Azure Computer Vision.
 *
 * @example
 * ```typescript
 * class OpenAIVisionProvider implements IVisionProvider {
 *   readonly name = 'openai';
 *   // ... implementation
 * }
 * ```
 */
export interface IVisionProvider {
  /** Unique identifier for this provider */
  readonly name: string;

  /** Whether the provider is currently available for use */
  readonly isAvailable: boolean;

  /**
   * Initialize the provider with configuration.
   * Called once during application startup.
   *
   * @param config - Provider configuration
   */
  initialize(config: VisionProviderConfig): Promise<void>;

  /**
   * Analyze media and return structured insight.
   * Never throws - returns null insight on failure.
   *
   * @param request - Analysis request with image URLs and optional prompt
   * @returns Analysis response with parsed insight or null
   */
  analyze(request: VisionAnalysisRequest): Promise<VisionAnalysisResponse>;

  /**
   * Check if the provider is healthy and can process requests.
   * Used for health checks and monitoring.
   *
   * @returns True if the provider is healthy
   */
  healthCheck(): Promise<boolean>;
}
