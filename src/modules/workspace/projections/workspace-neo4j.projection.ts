import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Neo4jService } from '@nestjs-modules/neo4j';
import { WorkspaceCreatedEventV1 } from '../events/workspace-created.event';

/**
 * WorkspaceNeo4jProjection
 *
 * Neo4j projection handler that automatically updates the graph database
 * when WorkspaceCreatedEvent-V1 is emitted.
 *
 * Architecture:
 * - Listens for WorkspaceCreatedEvent-V1 events
 * - Creates/updates Workspace node in Neo4j
 * - Creates PART_OF relationship to parent Organization
 * - Maintains graph consistency
 *
 * Node Structure:
 * Node: Workspace {id, name, orgId, roleTemplates, createdAt, updatedAt}
 * Labels: [:Workspace]
 * Relationships: (Workspace)-[:PART_OF]->(Organization)
 * Constraints: UNIQUE (id)
 *
 * Indexes:
 * - Index on orgId (for filtering by organization)
 * - Index on createdAt (for time-based queries)
 */
@EventsHandler(WorkspaceCreatedEventV1)
@Injectable()
export class WorkspaceNeo4jProjection
  implements IEventHandler<WorkspaceCreatedEventV1>
{
  private readonly logger = new Logger(WorkspaceNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle WorkspaceCreatedEvent-V1
   * Creates or updates Workspace node in Neo4j and establishes PART_OF relationship
   */
  async handle(event: WorkspaceCreatedEventV1): Promise<void> {
    this.logger.log(
      `Handling WorkspaceCreatedEvent-V1 for workspace: ${event.workspaceId}`,
    );

    const session = this.neo4j.getSession();

    try {
      await session.run(
        `
        MERGE (ws:Workspace {id: $workspaceId})
        SET ws.name = $name, ws.orgId = $orgId, ws.roleTemplates = $roleTemplates, ws.createdAt = datetime($createdAt), ws.updatedAt = datetime($updatedAt)
        WITH ws
        MATCH (org:Organization {id: $orgId})
        MERGE (ws)-[:PART_OF]->(org)
        RETURN ws.id as id
        `,
        {
          workspaceId: event.workspaceId,
          name: event.name,
          orgId: event.orgId,
          roleTemplates: event.roleTemplates,
          createdAt: event.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
        },
      );

      this.logger.debug(
        `Workspace node created/updated in Neo4j with PART_OF relationship: ${event.workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to project workspace to Neo4j: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * Neo4j Initialization Service
 * Sets up constraints and indexes for Workspace nodes
 * Should be called during module initialization
 */
@Injectable()
export class WorkspaceNeo4jInitializer {
  private readonly logger = new Logger(WorkspaceNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Initialize Neo4j constraints and indexes
   * Should be called in ModuleOnInit or during bootstrap
   */
  async initialize(): Promise<void> {
    const session = this.neo4j.getSession();

    try {
      // Create UNIQUE constraint on Workspace.id
      await session.run(
        `CREATE CONSTRAINT workspace_id_unique IF NOT EXISTS 
         FOR (ws:Workspace) REQUIRE ws.id IS UNIQUE`,
      );
      this.logger.log('UNIQUE constraint on Workspace.id created');

      // Create index on orgId for filtering by organization
      await session.run(
        `CREATE INDEX workspace_orgId_index IF NOT EXISTS 
         FOR (ws:Workspace) ON (ws.orgId)`,
      );
      this.logger.log('Index on Workspace.orgId created');

      // Create index on createdAt for time-based queries
      await session.run(
        `CREATE INDEX workspace_createdAt_index IF NOT EXISTS 
         FOR (ws:Workspace) ON (ws.createdAt)`,
      );
      this.logger.log('Index on Workspace.createdAt created');
    } catch (error) {
      this.logger.error(
        `Failed to initialize Neo4j constraints/indexes: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
