import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Neo4jService } from '../../../core/neo4j';
import { OrganizationCreatedEventV1 } from '../events/organization-created.event';

/**
 * OrganizationNeo4jProjection
 * 
 * Neo4j projection handler that automatically updates the graph database
 * when OrganizationCreatedEvent-V1 is emitted.
 * 
 * Architecture:
 * - Listens for OrganizationCreatedEvent-V1 events
 * - Creates/updates Organization node in Neo4j
 * - Maintains graph consistency
 * - Supports future relationship additions (phase 2+)
 * 
 * Node Structure:
 * Node: Organization {id, name, type, status, createdAt, updatedAt}
 * Labels: [:Organization]
 * Constraints: UNIQUE (id)
 * 
 * Indexes:
 * - Index on type (for filtering by org type)
 * - Index on status (for filtering by status)
 */
@EventsHandler(OrganizationCreatedEventV1)
@Injectable()
export class OrganizationNeo4jProjection
  implements IEventHandler<OrganizationCreatedEventV1>
{
  private readonly logger = new Logger(OrganizationNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle OrganizationCreatedEvent-V1
   * Creates or updates Organization node in Neo4j
   */
  async handle(event: OrganizationCreatedEventV1): Promise<void> {
    this.logger.log(
      `Handling OrganizationCreatedEvent-V1 for organization: ${event.organizationId}`,
    );

    const session = this.neo4j.getSession();

    try {
      // Create/update Organization node with MERGE to ensure idempotency
      await session.run(
        `
        MERGE (org:Organization {id: $organizationId})
        SET 
          org.name = $name,
          org.type = $type,
          org.status = $status,
          org.createdAt = datetime($createdAt),
          org.updatedAt = datetime($updatedAt),
          org.linkedWallets = $linkedWallets
        RETURN org.id as id
        `,
        {
          organizationId: event.organizationId,
          name: event.name,
          type: event.type,
          status: event.status,
          createdAt: event.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
          linkedWallets: event.linkedWallets,
        },
      );

      this.logger.debug(
        `Organization node created/updated in Neo4j: ${event.organizationId}`,
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to project organization to Neo4j: ${err.message}`,
        err.stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * Neo4j Initialization Service
 * Sets up constraints and indexes for Organization nodes
 * Should be called during module initialization
 */
@Injectable()
export class OrganizationNeo4jInitializer {
  private readonly logger = new Logger(OrganizationNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Initialize Neo4j constraints and indexes
   * Should be called in ModuleOnInit or during bootstrap
   */
  async initialize(): Promise<void> {
    const session = this.neo4j.getSession();

    try {
      // Create UNIQUE constraint on Organization.id
      await session.run(
        `CREATE CONSTRAINT organization_id_unique IF NOT EXISTS 
         FOR (org:Organization) REQUIRE org.id IS UNIQUE`,
      );
      this.logger.log('UNIQUE constraint on Organization.id created');

      // Create index on type for filtering
      await session.run(
        `CREATE INDEX organization_type_index IF NOT EXISTS 
         FOR (org:Organization) ON (org.type)`,
      );
      this.logger.log('Index on Organization.type created');

      // Create index on status for filtering
      await session.run(
        `CREATE INDEX organization_status_index IF NOT EXISTS 
         FOR (org:Organization) ON (org.status)`,
      );
      this.logger.log('Index on Organization.status created');

      // Create index on createdAt for time-based queries
      await session.run(
        `CREATE INDEX organization_createdAt_index IF NOT EXISTS 
         FOR (org:Organization) ON (org.createdAt)`,
      );
      this.logger.log('Index on Organization.createdAt created');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to initialize Neo4j constraints/indexes: ${err.message}`,
        err.stack,
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
