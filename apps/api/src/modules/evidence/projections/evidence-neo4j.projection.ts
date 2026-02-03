import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { EvidenceCreatedEventV1 } from '../events/evidence-created.event';

/**
 * EvidenceNeo4jProjection
 *
 * Neo4j projection handler that automatically updates the graph database
 * when EvidenceCreatedEvent-V1 is emitted.
 *
 * Architecture:
 * - Listens for EvidenceCreatedEvent-V1 events
 * - Creates/updates Evidence node in Neo4j
 * - Creates RECORDED relationship from Actor to Evidence
 * - Creates ABOUT relationship from Evidence to Workspace
 * - Maintains graph consistency
 *
 * Node Structure:
 * Node: Evidence {id, type, subjectType, subjectId, source, createdAt}
 * Labels: [:Evidence]
 * Relationships:
 *   (:Actor {id})-[:RECORDED {at}]->(:Evidence {id})
 *   (:Evidence {id})-[:ABOUT]->(:Workspace {id})
 *
 * Constraints: UNIQUE (id)
 * Indexes: type, createdAt, (type, createdAt) composite
 */
@EventsHandler(EvidenceCreatedEventV1)
@Injectable()
export class EvidenceNeo4jProjection implements IEventHandler<EvidenceCreatedEventV1> {
  private readonly logger = new Logger(EvidenceNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle EvidenceCreatedEvent-V1
   * Creates Evidence node and establishes RECORDED and ABOUT relationships
   */
  async handle(event: EvidenceCreatedEventV1): Promise<void> {
    this.logger.log(`Handling EvidenceCreatedEvent-V1 for evidence: ${event.evidenceId}`);

    const session = this.neo4j.getWriteSession();

    try {
      await session.run(
        `
        MERGE (e:Evidence {id: $evidenceId})
        SET e.type = $type,
            e.subjectType = $subjectType,
            e.subjectId = $subjectId,
            e.source = $source,
            e.createdAt = datetime($createdAt)
        WITH e
        MATCH (a:Actor {id: $actorId})
        MERGE (a)-[r:RECORDED]->(e)
        SET r.at = datetime($createdAt)
        WITH e
        MATCH (ws:Workspace {id: $workspaceId})
        MERGE (e)-[:ABOUT]->(ws)
        RETURN e.id as id
        `,
        {
          evidenceId: event.evidenceId,
          type: event.type,
          subjectType: event.subjectType,
          subjectId: event.subjectId,
          source: event.source,
          actorId: event.actorId,
          workspaceId: event.workspaceId,
          createdAt: event.createdAt.toISOString(),
        }
      );

      this.logger.debug(
        `Evidence node created/updated in Neo4j with RECORDED and ABOUT relationships: ${event.evidenceId}`
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to project evidence to Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * Neo4j Initialization Service for Evidence
 * Sets up constraints and indexes for Evidence nodes
 * Should be called during module initialization
 */
@Injectable()
export class EvidenceNeo4jInitializer {
  private readonly logger = new Logger(EvidenceNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Initialize Neo4j constraints and indexes
   * Should be called in ModuleOnInit or during bootstrap
   */
  async initialize(): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      // Create UNIQUE constraint on Evidence.id
      await session.run(
        `CREATE CONSTRAINT evidence_id_unique IF NOT EXISTS 
         FOR (e:Evidence) REQUIRE e.id IS UNIQUE`
      );
      this.logger.log('UNIQUE constraint on Evidence.id created');

      // Create index on type for type-based queries
      await session.run(
        `CREATE INDEX evidence_type_index IF NOT EXISTS 
         FOR (e:Evidence) ON (e.type)`
      );
      this.logger.log('Index on Evidence.type created');

      // Create index on createdAt for time-range queries
      await session.run(
        `CREATE INDEX evidence_createdAt_index IF NOT EXISTS 
         FOR (e:Evidence) ON (e.createdAt)`
      );
      this.logger.log('Index on Evidence.createdAt created');

      // Create composite index on (type, createdAt) for filtered time queries
      await session.run(
        `CREATE INDEX evidence_type_createdAt_index IF NOT EXISTS 
         FOR (e:Evidence) ON (e.type, e.createdAt)`
      );
      this.logger.log('Composite index on Evidence.(type, createdAt) created');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to initialize Neo4j constraints/indexes: ${err.message}`,
        err.stack
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
