import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { CommitmentStatus } from '../dto/commitment.enums';
import { CommitmentCreatedEventV1 } from '../events/commitment-created.event';
import { CommitmentStatusChangedEventV1 } from '../events/commitment-status-changed.event';

/**
 * CommitmentNeo4jProjection
 *
 * Neo4j projection handler that manages Commitment nodes and relationships.
 *
 * Architecture:
 * - Listens for CommitmentCreatedEvent-V1 and CommitmentStatusChangedEvent-V1 events
 * - Creates Commitment nodes with COMMITTED and IN_WORKSPACE relationships
 * - Adds :Breached label on breach
 *
 * Node Structure:
 * Node: Commitment {id, type, status, description, dueAt, createdAt}
 * Labels: [:Commitment], [:Breached] (for breached commitments)
 * Relationships:
 *   (:Actor)-[:COMMITTED]->(:Commitment)
 *   (:Commitment)-[:IN_WORKSPACE]->(:Workspace)
 */
@EventsHandler(CommitmentCreatedEventV1, CommitmentStatusChangedEventV1)
@Injectable()
export class CommitmentNeo4jProjection
  implements IEventHandler<CommitmentCreatedEventV1 | CommitmentStatusChangedEventV1>
{
  private readonly logger = new Logger(CommitmentNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle commitment events
   * Routes to appropriate handler based on event type
   */
  async handle(event: CommitmentCreatedEventV1 | CommitmentStatusChangedEventV1): Promise<void> {
    if (event instanceof CommitmentCreatedEventV1) {
      await this.handleCommitmentCreated(event);
    } else if (event instanceof CommitmentStatusChangedEventV1) {
      await this.handleStatusChanged(event);
    }
  }

  /**
   * Handle CommitmentCreatedEvent-V1
   * Creates Commitment node with COMMITTED and IN_WORKSPACE relationships
   */
  private async handleCommitmentCreated(event: CommitmentCreatedEventV1): Promise<void> {
    this.logger.log(`Handling CommitmentCreatedEvent-V1 for commitment: ${event.commitmentId}`);

    const session = this.neo4j.getWriteSession();

    try {
      await session.run(
        `
        MERGE (c:Commitment {id: $commitmentId})
        SET c.type = $type, c.status = $status, c.description = $description, c.dueAt = datetime($dueAt), c.createdAt = datetime($createdAt)
        WITH c
        MATCH (a:Actor {id: $actorId})
        MERGE (a)-[:COMMITTED]->(c)
        WITH c
        MATCH (ws:Workspace {id: $workspaceId})
        MERGE (c)-[:IN_WORKSPACE]->(ws)
        RETURN c.id as id
        `,
        {
          commitmentId: event.commitmentId,
          actorId: event.actorId,
          workspaceId: event.workspaceId,
          type: event.type,
          status: event.status,
          description: event.description,
          dueAt: event.dueAt.toISOString(),
          createdAt: event.createdAt.toISOString(),
        }
      );

      this.logger.debug(
        `Commitment node created in Neo4j with relationships: ${event.commitmentId}`
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to project commitment to Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Handle CommitmentStatusChangedEvent-V1
   * Updates status and adds :Breached label for breached commitments
   */
  private async handleStatusChanged(event: CommitmentStatusChangedEventV1): Promise<void> {
    this.logger.log(
      `Handling CommitmentStatusChangedEvent-V1 for commitment: ${event.commitmentId}`
    );

    const session = this.neo4j.getWriteSession();

    try {
      if (event.newStatus === CommitmentStatus.BREACHED) {
        await session.run(
          `
          MATCH (c:Commitment {id: $commitmentId})
          SET c.status = $newStatus, c:Breached
          RETURN c.id as id
          `,
          {
            commitmentId: event.commitmentId,
            newStatus: event.newStatus,
          }
        );

        this.logger.debug(`Commitment node updated with :Breached label: ${event.commitmentId}`);
      } else {
        await session.run(
          `
          MATCH (c:Commitment {id: $commitmentId})
          SET c.status = $newStatus
          RETURN c.id as id
          `,
          {
            commitmentId: event.commitmentId,
            newStatus: event.newStatus,
          }
        );

        this.logger.debug(`Commitment node status updated in Neo4j: ${event.commitmentId}`);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to update commitment status in Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * Neo4j Initialization Service for Commitment
 * Sets up constraints and indexes for Commitment nodes
 * Should be called during module initialization
 */
@Injectable()
export class CommitmentNeo4jInitializer {
  private readonly logger = new Logger(CommitmentNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Initialize Neo4j constraints and indexes
   * Should be called in ModuleOnInit or during bootstrap
   */
  async initialize(): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      // Create UNIQUE constraint on Commitment.id
      await session.run(
        `CREATE CONSTRAINT commitment_id_unique IF NOT EXISTS 
         FOR (c:Commitment) REQUIRE c.id IS UNIQUE`
      );
      this.logger.log('UNIQUE constraint on Commitment.id created');

      // Create index on status for filtering
      await session.run(
        `CREATE INDEX commitment_status_index IF NOT EXISTS 
         FOR (c:Commitment) ON (c.status)`
      );
      this.logger.log('Index on Commitment.status created');

      // Create index on dueAt for time-based queries
      await session.run(
        `CREATE INDEX commitment_dueAt_index IF NOT EXISTS 
         FOR (c:Commitment) ON (c.dueAt)`
      );
      this.logger.log('Index on Commitment.dueAt created');

      // Create index on createdAt for time-based queries
      await session.run(
        `CREATE INDEX commitment_createdAt_index IF NOT EXISTS 
         FOR (c:Commitment) ON (c.createdAt)`
      );
      this.logger.log('Index on Commitment.createdAt created');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to initialize Neo4j constraints/indexes for Commitment: ${err.message}`,
        err.stack
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
