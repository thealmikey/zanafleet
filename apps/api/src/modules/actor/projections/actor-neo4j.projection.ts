import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { ActorOnboardedEventV1 } from '../events/actor-onboarded.event';
import { ActorUpdatedEventV1 } from '../events/actor-updated.event';

/**
 * ActorNeo4jProjection
 *
 * Neo4j projection handler that manages Actor nodes in the graph database.
 *
 * Architecture:
 * - Listens for ActorOnboardedEvent-V1 and ActorUpdatedEvent-V1 events
 * - Creates/updates Actor nodes in Neo4j
 * - Maintains graph consistency with Postgres actor records
 *
 * Node Structure:
 * (:Actor {id, email, username, type, workspaceId, createdAt, updatedAt})
 *
 * Relationships:
 * (:Actor)-[:MEMBER_OF]->(:Workspace) - managed by MembershipNeo4jProjection
 */
@EventsHandler(ActorOnboardedEventV1, ActorUpdatedEventV1)
@Injectable()
export class ActorNeo4jProjection
  implements IEventHandler<ActorOnboardedEventV1 | ActorUpdatedEventV1>
{
  private readonly logger = new Logger(ActorNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle actor events
   * Routes to appropriate handler based on event type
   */
  async handle(event: ActorOnboardedEventV1 | ActorUpdatedEventV1): Promise<void> {
    if (event instanceof ActorOnboardedEventV1) {
      await this.handleActorOnboarded(event);
    } else if (event instanceof ActorUpdatedEventV1) {
      await this.handleActorUpdated(event);
    }
  }

  /**
   * Handle ActorOnboardedEvent-V1
   * Creates Actor node using MERGE for idempotency
   */
  private async handleActorOnboarded(event: ActorOnboardedEventV1): Promise<void> {
    this.logger.log(`Handling ActorOnboardedEvent-V1 for actor: ${event.actorId}`);

    const session = this.neo4j.getWriteSession();

    try {
      await session.run(
        `
        MERGE (a:Actor {id: $actorId})
        SET a.email = $email,
            a.username = $username,
            a.type = $type,
            a.workspaceId = $workspaceId,
            a.createdAt = datetime($createdAt),
            a.updatedAt = datetime($createdAt)
        RETURN a.id as actorId
        `,
        {
          actorId: event.actorId,
          email: event.email,
          username: event.username,
          type: event.type,
          workspaceId: event.workspaceId,
          createdAt: event.createdAt.toISOString(),
        }
      );

      this.logger.debug(`Actor node created/updated in Neo4j: ${event.actorId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to project actor to Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Handle ActorUpdatedEvent-V1
   * Updates Actor node properties
   */
  private async handleActorUpdated(event: ActorUpdatedEventV1): Promise<void> {
    this.logger.log(`Handling ActorUpdatedEvent-V1 for actor: ${event.actorId}`);

    const session = this.neo4j.getWriteSession();

    try {
      const setClauses: string[] = ['a.updatedAt = datetime($updatedAt)'];
      const params: Record<string, unknown> = {
        actorId: event.actorId,
        updatedAt: event.updatedAt.toISOString(),
      };

      if (event.email !== undefined) {
        setClauses.push('a.email = $email');
        params.email = event.email;
      }
      if (event.username !== undefined) {
        setClauses.push('a.username = $username');
        params.username = event.username;
      }
      if (event.type !== undefined) {
        setClauses.push('a.type = $type');
        params.type = event.type;
      }
      if (event.workspaceId !== undefined) {
        setClauses.push('a.workspaceId = $workspaceId');
        params.workspaceId = event.workspaceId;
      }

      await session.run(
        `
        MATCH (a:Actor {id: $actorId})
        SET ${setClauses.join(', ')}
        RETURN a.id as actorId
        `,
        params
      );

      this.logger.debug(`Actor node updated in Neo4j: ${event.actorId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to update actor in Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * Neo4j Initialization Service for Actor
 * Sets up constraints and indexes for Actor nodes
 * Should be called during module initialization
 */
@Injectable()
export class ActorNeo4jInitializer {
  private readonly logger = new Logger(ActorNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Initialize Neo4j constraints and indexes for Actor nodes
   * Should be called in ModuleOnInit or during bootstrap
   */
  async initialize(): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      // Create unique constraint on Actor.id
      await session.run(
        `CREATE CONSTRAINT actor_id_unique IF NOT EXISTS 
         FOR (a:Actor) REQUIRE a.id IS UNIQUE`
      );
      this.logger.log('Unique constraint on Actor.id created');

      // Create unique constraint on Actor.email
      await session.run(
        `CREATE CONSTRAINT actor_email_unique IF NOT EXISTS 
         FOR (a:Actor) REQUIRE a.email IS UNIQUE`
      );
      this.logger.log('Unique constraint on Actor.email created');

      // Create index on Actor.type for filtering by actor type
      await session.run(
        `CREATE INDEX actor_type_index IF NOT EXISTS 
         FOR (a:Actor) ON (a.type)`
      );
      this.logger.log('Index on Actor.type created');

      // Create index on Actor.workspaceId for workspace lookups
      await session.run(
        `CREATE INDEX actor_workspace_index IF NOT EXISTS 
         FOR (a:Actor) ON (a.workspaceId)`
      );
      this.logger.log('Index on Actor.workspaceId created');

      // Create index on Actor.createdAt for time-based queries
      await session.run(
        `CREATE INDEX actor_created_at_index IF NOT EXISTS 
         FOR (a:Actor) ON (a.createdAt)`
      );
      this.logger.log('Index on Actor.createdAt created');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to initialize Neo4j constraints for Actor: ${err.message}`,
        err.stack
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
