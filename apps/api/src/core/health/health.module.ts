import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DataSource } from 'typeorm';

import { Neo4jHealthIndicator, NatsHealthIndicator, RedisHealthIndicator } from './index';
import { HealthController } from './health.controller';

/**
 * Health Module
 *
 * Provides health check endpoints for Kubernetes readiness and liveness probes.
 * Uses @nestjs/terminus for standardized health check responses.
 *
 * Endpoints:
 * - GET /api/v1/health/live - Liveness probe (app is running)
 * - GET /api/v1/health/ready - Readiness probe (all dependencies connected)
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [Neo4jHealthIndicator, NatsHealthIndicator, RedisHealthIndicator],
  exports: [Neo4jHealthIndicator, NatsHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
