import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { RiderOnboardedEventV1 } from '../events/rider-onboarded.event';

/**
 * RiderNeo4jProjection
 *
 * Neo4j projection handler that manages Rider nodes in the graph database.
 *
 * Architecture:
 * - Listens for RiderOnboardedEvent-V1 events
 * - Creates/updates Rider nodes in Neo4j
 * - Creates [:BELONGS_TO] relationships to Sacco when applicable
 * - Maintains graph consistency with Postgres rider records
 *
 * Node Structure:
 * (:Rider {id, fullName, nationalId, phone, location, vehicleType, saccoId, email, createdAt, updatedAt})
 *
 * Relationships:
 * (:Rider)-[:BELONGS_TO]->(:Sacco) - created when saccoId is set
 */
@EventsHandler(RiderOnboardedEventV1)
@Injectable()
export class RiderNeo4jProjection implements IEventHandler<RiderOnboardedEventV1> {
  private readonly logger = new Logger(RiderNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle rider onboarded event
   * Creates Rider node and establishes relationships
   */
  async handle(event: RiderOnboardedEventV1): Promise<void> {
    this.logger.log(`Handling RiderOnboardedEvent-V1 for rider: ${event.riderId}`);

    const session = this.neo4j.getWriteSession();

    try {
      // Step 1: Create/update Rider node
      await session.run(
        `
        MERGE (r:Rider {id: $riderId})
        SET r.fullName = $fullName,
            r.nationalId = $nationalId,
            r.phone = $phone,
            r.location = $location,
            r.vehicleType = $vehicleType,
            r.saccoId = $saccoId,
            r.email = $email,
            r.createdAt = datetime($createdAt),
            r.updatedAt = datetime($createdAt)
        RETURN r.id as riderId
        `,
        {
          riderId: event.riderId,
          fullName: event.fullName,
          nationalId: event.nationalId,
          phone: event.phone,
          location: event.location,
          vehicleType: event.vehicleType,
          saccoId: event.saccoId,
          email: event.email,
          createdAt: event.createdAt.toISOString(),
        }
      );

      this.logger.debug(`Rider node created/updated in Neo4j: ${event.riderId}`);

      // Step 2: Create BELONGS_TO relationship if Sacco is provided
      if (event.saccoId) {
        await session.run(
          `
          MATCH (r:Rider {id: $riderId})
          MATCH (s:Sacco {id: $saccoId})
          MERGE (r)-[rel:BELONGS_TO]->(s)
          SET rel.createdAt = datetime($createdAt)
          RETURN rel
          `,
          {
            riderId: event.riderId,
            saccoId: event.saccoId,
            createdAt: event.createdAt.toISOString(),
          }
        );

        this.logger.debug(
          `BELONGS_TO relationship created in Neo4j: ${event.riderId} -> ${event.saccoId}`
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to project rider to Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * Neo4j Initialization Service for Rider
 * Sets up constraints and indexes for Rider nodes
 * Should be called during module initialization
 */
@Injectable()
export class RiderNeo4jInitializer {
  private readonly logger = new Logger(RiderNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Initialize Neo4j constraints and indexes for Rider nodes
   * Should be called in ModuleOnInit or during bootstrap
   */
  async initialize(): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      // Create unique constraint on Rider.id
      await session.run(
        `CREATE CONSTRAINT rider_id_unique IF NOT EXISTS 
         FOR (r:Rider) REQUIRE r.id IS UNIQUE`
      );
      this.logger.log('Unique constraint on Rider.id created');

      // Create unique constraint on Rider.phone (primary identity)
      await session.run(
        `CREATE CONSTRAINT rider_phone_unique IF NOT EXISTS 
         FOR (r:Rider) REQUIRE r.phone IS UNIQUE`
      );
      this.logger.log('Unique constraint on Rider.phone created');

      // Create unique constraint on Rider.nationalId
      await session.run(
        `CREATE CONSTRAINT rider_national_id_unique IF NOT EXISTS 
         FOR (r:Rider) REQUIRE r.nationalId IS UNIQUE`
      );
      this.logger.log('Unique constraint on Rider.nationalId created');

      // Create index on Rider.location for location-based queries
      await session.run(
        `CREATE INDEX rider_location_index IF NOT EXISTS 
         FOR (r:Rider) ON (r.location)`
      );
      this.logger.log('Index on Rider.location created');

      // Create index on Rider.vehicleType for filtering by vehicle type
      await session.run(
        `CREATE INDEX rider_vehicle_type_index IF NOT EXISTS 
         FOR (r:Rider) ON (r.vehicleType)`
      );
      this.logger.log('Index on Rider.vehicleType created');

      // Create index on Rider.saccoId for Sacco lookups
      await session.run(
        `CREATE INDEX rider_sacco_id_index IF NOT EXISTS 
         FOR (r:Rider) ON (r.saccoId)`
      );
      this.logger.log('Index on Rider.saccoId created');

      // Create index on Rider.createdAt for time-based queries
      await session.run(
        `CREATE INDEX rider_created_at_index IF NOT EXISTS 
         FOR (r:Rider) ON (r.createdAt)`
      );
      this.logger.log('Index on Rider.createdAt created');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to initialize Neo4j constraints for Rider: ${err.message}`,
        err.stack
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
