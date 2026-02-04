import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { SaccoCreatedEventV1 } from '../events/sacco-created.event';

/**
 * SaccoNeo4jProjection
 *
 * Neo4j projection handler that manages Sacco nodes in the graph database.
 *
 * Architecture:
 * - Listens for SaccoCreatedEvent-V1 events
 * - Creates/updates Sacco nodes in Neo4j
 * - Maintains graph consistency with Postgres sacco records
 *
 * Node Structure:
 * (:Sacco {id, name, latitude, longitude, humanReadableName, administrativeArea, country, contactPhone, createdAt, updatedAt})
 *
 * Relationships:
 * (:Sacco)-[:OPERATES_IN]->(:Location) - can be added later as locations domain evolves
 */
@EventsHandler(SaccoCreatedEventV1)
@Injectable()
export class SaccoNeo4jProjection implements IEventHandler<SaccoCreatedEventV1> {
  private readonly logger = new Logger(SaccoNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle sacco created event
   * Creates Sacco node in Neo4j using MERGE for idempotency
   */
  async handle(event: SaccoCreatedEventV1): Promise<void> {
    this.logger.log(`Handling SaccoCreatedEvent-V1 for sacco: ${event.saccoId}`);

    const session = this.neo4j.getWriteSession();

    try {
      await session.run(
        `
        MERGE (s:Sacco {id: $saccoId})
        SET s.name = $name,
            s.latitude = $latitude,
            s.longitude = $longitude,
            s.humanReadableName = $humanReadableName,
            s.administrativeArea = $administrativeArea,
            s.country = $country,
            s.contactPhone = $contactPhone,
            s.createdAt = datetime($createdAt),
            s.updatedAt = datetime($createdAt)
        RETURN s.id as saccoId
        `,
        {
          saccoId: event.saccoId,
          name: event.name,
          latitude: event.location.latitude,
          longitude: event.location.longitude,
          humanReadableName: event.location.humanReadableName,
          administrativeArea: event.location.administrativeArea,
          country: event.location.country,
          contactPhone: event.contactPhone,
          createdAt: event.createdAt.toISOString(),
        }
      );

      this.logger.debug(`Sacco node created/updated in Neo4j: ${event.saccoId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to project sacco to Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * Neo4j Initialization Service for Sacco
 * Sets up constraints and indexes for Sacco nodes
 * Should be called during module initialization
 */
@Injectable()
export class SaccoNeo4jInitializer {
  private readonly logger = new Logger(SaccoNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Initialize Neo4j constraints and indexes for Sacco nodes
   * Should be called in ModuleOnInit or during bootstrap
   */
  async initialize(): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      // Create unique constraint on Sacco.id
      await session.run(
        `CREATE CONSTRAINT sacco_id_unique IF NOT EXISTS 
         FOR (s:Sacco) REQUIRE s.id IS UNIQUE`
      );
      this.logger.log('Unique constraint on Sacco.id created');

      // Create unique constraint on Sacco.name
      await session.run(
        `CREATE CONSTRAINT sacco_name_unique IF NOT EXISTS 
         FOR (s:Sacco) REQUIRE s.name IS UNIQUE`
      );
      this.logger.log('Unique constraint on Sacco.name created');

      // Create index on Sacco.createdAt for time-based queries
      await session.run(
        `CREATE INDEX sacco_created_at_index IF NOT EXISTS 
         FOR (s:Sacco) ON (s.createdAt)`
      );
      this.logger.log('Index on Sacco.createdAt created');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to initialize Neo4j constraints for Sacco: ${err.message}`,
        err.stack
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
