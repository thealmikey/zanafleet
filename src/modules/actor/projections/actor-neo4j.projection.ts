import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Neo4jService } from '../../../core/neo4j';

import { ActorOnboardedEventV1 } from '../events/actor-onboarded.event';

/**
 * ActorNeo4jProjection
 *
 * Neo4j projection handler that automatically updates the graph database
 * when ActorOnboardedEventV1 is emitted.
 *
 * Architecture:
 * - Listens for ActorOnboardedEventV1 events
 * - Creates/updates Actor node in Neo4j
 * - Creates MEMBER_OF relationship to Workspace node
 * - Maintains graph consistency
 *
 * Node Structure:
 * Node: Actor {id, type, workspaceId, createdAt, updatedAt}
 * Labels: [:Actor]
 * Relationships: [:MEMBER_OF] -> Workspace
 * Constraints: UNIQUE (id)
 *
 * Indexes:
 * - Index on type (for filtering by actor type)
 * - Index on workspaceId (for filtering by workspace)
 */
@EventsHandler(ActorOnboardedEventV1)
@Injectable()
export class ActorNeo4jProjection
  implements IEventHandler<ActorOnboardedEventV1>
{
  private readonly logger = new Logger(ActorNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle ActorOnboardedEventV1
   * Creates or updates Actor node in Neo4j and establishes MEMBER_OF relationship
   */
  async handle(event: ActorOnboardedEventV1): Promise<void> {
    this.logger.log(
      `Handling ActorOnboardedEventV1 for actor: ${event.actorId}`,
    );

    const session = this.neo4j.getSession();

    try {
      // Create/update Actor node and MEMBER_OF relationship to Workspace
      await session.run(
        `
        MERGE (actor:Actor {id: $actorId})
        SET 
          actor.type = $type,
          actor.workspaceId = $workspaceId,
          actor.createdAt = datetime($createdAt),
          actor.updatedAt = datetime($updatedAt)
        WITH actor
        MATCH (workspace:Workspace {id: $workspaceId})
        MERGE (actor)-[:MEMBER_OF]->(workspace)
        RETURN actor.id as id
        `,
        {
          actorId: event.actorId,
          type: event.type,
          workspaceId: event.workspaceId,
          createdAt: event.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
        },
      );

      this.logger.debug(
        `Actor node created/updated in Neo4j with MEMBER_OF relationship: ${event.actorId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to project actor to Neo4j: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * Neo4j Initialization Service
 * Sets up constraints and indexes for Actor nodes
 * Should be called during module initialization
 */
@Injectable()
export class ActorNeo4jInitializer {
  private readonly logger = new Logger(ActorNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Initialize Neo4j constraints and indexes
   * Should be called in ModuleOnInit or during bootstrap
   */
  async initialize(): Promise<void> {
    const session = this.neo4j.getSession();

    try {
      // Create UNIQUE constraint on Actor.id
      await session.run(
        `CREATE CONSTRAINT actor_id_unique IF NOT EXISTS 
         FOR (actor:Actor) REQUIRE actor.id IS UNIQUE`,
      );
      this.logger.log('UNIQUE constraint on Actor.id created');

      // Create index on type for filtering
      await session.run(
        `CREATE INDEX actor_type_index IF NOT EXISTS 
         FOR (actor:Actor) ON (actor.type)`,
      );
      this.logger.log('Index on Actor.type created');

      // Create index on workspaceId for filtering
      await session.run(
        `CREATE INDEX actor_workspaceId_index IF NOT EXISTS 
         FOR (actor:Actor) ON (actor.workspaceId)`,
      );
      this.logger.log('Index on Actor.workspaceId created');
    } catch (error) {
      this.logger.error(
        `Failed to initialize Neo4j constraints/indexes: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
