import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { BusinessOnboardedEventV1 } from '../events/business-onboarded.event';

/**
 * BusinessNeo4jProjection
 *
 * Neo4j projection handler that manages Business nodes in the graph database.
 *
 * Architecture:
 * - Listens for BusinessOnboardedEvent-V1 events
 * - Creates/updates Business nodes in Neo4j
 * - Maintains graph consistency with Postgres business records
 *
 * Node Structure:
 * (:Business {id, businessName, phone, latitude, longitude, humanReadableName, administrativeArea, country, businessType, email, createdAt, updatedAt})
 *
 * Relationships:
 * Can be extended with relationships to other entities as needed
 */
@EventsHandler(BusinessOnboardedEventV1)
@Injectable()
export class BusinessNeo4jProjection implements IEventHandler<BusinessOnboardedEventV1> {
  private readonly logger = new Logger(BusinessNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle business onboarded event
   * Creates Business node in Neo4j using MERGE for idempotency
   */
  async handle(event: BusinessOnboardedEventV1): Promise<void> {
    this.logger.log(`Handling BusinessOnboardedEvent-V1 for business: ${event.businessId}`);

    const session = this.neo4j.getWriteSession();

    try {
      await session.run(
        `
        MERGE (b:Business {id: $businessId})
        SET b.businessName = $businessName,
            b.phone = $phone,
            b.latitude = $latitude,
            b.longitude = $longitude,
            b.humanReadableName = $humanReadableName,
            b.administrativeArea = $administrativeArea,
            b.country = $country,
            b.businessType = $businessType,
            b.email = $email,
            b.createdAt = datetime($createdAt),
            b.updatedAt = datetime($createdAt)
        RETURN b.id as businessId
        `,
        {
          businessId: event.businessId,
          businessName: event.businessName,
          phone: event.phone,
          latitude: event.location.latitude,
          longitude: event.location.longitude,
          humanReadableName: event.location.humanReadableName,
          administrativeArea: event.location.administrativeArea,
          country: event.location.country,
          businessType: event.businessType,
          email: event.email,
          createdAt: event.createdAt.toISOString(),
        }
      );

      this.logger.debug(`Business node created/updated in Neo4j: ${event.businessId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to project business to Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * Neo4j Initialization Service for Business
 * Sets up constraints and indexes for Business nodes
 * Should be called during module initialization
 */
@Injectable()
export class BusinessNeo4jInitializer {
  private readonly logger = new Logger(BusinessNeo4jInitializer.name);
  private readonly isSandboxMode = process.env.USE_IN_MEMORY_DB === 'true';

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Initialize Neo4j constraints and indexes for Business nodes
   * Should be called in ModuleOnInit or during bootstrap
   */
  async initialize(): Promise<void> {
    // Skip Neo4j initialization in sandbox mode
    if (this.isSandboxMode) {
      this.logger.log('[SANDBOX] Skipping Neo4j schema initialization for Business');
      return;
    }

    const session = this.neo4j.getWriteSession();

    try {
      // Create unique constraint on Business.id
      await session.run(
        `CREATE CONSTRAINT business_id_unique IF NOT EXISTS 
         FOR (b:Business) REQUIRE b.id IS UNIQUE`
      );
      this.logger.log('Unique constraint on Business.id created');

      // Create unique constraint on Business.phone (primary identity)
      await session.run(
        `CREATE CONSTRAINT business_phone_unique IF NOT EXISTS 
         FOR (b:Business) REQUIRE b.phone IS UNIQUE`
      );
      this.logger.log('Unique constraint on Business.phone created');

      // Create index on Business.businessType for business type filtering
      await session.run(
        `CREATE INDEX business_type_index IF NOT EXISTS 
         FOR (b:Business) ON (b.businessType)`
      );
      this.logger.log('Index on Business.businessType created');

      // Create index on Business.createdAt for time-based queries
      await session.run(
        `CREATE INDEX business_created_at_index IF NOT EXISTS 
         FOR (b:Business) ON (b.createdAt)`
      );
      this.logger.log('Index on Business.createdAt created');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to initialize Neo4j constraints for Business: ${err.message}`,
        err.stack
      );
      throw error;
    } finally {
      await session.close();
    }
  }
}
