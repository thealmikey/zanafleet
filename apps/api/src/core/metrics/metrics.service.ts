import { Injectable, Logger } from '@nestjs/common';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

/**
 * Label types for metrics
 */
export interface MetricsLabels {
  [key: string]: string | number;
}

/**
 * MetricsService
 *
 * Centralized metrics registry using prom-client.
 * Provides factory methods for creating and managing Prometheus metrics.
 * All metrics are multi-tenant aware through workspaceId labeling where applicable.
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly registry: Registry;

  // HTTP Metrics
  private httpRequestCount: Counter | null = null;
  private httpRequestDuration: Histogram | null = null;

  // Event Bus Metrics
  private eventsPublishedTotal: Counter | null = null;
  private eventsPublishedFailed: Counter | null = null;
  private eventPublishDuration: Histogram | null = null;

  // Event Subscriber Metrics
  private eventsConsumedTotal: Counter | null = null;
  private eventConsumeDuration: Histogram | null = null;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });
    this.initializeHttpMetrics();
    this.initializeEventBusMetrics();
    this.initializeEventSubscriberMetrics();
    this.logger.log('MetricsService initialized with default metrics');
  }

  /**
   * Get the Prometheus registry
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Initialize HTTP metrics
   */
  private initializeHttpMetrics(): void {
    this.httpRequestCount = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['route', 'method', 'status', 'workspaceId'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['route', 'method', 'status', 'workspaceId'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });
  }

  /**
   * Initialize Event Bus metrics
   */
  private initializeEventBusMetrics(): void {
    this.eventsPublishedTotal = new Counter({
      name: 'events_published_total',
      help: 'Total number of events published',
      labelNames: ['eventType', 'subject'],
      registers: [this.registry],
    });

    this.eventsPublishedFailed = new Counter({
      name: 'events_published_failed_total',
      help: 'Total number of events published that failed',
      labelNames: ['eventType', 'subject'],
      registers: [this.registry],
    });

    this.eventPublishDuration = new Histogram({
      name: 'event_publish_duration_seconds',
      help: 'Duration of event publishing in seconds',
      labelNames: ['eventType', 'subject'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });
  }

  /**
   * Initialize Event Subscriber metrics
   */
  private initializeEventSubscriberMetrics(): void {
    this.eventsConsumedTotal = new Counter({
      name: 'events_consumed_total',
      help: 'Total number of events consumed by subscribers',
      labelNames: ['eventType', 'subscriber', 'status'],
      registers: [this.registry],
    });

    this.eventConsumeDuration = new Histogram({
      name: 'event_consume_duration_seconds',
      help: 'Duration of event consumption in seconds',
      labelNames: ['eventType', 'subscriber'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });
  }

  // ============= HTTP Metrics Methods =============

  /**
   * Increment HTTP request counter
   * @param labels - Labels including route, method, status, workspaceId
   */
  incrementHttpRequest(labels: MetricsLabels): void {
    if (this.httpRequestCount) {
      this.httpRequestCount.inc(labels as Record<string, string | number>);
    }
  }

  /**
   * Observe HTTP request duration
   * @param labels - Labels including route, method, status, workspaceId
   * @param duration - Duration in seconds
   */
  observeHttpRequestDuration(labels: MetricsLabels, duration: number): void {
    if (this.httpRequestDuration) {
      this.httpRequestDuration.observe(labels as Record<string, string | number>, duration);
    }
  }

  // ============= Event Bus Metrics Methods =============

  /**
   * Increment events published counter
   * @param eventType - The event type
   * @param subject - The NATS subject
   */
  incrementEventsPublished(eventType: string, subject: string): void {
    if (this.eventsPublishedTotal) {
      this.eventsPublishedTotal.inc({ eventType, subject });
    }
  }

  /**
   * Increment events published failed counter
   * @param eventType - The event type
   * @param subject - The NATS subject
   */
  incrementEventsPublishedFailed(eventType: string, subject: string): void {
    if (this.eventsPublishedFailed) {
      this.eventsPublishedFailed.inc({ eventType, subject });
    }
  }

  /**
   * Observe event publish duration
   * @param eventType - The event type
   * @param subject - The NATS subject
   * @param duration - Duration in seconds
   */
  observeEventPublishDuration(eventType: string, subject: string, duration: number): void {
    if (this.eventPublishDuration) {
      this.eventPublishDuration.observe({ eventType, subject }, duration);
    }
  }

  // ============= Event Subscriber Metrics Methods =============

  /**
   * Increment events consumed counter
   * @param eventType - The event type
   * @param subscriber - The subscriber name
   * @param status - The processing status (success/error)
   */
  incrementEventsConsumed(
    eventType: string,
    subscriber: string,
    status: 'success' | 'error'
  ): void {
    if (this.eventsConsumedTotal) {
      this.eventsConsumedTotal.inc({ eventType, subscriber, status });
    }
  }

  /**
   * Observe event consume duration
   * @param eventType - The event type
   * @param subscriber - The subscriber name
   * @param duration - Duration in seconds
   */
  observeEventConsumeDuration(eventType: string, subscriber: string, duration: number): void {
    if (this.eventConsumeDuration) {
      this.eventConsumeDuration.observe({ eventType, subscriber }, duration);
    }
  }

  // ============= Custom Metrics Methods =============

  /**
   * Create a custom counter metric
   * @param name - Metric name
   * @param help - Help text
   * @param labelNames - Label names
   */
  createCounter(name: string, help: string, labelNames: string[] = []): Counter {
    const counter = new Counter({
      name,
      help,
      labelNames,
      registers: [this.registry],
    });
    return counter;
  }

  /**
   * Create a custom histogram metric
   * @param name - Metric name
   * @param help - Help text
   * @param labelNames - Label names
   * @param buckets - Bucket boundaries
   */
  createHistogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets: number[] = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
  ): Histogram {
    const histogram = new Histogram({
      name,
      help,
      labelNames,
      buckets,
      registers: [this.registry],
    });
    return histogram;
  }

  /**
   * Create a custom gauge metric
   * @param name - Metric name
   * @param help - Help text
   * @param labelNames - Label names
   */
  createGauge(name: string, help: string, labelNames: string[] = []): Gauge {
    const gauge = new Gauge({
      name,
      help,
      labelNames,
      registers: [this.registry],
    });
    return gauge;
  }
}
