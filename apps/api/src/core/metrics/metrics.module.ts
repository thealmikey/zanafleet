import { Module, Global, NestModule, MiddlewareConsumer } from '@nestjs/common';

import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { HttpMetricsInterceptor } from './interceptors/http-metrics.interceptor';

/**
 * Metrics Module
 *
 * Provides centralized metrics collection using prom-client.
 * Supports HTTP request tracking and event bus metrics.
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [MetricsModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, HttpMetricsInterceptor],
  exports: [MetricsService],
})
export class MetricsModule implements NestModule {
  configure(_consumer: MiddlewareConsumer): void {
    // Middleware configuration if needed
  }
}
