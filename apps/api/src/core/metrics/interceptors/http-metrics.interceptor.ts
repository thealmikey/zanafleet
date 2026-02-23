import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { MetricsService } from '../metrics.service';

/**
 * HTTP Metrics Interceptor
 *
 * Tracks HTTP request metrics including:
 * - Request count by route, method, status code
 * - Request duration histogram
 * - Workspace ID from headers for multi-tenant scoping
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpMetricsInterceptor.name);

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const route = request.route?.path || request.path || 'unknown';
    const method = request.method || 'UNKNOWN';
    const workspaceId = request.headers['workspaceid'] || 'unknown';

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (): void => {
          const duration = (Date.now() - startTime) / 1000;
          const status = response.statusCode || 200;

          this.metricsService.incrementHttpRequest({
            route,
            method,
            status: status.toString(),
            workspaceId,
          });

          this.metricsService.observeHttpRequestDuration(
            {
              route,
              method,
              status: status.toString(),
              workspaceId,
            },
            duration,
          );
        },
        error: (): void => {
          const duration = (Date.now() - startTime) / 1000;
          const status = response.statusCode || 500;

          this.metricsService.incrementHttpRequest({
            route,
            method,
            status: status.toString(),
            workspaceId,
          });

          this.metricsService.observeHttpRequestDuration(
            {
              route,
              method,
              status: status.toString(),
              workspaceId,
            },
            duration,
          );

          this.logger.debug(
            `HTTP metrics recorded for failed request: ${method} ${route} - ${status} - ${duration}s`,
          );
        },
      }),
    );
  }
}