import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthCheckError, HealthCheckResult } from '@nestjs/terminus';

import { Neo4jService } from '../neo4j/neo4j.service';

/**
 * Health indicator for Neo4j database connectivity.
 * Checks if the Neo4j driver is connected.
 */
@Injectable()
export class Neo4jHealthIndicator extends HealthIndicator {
  constructor(private readonly neo4jService: Neo4jService) {
    super();
  }

  async check(): Promise<HealthCheckResult> {
    const isConnected = this.neo4jService.isConnected();

    const result: HealthCheckResult = {
      status: isConnected ? 'ok' : 'error',
      details: {
        neo4j: {
          status: isConnected ? 'up' : 'down',
        },
      },
    };

    if (!isConnected) {
      throw new HealthCheckError('Neo4j connection failed', result);
    }

    return result;
  }
}
