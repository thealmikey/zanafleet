/**
 * Media Insight Events
 *
 * Event definitions for the Media Insight module following ZanaFleet naming convention.
 * Event naming: <Module>.<Entity>.<Action>V<Number>
 *
 * @module media-insight/events
 */

/* eslint-disable @typescript-eslint/no-namespace */

import { BaseEvent } from '../../../../core/event-bus/interfaces/base-event.interface';
import type { MediaInsight } from '../interfaces';

/**
 * MediaInsightEvents namespace
 *
 * Contains all event classes for the media insight module.
 * Events are emitted when media analysis completes or fails.
 */
export namespace MediaInsightEvents {
  /**
   * MediaInsightGeneratedV1
   *
   * Emitted when media analysis completes successfully.
   * This event triggers the IntelligenceSnapshotService to update
   * the snapshot with the new media insight data.
   *
   * Event Type: Movers.MediaInsight.GeneratedV1
   */
  export class GeneratedV1 implements BaseEvent {
    /** Unique identifier for this event instance */
    public readonly eventId: string;

    /** Event type following ZanaFleet naming convention */
    public readonly eventType = 'Movers.MediaInsight.GeneratedV1';

    /** Semantic version of the event schema */
    public readonly eventVersion = '1.0.0';

    /** Timestamp when the event occurred */
    public readonly occurredAt: Date;

    /** ID of the aggregate (order) this event relates to */
    public readonly aggregateId: string;

    /** Type of the aggregate */
    public readonly aggregateType = 'MediaInsight';

    /** Correlation ID for tracing */
    public readonly correlationId: string;

    /** ID of the command/event that caused this event */
    public readonly causationId: string;

    /** Event payload containing the analysis result */
    public readonly payload: {
      /** ID of the order associated with this analysis */
      orderId: string;
      /** The generated media insight */
      mediaInsight: MediaInsight;
      /** Time taken to process the analysis in milliseconds */
      processingTimeMs: number;
    };

    /**
     * Creates an instance of GeneratedV1.
     * @param params - Event parameters
     */
    constructor(params: {
      eventId: string;
      aggregateId: string;
      payload: { orderId: string; mediaInsight: MediaInsight; processingTimeMs: number };
      correlationId: string;
      causationId: string;
    }) {
      this.eventId = params.eventId;
      this.aggregateId = params.aggregateId;
      this.correlationId = params.correlationId;
      this.causationId = params.causationId;
      this.occurredAt = new Date();
      this.payload = params.payload;
    }
  }

  /**
   * MediaInsightFailedV1
   *
   * Emitted when media analysis fails.
   * This event can be used for alerting, fallback logic, or retry mechanisms.
   *
   * Event Type: Movers.MediaInsight.FailedV1
   */
  export class FailedV1 implements BaseEvent {
    /** Unique identifier for this event instance */
    public readonly eventId: string;

    /** Event type following ZanaFleet naming convention */
    public readonly eventType = 'Movers.MediaInsight.FailedV1';

    /** Semantic version of the event schema */
    public readonly eventVersion = '1.0.0';

    /** Timestamp when the event occurred */
    public readonly occurredAt: Date;

    /** ID of the aggregate (order) this event relates to */
    public readonly aggregateId: string;

    /** Type of the aggregate */
    public readonly aggregateType = 'MediaInsight';

    /** Correlation ID for tracing */
    public readonly correlationId: string;

    /** ID of the command/event that caused this event */
    public readonly causationId: string;

    /** Event payload containing error details */
    public readonly payload: {
      /** ID of the order associated with this analysis */
      orderId: string;
      /** Error code for programmatic handling */
      errorCode: string;
      /** Human-readable error message */
      errorMessage: string;
    };

    /**
     * Creates an instance of FailedV1.
     * @param params - Event parameters
     */
    constructor(params: {
      eventId: string;
      aggregateId: string;
      payload: { orderId: string; errorCode: string; errorMessage: string };
      correlationId: string;
      causationId: string;
    }) {
      this.eventId = params.eventId;
      this.aggregateId = params.aggregateId;
      this.correlationId = params.correlationId;
      this.causationId = params.causationId;
      this.occurredAt = new Date();
      this.payload = params.payload;
    }
  }
}
