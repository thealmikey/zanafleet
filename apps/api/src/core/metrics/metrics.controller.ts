import { Controller, Get, HttpCode, HttpStatus, Logger, Res } from '@nestjs/common';
import { Response } from 'express';

import { MetricsService } from './metrics.service';

/**
 * Metrics Controller
 *
 * Exposes Prometheus-compatible metrics endpoint.
 * Used by Prometheus to scrape application metrics.
 *
 * Endpoint:
 * - GET /api/v1/metrics - Returns Prometheus format metrics
 */
@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Prometheus metrics endpoint
   * Returns all registered metrics in Prometheus format
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getMetrics(@Res() res: Response): Promise<void> {
    try {
      const registry = this.metricsService.getRegistry();
      const metrics = await registry.metrics();
      res.set('Content-Type', registry.contentType);
      res.send(metrics);
    } catch (error) {
      this.logger.error(`Failed to generate metrics: ${(error as Error).message}`);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Failed to generate metrics',
      });
    }
  }
}