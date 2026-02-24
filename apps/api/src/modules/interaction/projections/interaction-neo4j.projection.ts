import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { InteractionEventCreatedEventV1 } from '../events/interaction-event-created.event';
import { InteractionStreamCreatedEventV1 } from '../events/interaction-stream-created.event';

/**
 * InteractionNeo4jProjection
 *
 * Handles Neo4j projections for interaction events.
 * Maintains the graph structure for streams, events, and participants.
 *
 * Graph Structure:
 * - (:InteractionStream {id, contextType, contextId, state})
 * - (:InteractionEvent {id, eventType, actorId, createdAt})
 * - (:Actor {id, type})-[:PARTICIPATED_IN]->(:InteractionStream)
 * - (:InteractionStream)-[:HAS_EVENT]->(:InteractionEvent)
 * - (:InteractionStream)-[:CONTEXT_OF]->(:DomainEntity)
 */
@EventsHandler(InteractionStreamCreatedEventV1, InteractionEventCreatedEventV1)
@Injectable()
export class InteractionNeo4jProjection
  implements IEventHandler<InteractionStreamCreatedEventV1 | InteractionEventCreatedEventV1>
{
  private readonly logger = new Logger(InteractionNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle interaction stream/event events
   * Routes to appropriate handler based on event type
   */
  async handle(
    event: InteractionStreamCreatedEventV1 | InteractionEventCreatedEventV1
  ): Promise<void> {
    if (event instanceof InteractionStreamCreatedEventV1) {
      await this.handleStreamCreated(event);
    } else if (event instanceof InteractionEventCreatedEventV1) {
      await this.handleEventCreated(event);
    }
  }

  /**
   * Handle InteractionStreamCreatedEvent-V1
   * Creates InteractionStream node in Neo4j
   */
  private async handleStreamCreated(event: InteractionStreamCreatedEventV1): Promise<void> {
    this.logger.debug(`Projecting stream to Neo4j: ${event.streamId}`);

    const session = this.neo4j.getWriteSession();

    try {
      // Create or update InteractionStream node
      await session.run(
        `
        MERGE (s:InteractionStream {id: $streamId})
        SET s.contextType = $contextType,
            s.contextId = $contextId,
            s.state = $state,
            s.createdAt = datetime($createdAt),
            s.updatedAt = datetime($createdAt)
        `,
        {
          streamId: event.streamId,
          contextType: event.contextType,
          contextId: event.contextId,
          state: event.state,
          createdAt: event.createdAt.toISOString(),
        }
      );

      // Create context relationships based on context type
      if (event.contextType && event.contextId) {
        await this.createContextRelationship(session, event);
      }

      this.logger.debug(`Stream node created/updated in Neo4j: ${event.streamId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to project stream to Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Handle InteractionEventCreatedEvent-V1
   * Creates InteractionEvent node and relationships in Neo4j
   */
  private async handleEventCreated(event: InteractionEventCreatedEventV1): Promise<void> {
    this.logger.debug(`Projecting event to Neo4j: ${event.interactionEventId}`);

    const session = this.neo4j.getWriteSession();

    try {
      // Ensure InteractionStream exists
      await session.run(
        `
        MERGE (s:InteractionStream {id: $streamId})
        `,
        { streamId: event.streamId }
      );

      // Create Actor node if not exists
      await session.run(
        `
        MERGE (a:Actor {id: $actorId})
        SET a.type = $actorType
        `,
        {
          actorId: event.actorId,
          actorType: event.actorType,
        }
      );

      // Create PARTICIPATED_IN relationship
      await session.run(
        `
        MATCH (a:Actor {id: $actorId})
        MATCH (s:InteractionStream {id: $streamId})
        MERGE (a)-[r:PARTICIPATED_IN]->(s)
        SET r.lastActiveAt = datetime($createdAt)
        `,
        {
          actorId: event.actorId,
          streamId: event.streamId,
          createdAt: event.createdAt.toISOString(),
        }
      );

      // Create InteractionEvent node
      await session.run(
        `
        MATCH (s:InteractionStream {id: $streamId})
        CREATE (e:InteractionEvent {
          id: $eventId,
          eventType: $eventType,
          actorId: $actorId,
          createdAt: datetime($createdAt)
        })
        SET e.payload = $payload
        CREATE (s)-[:HAS_EVENT]->(e)
        `,
        {
          eventId: event.interactionEventId,
          streamId: event.streamId,
          eventType: event.eventTypeValue,
          actorId: event.actorId,
          createdAt: event.createdAt.toISOString(),
          payload: JSON.stringify(event.payload),
        }
      );

      this.logger.debug(`Event node created in Neo4j: ${event.interactionEventId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to project event to Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Create context-specific relationship
   */
  private async createContextRelationship(
    session: any,
    event: InteractionStreamCreatedEventV1
  ): Promise<void> {
    const contextType = event.contextType;
    const contextId = event.contextId;

    // Map context type to Neo4j node type
    const nodeType = this.getNodeTypeForContext(contextType);
    if (!nodeType) return;

    await session.run(
      `
      MATCH (s:InteractionStream {id: $streamId})
      MERGE (c:${nodeType} {id: $contextId})
      MERGE (s)-[:CONTEXT_OF]->(c)
      `,
      {
        streamId: event.streamId,
        contextId: contextId,
      }
    );
  }

  /**
   * Map context type to Neo4j node type
   */
  private getNodeTypeForContext(contextType: string): string | null {
    const contextToNodeMap: Record<string, string> = {
      ORDER: 'Order',
      DELIVERY: 'Delivery',
      PAYMENT: 'Payment',
      MOVES_QUOTE: 'MovesQuote',
      SUPPORT_TICKET: 'SupportTicket',
    };

    return contextToNodeMap[contextType] || null;
  }
}

/**
 * Neo4j Initialization Service for Interaction
 * Sets up constraints and indexes for Interaction nodes
 */
@Injectable()
export class InteractionNeo4jInitializer {
  private readonly logger = new Logger(InteractionNeo4jInitializer.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Initialize Neo4j constraints and indexes for Interaction nodes
   */
  async initialize(): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      // Create unique constraint on InteractionStream.id
      await session.run(
        `CREATE CONSTRAINT interaction_stream_id_unique IF NOT EXISTS 
         FOR (s:InteractionStream) REQUIRE s.id IS UNIQUE`
      );
      this.logger.log('Unique constraint on InteractionStream.id created');

      // Create unique constraint on InteractionEvent.id
      await session.run(
        `CREATE CONSTRAINT interaction_event_id_unique IF NOT EXISTS 
         FOR (e:InteractionEvent) REQUIRE e.id IS UNIQUE`
      );
      this.logger.log('Unique constraint on InteractionEvent.id created');

      // Create index on InteractionStream.contextType
      await session.run(
        `CREATE INDEX interaction_stream_context_type IF NOT EXISTS 
         FOR (s:InteractionStream) ON (s.contextType)`
      );
      this.logger.log('Index on InteractionStream.contextType created');

      // Create index on InteractionStream.contextId
      await session.run(
        `CREATE INDEX interaction_stream_context_id IF NOT EXISTS 
         FOR (s:InteractionStream) ON (s.contextId)`
      );
      this.logger.log('Index on InteractionStream.contextId created');

      // Create index on InteractionEvent.eventType
      await session.run(
        `CREATE INDEX interaction_event_type IF NOT EXISTS 
         FOR (e:InteractionEvent) ON (e.eventType)`
      );
      this.logger.log('Index on InteractionEvent.eventType created');

      // Create index on InteractionEvent.createdAt
      await session.run(
        `CREATE INDEX interaction_event_created_at IF NOT EXISTS 
         FOR (e:InteractionEvent) ON (e.createdAt)`
      );
      this.logger.log('Index on InteractionEvent.createdAt created');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to initialize Neo4j constraints: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }
}
