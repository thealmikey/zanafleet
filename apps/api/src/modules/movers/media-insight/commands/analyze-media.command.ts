/**
 * Analyze Media Command
 *
 * Command for triggering async media analysis in the Move Intelligence system.
 * Follows the CQRS pattern where commands represent an intent to change state.
 *
 * @module media-insight/commands
 */

import { ICommand } from '@nestjs/cqrs';

/**
 * Media reference payload for analysis.
 * Supports both URLs and internal asset references.
 */
export interface MediaReferencePayload {
  /** Direct URL to the media, if accessible */
  url?: string;

  /** Media asset ID from the media module */
  assetId?: string;

  /** Type of media */
  type: 'image' | 'video';
}

/**
 * Payload for the AnalyzeMediaCommand.
 */
export interface AnalyzeMediaPayload {
  /** ID of the order associated with this media analysis */
  orderId: string;

  /** Array of media references to analyze */
  mediaReferences: MediaReferencePayload[];

  /** Correlation ID for tracing across services */
  correlationId: string;
}

/**
 * AnalyzeMediaCommand
 *
 * Command that triggers async media analysis for move intelligence.
 * This command is handled by AnalyzeMediaHandler which:
 * 1. Calls the MediaPerceptionAdapter to analyze media
 * 2. Emits MediaInsightEvents on success or failure
 *
 * @example
 * ```typescript
 * const command = new AnalyzeMediaCommand({
 *   orderId: 'order-123',
 *   mediaReferences: [
 *     { url: 'https://example.com/photo1.jpg', type: 'image' },
 *     { assetId: 'asset-456', type: 'image' }
 *   ],
 *   correlationId: 'corr-789'
 * });
 * ```
 */
export class AnalyzeMediaCommand implements ICommand {
  /**
   * Creates an instance of AnalyzeMediaCommand.
   * @param payload - The command payload containing order ID, media references, and correlation ID
   */
  constructor(public readonly payload: AnalyzeMediaPayload) {}
}
