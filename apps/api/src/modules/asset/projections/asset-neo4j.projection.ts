import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AssetCreatedEventV1 } from '../events/asset-created.event';

/**
 * AssetNeo4jProjection
 *
 * Neo4j projection handler that manages Asset nodes in the graph database.
 */
@EventsHandler(AssetCreatedEventV1)
@Injectable()
export class AssetNeo4jProjection implements IEventHandler<AssetCreatedEventV1> {
    private readonly logger = new Logger(AssetNeo4jProjection.name);

    constructor(private readonly neo4j: Neo4jService) { }

    async handle(event: AssetCreatedEventV1): Promise<void> {
        this.logger.log(`Handling AssetCreatedEventV1 for asset: ${event.assetId}`);

        const session = this.neo4j.getWriteSession();

        try {
            // Create/update Asset node
            await session.run(
                `
        MERGE (a:Asset {id: $assetId})
        SET a.name = $name,
            a.type = $type,
            a.status = $status,
            a.ownerId = $ownerId,
            a.ownerType = $ownerType,
            a.latitude = $latitude,
            a.longitude = $longitude,
            a.createdAt = datetime($createdAt),
            a.updatedAt = datetime($createdAt)
        RETURN a.id as assetId
        `,
                {
                    assetId: event.assetId,
                    name: event.name,
                    type: event.type,
                    status: event.status,
                    ownerId: event.ownerId,
                    ownerType: event.ownerType,
                    latitude: event.homeBase?.latitude ?? null,
                    longitude: event.homeBase?.longitude ?? null,
                    createdAt: event.createdAt.toISOString(),
                }
            );

            // Establish relationship to Owner (Individual or Organization)
            const ownerLabel = event.ownerType === 'Organization' ? 'Organization' : 'Actor';
            await session.run(
                `
        MATCH (a:Asset {id: $assetId})
        MERGE (o:${ownerLabel} {id: $ownerId})
        MERGE (o)-[rel:OWNS]->(a)
        SET rel.updatedAt = datetime($createdAt)
        `,
                {
                    assetId: event.assetId,
                    ownerId: event.ownerId,
                    createdAt: event.createdAt.toISOString(),
                }
            );

            this.logger.debug(`Asset node and ownership relationship created/updated in Neo4j: ${event.assetId}`);
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Failed to project asset to Neo4j: ${err.message}`, err.stack);
        } finally {
            await session.close();
        }
    }
}

/**
 * Neo4j Initialization Service for Asset
 */
@Injectable()
export class AssetNeo4jInitializer {
    private readonly logger = new Logger(AssetNeo4jInitializer.name);

    constructor(private readonly neo4j: Neo4jService) { }

    async initialize(): Promise<void> {
        const session = this.neo4j.getWriteSession();
        try {
            await session.run('CREATE CONSTRAINT asset_id_unique IF NOT EXISTS FOR (a:Asset) REQUIRE a.id IS UNIQUE');
            await session.run('CREATE INDEX asset_type_index IF NOT EXISTS FOR (a:Asset) ON (a.type)');
            await session.run('CREATE INDEX asset_owner_id_index IF NOT EXISTS FOR (a:Asset) ON (a.ownerId)');
            this.logger.log('Neo4j constraints/indexes for Asset initialized');
        } catch (error) {
            this.logger.error(`Failed to initialize Neo4j for Asset: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            await session.close();
        }
    }
}
