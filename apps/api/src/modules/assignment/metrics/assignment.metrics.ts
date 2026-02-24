import { Injectable, Logger } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

/**
 * Assignment Metrics
 *
 * Custom metrics for the assignment engine.
 */
@Injectable()
export class AssignmentMetrics {
  private readonly logger = new Logger(AssignmentMetrics.name);
  private readonly registry: Registry;

  // Assignment duration histogram
  assignmentDuration!: Histogram;

  // Assignment success/failure counters
  assignmentSuccess!: Counter;
  assignmentFailure!: Counter;

  // Worker candidates evaluated histogram
  workerCandidatesEvaluated!: Histogram;

  // Assignment backlog gauge
  assignmentBacklog!: Gauge;

  constructor() {
    this.registry = new Registry();
    this.initializeMetrics();
    this.logger.log('Assignment metrics initialized');
  }

  private initializeMetrics(): void {
    // Assignment duration
    this.assignmentDuration = new Histogram({
      name: 'assignment_strategy_duration_seconds',
      help: 'Duration of assignment strategy execution in seconds',
      labelNames: ['strategy', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    // Assignment success
    this.assignmentSuccess = new Counter({
      name: 'assignment_success_total',
      help: 'Total number of successful assignments',
      labelNames: ['strategy', 'workspace_id'],
      registers: [this.registry],
    });

    // Assignment failure
    this.assignmentFailure = new Counter({
      name: 'assignment_failure_total',
      help: 'Total number of failed assignments',
      labelNames: ['strategy', 'reason', 'workspace_id'],
      registers: [this.registry],
    });

    // Worker candidates evaluated
    this.workerCandidatesEvaluated = new Histogram({
      name: 'worker_candidates_evaluated',
      help: 'Number of worker candidates evaluated per assignment',
      labelNames: ['strategy'],
      buckets: [1, 5, 10, 20, 50, 100],
      registers: [this.registry],
    });

    // Assignment backlog
    this.assignmentBacklog = new Gauge({
      name: 'assignment_backlog',
      help: 'Number of pending assignments waiting to be processed',
      labelNames: ['workspace_id'],
      registers: [this.registry],
    });
  }

  /**
   * Record assignment duration.
   */
  recordDuration(labels: { strategy: string; status: string }, durationSeconds: number): void {
    this.assignmentDuration.labels(labels).observe(durationSeconds);
  }

  /**
   * Increment assignment success counter.
   */
  incrementSuccess(labels: { strategy: string; workspace_id: string }): void {
    this.assignmentSuccess.labels(labels).inc();
  }

  /**
   * Increment assignment failure counter.
   */
  incrementFailure(labels: { strategy: string; reason: string; workspace_id: string }): void {
    this.assignmentFailure.labels(labels).inc();
  }

  /**
   * Record number of candidates evaluated.
   */
  recordCandidatesEvaluated(labels: { strategy: string }, count: number): void {
    this.workerCandidatesEvaluated.labels(labels).observe(count);
  }

  /**
   * Set assignment backlog gauge.
   */
  setBacklog(labels: { workspace_id: string }, count: number): void {
    this.assignmentBacklog.labels(labels).set(count);
  }

  /**
   * Get metrics registry.
   */
  getRegistry(): Registry {
    return this.registry;
  }
}
