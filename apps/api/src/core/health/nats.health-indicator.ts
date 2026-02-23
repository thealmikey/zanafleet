import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthCheckError, HealthCheckResult } from '@nestjs/terminus';

import { EventBusService } from '../event-bus/event-bus.service';

/**
 * Health indicator for NATS (Event Bus) connectivity.
 * Checks if the NATS client is connected and ready.
 */
@Injectable()
export class NatsHealthIndicator extends HealthIndicator {
  constructor(private readonly eventBusService: EventBusService) {
    super();
  }

  async check(): Promise<HealthCheckResult> {
    const isReady = this.eventBusService.isReady();

    const result: HealthCheckResult = {
      status: isReady ? 'ok' : 'error',
      details: {
        nats: {
          status: isReady ? 'up' : 'down',
        },
      },
    };

    if (!isReady) {
      throw new HealthCheckError('NATS connection failed', result);
    }

    return result;
  }
}
