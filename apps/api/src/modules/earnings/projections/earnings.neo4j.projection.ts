import { Injectable, Logger } from '@nestjs/common';
import { IEventHandler } from '@nestjs/cqrs';

import { Neo4jService } from '@api/core/neo4j/neo4j.service';

import { EarningsRecordedEvent } from '../events/earnings-recorded.event';

/**
 * EarningsNeo4jProjection
 *
 * Updates Neo4j graph for real-time earnings visibility.
 * Maintains:
 * - Per-workspace earnings relationships
 * - Cross-workspace total earnings
 * - Transaction counts per workspace
 *
 * This enables:
 * - Real-time earnings dashboards
 * - Cross-workspace earnings queries
 * - Graph-based analytics
 */
@Injectable()
export class EarningsNeo4jProjection implements IEventHandler<EarningsRecordedEvent> {
  private readonly logger = new Logger(EarningsNeo4jProjection.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  async handle(event: EarningsRecordedEvent): Promise<void> {
    const { riderId, workspaceId, grossAmount, netEarnings, jobId, createdAt } = event;

    this.logger.debug(
      `Projecting earnings for rider ${riderId} in workspace ${workspaceId}: ${netEarnings}`
    );

    const session = this.neo4jService.getWriteSession();
    try {
      await session.run(
        `
        MATCH (r:Rider {id: $riderId})
        MATCH (w:Workspace {id: $workspaceId})

        // Update workspace-specific earnings relationship
        MERGE (r)-[rel:WORKS_IN {workspaceId: $workspaceId}]->(w)
        SET rel.totalEarnings = coalesce(rel.totalEarnings, 0) + $netEarnings,
            rel.grossEarnings = coalesce(rel.grossEarnings, 0) + $grossAmount,
            rel.transactionCount = coalesce(rel.transactionCount, 0) + 1,
            rel.lastEarningAt = datetime($createdAt)

        // Update or create cross-workspace total node
        WITH r
        MERGE (r)-[:HAS_TOTAL_EARNINGS]->(total:RiderTotalEarnings {riderId: $riderId})
        SET total.amount = total.amount + $netEarnings,
            total.lastUpdated = datetime($createdAt)
        `,
        {
          riderId,
          workspaceId,
          grossAmount,
          netEarnings,
          jobId,
          createdAt: createdAt.toISOString(),
        }
      );

      this.logger.debug(
        `Successfully projected earnings for rider ${riderId} in workspace ${workspaceId}`
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to project earnings for rider ${riderId}: ${err.message}`,
        err.stack
      );
      // Don't throw - projection failures shouldn't block the main flow
    } finally {
      await session.close();
    }
  }
}

/**
 * Query helper for earnings projections
 */
@Injectable()
export class EarningsGraphQueries {
  constructor(private readonly neo4jService: Neo4jService) {}

  /**
   * Get rider's total earnings across all workspaces
   */
  async getRiderTotalEarnings(riderId: string): Promise<number> {
    const session = this.neo4jService.getReadSession();
    try {
      const result = await session.run(
        `
        MATCH (r:Rider {id: $riderId})-[:HAS_TOTAL_EARNINGS]->(total:RiderTotalEarnings)
        RETURN total.amount as amount
        `,
        { riderId }
      );

      return result.records[0]?.get('amount')?.toNumber() ?? 0;
    } finally {
      await session.close();
    }
  }

  /**
   * Get rider's earnings by workspace
   */
  async getRiderEarningsByWorkspace(
    riderId: string
  ): Promise<{ workspaceId: string; totalEarnings: number; transactionCount: number }[]> {
    const session = this.neo4jService.getReadSession();
    try {
      const result = await session.run(
        `
        MATCH (r:Rider {id: $riderId})-[rel:WORKS_IN]->(w:Workspace)
        RETURN w.id as workspaceId,
               rel.totalEarnings as totalEarnings,
               rel.transactionCount as transactionCount
        ORDER BY totalEarnings DESC
        `,
        { riderId }
      );

      return result.records.map((record) => ({
        workspaceId: record.get('workspaceId'),
        totalEarnings: record.get('totalEarnings')?.toNumber() ?? 0,
        transactionCount: record.get('transactionCount')?.toNumber() ?? 0,
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Get top earning riders in a workspace
   */
  async getTopEarnersInWorkspace(
    workspaceId: string,
    limit: number = 10
  ): Promise<{ riderId: string; totalEarnings: number }[]> {
    const session = this.neo4jService.getReadSession();
    try {
      const result = await session.run(
        `
        MATCH (r:Rider)-[rel:WORKS_IN {workspaceId: $workspaceId}]->(w:Workspace {id: $workspaceId})
        RETURN r.id as riderId, rel.totalEarnings as totalEarnings
        ORDER BY totalEarnings DESC
        LIMIT $limit
        `,
        { workspaceId, limit }
      );

      return result.records.map((record) => ({
        riderId: record.get('riderId'),
        totalEarnings: record.get('totalEarnings')?.toNumber() ?? 0,
      }));
    } finally {
      await session.close();
    }
  }
}
