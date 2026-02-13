/**
 * MediaInsight Result Interface Definitions
 *
 * Defines the result wrapper for media analysis operations,
 * including status tracking and error handling.
 *
 * @module media-insight
 */

import type { MediaInsight } from './media-insight.interface';

/**
 * Status of a media analysis operation.
 * Used to track the outcome of media insight processing.
 */
export type MediaInsightStatus =
  | 'success' // Analysis completed successfully
  | 'failed' // Analysis failed with error
  | 'skipped'; // Analysis was skipped (no media, disabled, etc.)

/**
 * Error codes for media insight failures.
 * Used for programmatic error handling and logging.
 */
export type MediaInsightErrorCode =
  | 'NO_MEDIA_PROVIDED' // No media assets were provided
  | 'MEDIA_NOT_ACCESSIBLE' // Media could not be accessed or downloaded
  | 'PROVIDER_UNAVAILABLE' // AI provider service is unavailable
  | 'PROVIDER_TIMEOUT' // AI provider request timed out
  | 'INVALID_RESPONSE' // AI provider returned invalid response
  | 'VALIDATION_FAILED' // Response failed validation
  | 'FEATURE_DISABLED'; // Media perception feature is disabled by configuration

/**
 * Result wrapper for media analysis operations.
 *
 * This interface wraps the MediaInsight with status information,
 * enabling proper error handling and tracking of processing outcomes.
 *
 * @example
 * ```typescript
 * const result: MediaInsightResult = {
 *   status: 'success',
 *   insight: {
 *     schemaVersion: '1.0.0',
 *     detectedItems: [...],
 *     // ... other fields
 *   },
 *   processingTimeMs: 1500
 * };
 * ```
 */
export interface MediaInsightResult {
  /** Status indicating the outcome of the analysis */
  status: MediaInsightStatus;

  /** The analysis result, null if failed or skipped */
  insight: MediaInsight | null;

  /** Error code for programmatic handling, present when status is 'failed' */
  errorCode?: MediaInsightErrorCode;

  /** Human-readable error message, present when status is 'failed' */
  errorMessage?: string;

  /** Time taken to process the analysis in milliseconds */
  processingTimeMs: number;
}
