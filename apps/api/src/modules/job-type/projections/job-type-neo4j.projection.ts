/**
 * JobTypeNeo4jProjection
 *
 * Neo4j projection handler that manages JobType nodes in the graph database.
 */

import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { JobTypeCreatedEventV1 } from '../events/job-type-created.event';
import { JobTypeUpdatedEventV1 } from '../events/job-type-updated.event';

/**
 * JobTypeNeo4jProjection
 *
 * Listens for JobType events and projects them to Neo4j
 */
@EventsHandler(JobTypeCreatedEventV1, JobTypeUpdatedEventV1)
@Injectable()
export class JobTypeNeo4jProjection
  implements IEventHandler<JobTypeCreatedEventV1 | JobTypeUpdatedEventV1>
{
  private readonly logger = new Logger(JobTypeNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle job type events
   */
  async handle(event: JobTypeCreatedEventV1 | JobTypeUpdatedEventV1): Promise<void> {
    if (event instanceof JobTypeCreatedEventV1) {
      await this.handleJobTypeCreated(event);
    } else if (event instanceof JobTypeUpdatedEventV1) {
      await this.handleJobTypeUpdated(event);
    }
  }

  /**
   * Handle JobTypeCreatedEventV1
   */
  private async handleJobTypeCreated(event: JobTypeCreatedEventV1): Promise<void> {
    this.logger.log(`Handling JobTypeCreatedEventV1 for job type: ${event.jobTypeId}`);

    const session = this.neo4j.getWriteSession();

    try {
      await session.run(
        `
        MERGE (jt:JobType {id: $jobTypeId})
        SET jt.name = $name,
            jt.workspaceId = $workspaceId,
            jt.vertical = $vertical,
            jt.mode = $mode,
            jt.status = $status,
            jt.supportsMultipleWorkers = $supportsMultipleWorkers,
            jt.supportsMultipleDestinations = $supportsMultipleDestinations,
            jt.createdAt = datetime($createdAt),
            jt.updatedAt = datetime($createdAt)
        RETURN jt.id as jobTypeId
        `,
        {
          jobTypeId: event.jobTypeId,
          name: event.name,
          workspaceId: event.workspaceId,
          vertical: event.vertical,
          mode: event.mode,
          status: event.status,
          supportsMultipleWorkers: event.supportsMultipleWorkers,
          supportsMultipleDestinations: event.supportsMultipleDestinations,
          createdAt: event.createdAt.toISOString(),
        }
      );

      this.logger.debug(`JobType node created in Neo4j: ${event.jobTypeId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to project job type to Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Handle JobTypeUpdatedEventV1
   */
  private async handleJobTypeUpdated(event: JobTypeUpdatedEventV1): Promise<void> {
    this.logger.log(`Handling JobTypeUpdatedEventV1 for job type: ${event.jobTypeId}`);

    const session = this.neo4j.getWriteSession();

    try {
      const setClauses: string[] = ['jt.updatedAt = datetime($updatedAt)'];
      const params: Record<string, unknown> = {
        jobTypeId: event.jobTypeId,
        updatedAt: event.updatedAt.toISOString(),
      };

      if (event.name !== undefined) {
        setClauses.push('jt.name = $name');
        params.name = event.name;
      }
      if (event.vertical !== undefined) {
        setClauses.push('jt.vertical = $vertical');
        params.vertical = event.vertical;
      }
      if (event.mode !== undefined) {
        setClauses.push('jt.mode = $mode');
        params.mode = event.mode;
      }
      if (event.status !== undefined) {
        setClauses.push('jt.status = $status');
        params.status = event.status;
      }
      if (event.supportsMultipleWorkers !== undefined) {
        setClauses.push('jt.supportsMultipleWorkers = $supportsMultipleWorkers');
        params.supportsMultipleWorkers = event.supportsMultipleWorkers;
      }
      if (event.supportsMultipleDestinations !== undefined) {
        setClauses.push('jt.supportsMultipleDestinations = $supportsMultipleDestinations');
        params.supportsMultipleDestinations = event.supportsMultipleDestinations;
      }

      await session.run(
        `
        MATCH (jt:JobType {id: $jobTypeId})
        SET ${setClauses.join(', ')}
        RETURN jt.id as jobTypeId
        `,
        params
      );

      this.logger.debug(`JobType node updated in Neo4j: ${event.jobTypeId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to update job type in Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * Neo4j Initialization Service for JobType
 */
@Injectable()
export class JobTypeNeo4jInitializer {
  private readonly logger = new Logger(JobTypeNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Initialize Neo4j constraints and indexes for JobType nodes
   */
  async initialize(): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      // Create unique constraint on JobType.id
      await session.run(
        `CREATE CONSTRAINT jobtype_id_unique IF NOT EXISTS 
         FOR (jt:JobType) REQUIRE jt.id IS UNIQUE`
      );
      this.logger.log('Unique constraint on JobType.id created');

      // Create index on JobType.workspaceId
      await session.run(
        `CREATE INDEX jobtype_workspace_index IF NOT EXISTS 
         FOR (jt:JobType) ON (jt.workspaceId)`
      );
      this.logger.log('Index on JobType.workspaceId created');

      // Create index on JobType.vertical
      await session.run(
        `CREATE INDEX jobtype_vertical_index IF NOT EXISTS 
         FOR (jt:JobType) ON (jt.vertical)`
      );
      this.logger.log('Index on JobType.vertical created');

      // Create index on JobType.status
      await session.run(
        `CREATE INDEX jobtype_status_index IF NOT EXISTS 
         FOR (jt:JobType) ON (jt.status)`
      );
      this.logger.log('Index on JobType.status created');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to initialize Neo4j constraints for JobType: ${err.message}`,
        err.stack
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
