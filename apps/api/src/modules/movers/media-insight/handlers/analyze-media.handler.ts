/**
 * Analyze Media Handler
 *
 * Command handler for async media analysis processing.
 * Follows the Command → Event → Handler → Projection pattern.
 *
 * @module media-insight/handlers
 */

import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../../core/event-bus/event-bus.service';
import { AnalyzeMediaCommand } from '../commands/analyze-media.command';
import { MediaInsightEvents } from '../events/media-insight.events';
import { MediaPerceptionAdapter, MediaReference } from '../services/media-perception-adapter.service';

/**
 * AnalyzeMediaHandler
 *
 * Handles the AnalyzeMediaCommand by:
 * 1. Calling the MediaPerceptionAdapter to analyze media
 * 2. Emitting MediaInsightEvents.GeneratedV1 on success
 * 3. Emitting MediaInsightEvents.FailedV1 on failure
 *
 * Design principles:
 * - Non-blocking: Never throws, always emits an event
 * - Graceful degradation: Failures are logged and emitted as events
 * - Traceable: Uses correlation and causation IDs for tracing
 */
@CommandHandler(AnalyzeMediaCommand)
export class AnalyzeMediaHandler implements ICommandHandler<AnalyzeMediaCommand> {
  private readonly logger = new Logger(AnalyzeMediaHandler.name);

  constructor(
    private readonly mediaPerceptionAdapter: MediaPerceptionAdapter,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Execute the media analysis command.
   *
   * @param command - The AnalyzeMediaCommand to execute
   * @returns Promise<void> - Handler does not return a value, emits events instead
   */
  async execute(command: AnalyzeMediaCommand): Promise<void> {
    const { orderId, mediaReferences, correlationId } = command.payload;
    const causationId = uuidv4();

    this.logger.debug(`Starting media analysis for order ${orderId}`);

    try {
      // Convert payload media references to adapter media references
      const adapterMediaRefs: MediaReference[] = mediaReferences.map((ref) => ({
        url: ref.url,
        assetId: ref.assetId,
        type: ref.type,
      }));

      // Call the media perception adapter
      const result = await this.mediaPerceptionAdapter.analyzeMedia(adapterMediaRefs);

      if (result.status === 'success' && result.insight) {
        // Emit success event
        await this.eventBus.publishEvent(
          new MediaInsightEvents.GeneratedV1({
            eventId: uuidv4(),
            aggregateId: orderId,
            payload: {
              orderId,
              mediaInsight: result.insight,
              processingTimeMs: result.processingTimeMs,
            },
            correlationId,
            causationId,
          }),
        );

        this.logger.debug(
          `Media analysis completed for order ${orderId} in ${result.processingTimeMs}ms`,
        );
      } else {
        // Emit failure event
        await this.eventBus.publishEvent(
          new MediaInsightEvents.FailedV1({
            eventId: uuidv4(),
            aggregateId: orderId,
            payload: {
              orderId,
              errorCode: result.errorCode || 'UNKNOWN',
              errorMessage: result.errorMessage || 'Media analysis failed',
            },
            correlationId,
            causationId,
          }),
        );

        this.logger.warn(
          `Media analysis failed for order ${orderId}: ${result.errorCode ?? ''} - ${result.errorMessage ?? ''}`,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Media analysis error for order ${orderId}: ${errorMessage}`);

      // Emit failure event - never throw from handler
      await this.eventBus.publishEvent(
        new MediaInsightEvents.FailedV1({
          eventId: uuidv4(),
          aggregateId: orderId,
          payload: {
            orderId,
            errorCode: 'HANDLER_ERROR',
            errorMessage,
          },
          correlationId,
          causationId,
        }),
      );
    }
  }
}
