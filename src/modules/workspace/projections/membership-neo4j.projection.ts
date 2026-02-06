import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { Neo4jService } from '../../../core/neo4j';
import { ActorAddedToWorkspaceEventV1 } from '../events/actor-added-to-workspace.event';
import { ActorRemovedFromWorkspaceEventV1 } from '../events/actor-removed-from-workspace.event';

/**
 * MembershipNeo4jProjection
 *
 * Neo4j projection handler that manages MEMBER_OF relationships
 * between Actor and Workspace nodes in the graph database.
 *
 * Architecture:
 * - Listens for ActorAddedToWorkspaceEvent-V1 and ActorRemovedFromWorkspaceEvent-V1 events
 * - Creates/removes MEMBER_OF relationships in Neo4j
 * - Maintains graph consistency with Postgres membership records
 *
 * Relationship Structure:
 * (:Actor {id})-[:MEMBER_OF {role, since}]->(:Workspace {id})
 *
 * Properties:
 * - role: MembershipRole enum value
 * - since: DateTime when membership started
 */
@EventsHandler(ActorAddedToWorkspaceEventV1, ActorRemovedFromWorkspaceEventV1)
@Injectable()
export class MembershipNeo4jProjection
  implements IEventHandler<ActorAddedToWorkspaceEventV1 | ActorRemovedFromWorkspaceEventV1>
{
  private readonly logger = new Logger(MembershipNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle membership events
   * Routes to appropriate handler based on event type
   */
  async handle(
    event: ActorAddedToWorkspaceEventV1 | ActorRemovedFromWorkspaceEventV1
  ): Promise<void> {
    if (event instanceof ActorAddedToWorkspaceEventV1) {
      await this.handleActorAdded(event);
    } else if (event instanceof ActorRemovedFromWorkspaceEventV1) {
      await this.handleActorRemoved(event);
    }
  }

  /**
   * Handle ActorAddedToWorkspaceEvent-V1
   * Creates MEMBER_OF relationship using MERGE for idempotency
   */
  private async handleActorAdded(event: ActorAddedToWorkspaceEventV1): Promise<void> {
    this.logger.log(
      `Handling ActorAddedToWorkspaceEvent-V1: actor=${event.actorId}, workspace=${event.workspaceId}`
    );

    const session = this.neo4j.getWriteSession();

    try {
      await session.run(
        `
        MATCH (a:Actor {id: $actorId})
        MATCH (ws:Workspace {id: $workspaceId})
        MERGE (a)-[r:MEMBER_OF]->(ws)
        SET r.role = $role, r.since = datetime($since)
        RETURN a.id as actorId, ws.id as workspaceId
        `,
        {
          actorId: event.actorId,
          workspaceId: event.workspaceId,
          role: event.role,
          since: event.since.toISOString(),
        }
      );

      this.logger.debug(
        `MEMBER_OF relationship created/updated in Neo4j: actor=${event.actorId}, workspace=${event.workspaceId}`
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to project membership to Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Handle ActorRemovedFromWorkspaceEvent-V1
   * Deletes MEMBER_OF relationship
   */
  private async handleActorRemoved(event: ActorRemovedFromWorkspaceEventV1): Promise<void> {
    this.logger.log(
      `Handling ActorRemovedFromWorkspaceEvent-V1: actor=${event.actorId}, workspace=${event.workspaceId}`
    );

    const session = this.neo4j.getWriteSession();

    try {
      await session.run(
        `
        MATCH (a:Actor {id: $actorId})-[r:MEMBER_OF]->(ws:Workspace {id: $workspaceId})
        DELETE r
        `,
        {
          actorId: event.actorId,
          workspaceId: event.workspaceId,
        }
      );

      this.logger.debug(
        `MEMBER_OF relationship deleted from Neo4j: actor=${event.actorId}, workspace=${event.workspaceId}`
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to delete membership from Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * Neo4j Initialization Service for Membership
 * Sets up indexes for MEMBER_OF relationships
 * Should be called during module initialization
 */
@Injectable()
export class MembershipNeo4jInitializer {
  private readonly logger = new Logger(MembershipNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Initialize Neo4j indexes for MEMBER_OF relationships
   * Should be called in ModuleOnInit or during bootstrap
   */
  async initialize(): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      // Create index on MEMBER_OF.role for efficient queries by role
      await session.run(
        `CREATE INDEX member_of_role_index IF NOT EXISTS 
         FOR ()-[r:MEMBER_OF]-() ON (r.role)`
      );
      this.logger.log('Index on MEMBER_OF.role created');

      // Create index on MEMBER_OF.since for time-based queries
      await session.run(
        `CREATE INDEX member_of_since_index IF NOT EXISTS 
         FOR ()-[r:MEMBER_OF]-() ON (r.since)`
      );
      this.logger.log('Index on MEMBER_OF.since created');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to initialize Neo4j indexes for MEMBER_OF: ${err.message}`,
        err.stack
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
