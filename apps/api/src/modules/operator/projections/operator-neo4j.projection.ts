import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { OperatorOnboardedEventV1 } from '../events/operator-onboarded.event';

/**
 * OperatorNeo4jProjection
 *
 * Neo4j projection handler that manages Operator nodes in the graph database.
 */
@EventsHandler(OperatorOnboardedEventV1)
@Injectable()
export class OperatorNeo4jProjection implements IEventHandler<OperatorOnboardedEventV1> {
    private readonly logger = new Logger(OperatorNeo4jProjection.name);

    constructor(private readonly neo4j: Neo4jService) { }

    async handle(event: OperatorOnboardedEventV1): Promise<void> {
        this.logger.log(`Handling OperatorOnboardedEventV1 for operator: ${event.operatorId}`);

        const session = this.neo4j.getWriteSession();

        try {
            // Create/update Operator node
            await session.run(
                `
        MERGE (opt:Operator {id: $operatorId})
        SET opt.actorId = $actorId,
            opt.skills = $skills,
            opt.reputationScore = $reputationScore,
            opt.createdAt = datetime($createdAt),
            opt.updatedAt = datetime($createdAt)
        RETURN opt.id as operatorId
        `,
                {
                    operatorId: event.operatorId,
                    actorId: event.actorId,
                    skills: event.skills,
                    reputationScore: event.reputationScore,
                    createdAt: event.createdAt.toISOString(),
                }
            );

            // Establish relationship to Actor
            await session.run(
                `
        MATCH (opt:Operator {id: $operatorId})
        MATCH (a:Actor {id: $actorId})
        MERGE (opt)-[:IDENTIFIED_AS]->(a)
        `,
                {
                    operatorId: event.operatorId,
                    actorId: event.actorId,
                }
            );

            // Index individual skills
            if (event.skills && event.skills.length > 0) {
                for (const skill of event.skills) {
                    await session.run(
                        `
                        MATCH (opt:Operator {id: $operatorId})
                        MERGE (s:Skill {name: $skillName})
                        MERGE (opt)-[:HAS_SKILL]->(s)
                        `,
                        {
                            operatorId: event.operatorId,
                            skillName: skill,
                        }
                    );
                }
            }

            this.logger.debug(`Operator node and relationship to Actor created/updated in Neo4j: ${event.operatorId}`);
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Failed to project operator to Neo4j: ${err.message}`, err.stack);
        } finally {
            await session.close();
        }
    }
}

/**
 * Neo4j Initialization Service for Operator
 */
@Injectable()
export class OperatorNeo4jInitializer {
    private readonly logger = new Logger(OperatorNeo4jInitializer.name);

    constructor(private readonly neo4j: Neo4jService) { }

    async initialize(): Promise<void> {
        const session = this.neo4j.getWriteSession();
        try {
            await session.run('CREATE CONSTRAINT operator_id_unique IF NOT EXISTS FOR (o:Operator) REQUIRE o.id IS UNIQUE');
            await session.run('CREATE INDEX operator_actor_id_index IF NOT EXISTS FOR (o:Operator) ON (o.actorId)');
            this.logger.log('Neo4j constraints/indexes for Operator initialized');
        } catch (error) {
            this.logger.error(`Failed to initialize Neo4j for Operator: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            await session.close();
        }
    }
}
