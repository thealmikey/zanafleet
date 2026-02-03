import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { CapabilityCreatedEventV1 } from '../events/capability-created.event';

@EventsHandler(CapabilityCreatedEventV1)
@Injectable()
export class CapabilityNeo4jProjection implements IEventHandler<CapabilityCreatedEventV1> {
  private readonly logger = new Logger(CapabilityNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async handle(event: CapabilityCreatedEventV1): Promise<void> {
    this.logger.log(`Handling CapabilityCreatedEvent-V1 for capability: ${event.capabilityId}`);

    const session = this.neo4j.getSession();

    try {
      await session.run(
        `
        MERGE (capability:Capability {id: $capabilityId})
        SET
          capability.name = $name,
          capability.createdAt = datetime($createdAt),
          capability.updatedAt = datetime($updatedAt)
        RETURN capability.id as capabilityId
        `,
        {
          capabilityId: event.capabilityId,
          name: event.name,
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.occurredAt.toISOString(),
        }
      );

      this.logger.debug(`Capability node projected to Neo4j: ${event.capabilityId}`);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to project capability to Neo4j: ${err.message}`, err.stack);
      throw err;
    } finally {
      await session.close();
    }
  }
}

@Injectable()
export class CapabilityNeo4jInitializer {
  private readonly logger = new Logger(CapabilityNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  async initialize(): Promise<void> {
    const session = this.neo4j.getSession();

    try {
      await session.run(
        `CREATE CONSTRAINT capability_id_unique IF NOT EXISTS
         FOR (capability:Capability) REQUIRE capability.id IS UNIQUE`
      );
      this.logger.log('UNIQUE constraint on Capability.id ensured');

      await session.run(
        `CREATE INDEX capability_name_index IF NOT EXISTS
         FOR (capability:Capability) ON (capability.name)`
      );
      this.logger.log('Index on Capability.name ensured');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to initialize Capability Neo4j schema: ${err.message}`, err.stack);
      throw err;
    } finally {
      await session.close();
    }
  }
}
