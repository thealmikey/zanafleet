import { Controller, Get, HttpCode, HttpStatus, Logger, Inject, Optional } from '@nestjs/common';
import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { DataSource } from 'typeorm';

import { Neo4jHealthIndicator, NatsHealthIndicator, RedisHealthIndicator } from './index';

/**
 * Health Controller
 *
 * Provides endpoints for Kubernetes liveness and readiness probes.
 *
 * Endpoints:
 * - GET /api/v1/health/live - Liveness probe (always returns ok if app is running)
 * - GET /api/v1/health/ready - Readiness probe (checks all dependencies)
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly neo4jHealthIndicator: Neo4jHealthIndicator,
    private readonly natsHealthIndicator: NatsHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
    @Optional() @Inject(DataSource) private readonly dataSource: DataSource | null
  ) {}

  /**
   * Liveness probe endpoint
   * Returns 200 OK if the application is running
   * Used by Kubernetes to know when to restart a pod
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe endpoint
   * Returns 200 OK if all dependencies are connected
   * Used by Kubernetes to know when a pod is ready to receive traffic
   */
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready(): Promise<HealthCheckResult> {
    const checks: (() => Promise<HealthCheckResult>)[] = [];

    // Add PostgreSQL check if dataSource is available
    if (this.dataSource && typeof this.dataSource.query === 'function') {
      checks.push(async () => {
        try {
          await this.dataSource!.query('SELECT 1');
          return {
            status: 'ok',
            details: { postgres: { status: 'up' } },
          };
        } catch (error) {
          return {
            status: 'error',
            details: { postgres: { status: 'down', error: (error as Error).message } },
          };
        }
      });
    }

    // Add Neo4j check
    checks.push(() => this.neo4jHealthIndicator.check());

    // Add NATS check
    checks.push(() => this.natsHealthIndicator.check());

    // Add Redis check (optional - won't fail the readiness check)
    checks.push(async () => {
      try {
        return await this.redisHealthIndicator.check();
      } catch {
        // Redis is optional, return a healthy result
        return {
          status: 'ok',
          details: { redis: { status: 'up', note: 'optional' } },
        };
      }
    });

    // Run all health checks
    const results = await Promise.all(checks.map((check) => check()));

    // Aggregate results
    const details: Record<string, { status: string; error?: string; note?: string }> = {};
    let overallStatus: 'ok' | 'error' = 'ok';

    for (const result of results) {
      if (result.details) {
        Object.assign(details, result.details);
      }
      if (result.status === 'error') {
        overallStatus = 'error';
      }
    }

    return {
      status: overallStatus,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details: details as any,
    };
  }
}
