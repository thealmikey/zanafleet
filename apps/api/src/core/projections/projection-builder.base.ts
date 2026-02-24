import { BaseEvent } from '@api/core/event-bus/interfaces/base-event.interface';
import { Neo4jService } from '@api/core/neo4j';
import { Logger } from '@nestjs/common';
import { Session } from 'neo4j-driver';

/**
 * Projection state tracking for replay support
 */
export interface ProjectionState {
  /** Name of the projection */
  projectionName: string;
  /** ID of the last successfully processed event */
  lastProcessedEventId: string | null;
  /** Timestamp of the last processed event */
  lastProcessedAt: Date | null;
  /** Total number of events processed */
  processedCount: number;
}

/**
 * Options for upsert operations
 */
export interface UpsertOptions {
  /** Additional SET clauses for the Cypher query */
  additionalSetClauses?: string[];
  /** Additional parameters for the query */
  additionalParams?: Record<string, unknown>;
}

/**
 * Relationship upsert options
 */
export interface RelationshipUpsertOptions extends UpsertOptions {
  /** Properties to set on the relationship */
  relationshipProperties?: Record<string, unknown>;
}

/**
 * ProjectionBuilder
 *
 * Abstract base class for Neo4j projections that formalizes the existing pattern.
 * Provides idempotent upsert helpers and event tracking for replay support.
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class MyProjection extends ProjectionBuilder<MyEvent> {
 *   protected readonly projectionName = 'MyProjection';
 *
 *   async handleEvent(event: MyEvent): Promise<void> {
 *     await this.upsertNode('MyNode', 'id', event.entityId, {
 *       name: event.name,
 *       updatedAt: event.occurredAt.toISOString(),
 *     });
 *   }
 *
 *   async rebuild(): Promise<void> {
 *     // Clear and rebuild from event store
 *   }
 * }
 * ```
 */
export abstract class ProjectionBuilder<TEvent extends BaseEvent = BaseEvent> {
  protected abstract readonly projectionName: string;
  protected readonly logger: Logger;
  private state: ProjectionState;

  constructor(protected readonly neo4jService: Neo4jService) {
    this.logger = new Logger(this.constructor.name);
    this.state = {
      projectionName: '',
      lastProcessedEventId: null,
      lastProcessedAt: null,
      processedCount: 0,
    };
  }

  /**
   * Initialize the projection state after construction
   * Call this in onModuleInit or similar lifecycle hook
   */
  protected initializeState(): void {
    this.state.projectionName = this.projectionName;
  }

  /**
   * Handle a domain event - main entry point
   * Subclasses should implement handleEvent for the actual logic
   */
  async handle(event: TEvent): Promise<void> {
    this.logger.debug(`Handling event ${event.eventType} (${event.eventId})`);

    try {
      await this.handleEvent(event);
      await this.recordProcessedEvent(event.eventId);
      this.logger.debug(`Successfully processed event ${event.eventId}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle event ${event.eventId}: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  /**
   * Implement this method to handle specific event types
   */
  protected abstract handleEvent(event: TEvent): Promise<void>;

  /**
   * Rebuild the projection from scratch
   * Implement this to clear existing data and replay from event store
   */
  abstract rebuild(): Promise<void>;

  /**
   * Get the ID of the last successfully processed event
   * Used for replay/catchup scenarios
   */
  getLastProcessedEventId(): string | null {
    return this.state.lastProcessedEventId;
  }

  /**
   * Get full projection state
   */
  getState(): ProjectionState {
    return { ...this.state };
  }

  /**
   * Idempotent node upsert using MERGE
   * Creates or updates a node with the given properties
   *
   * @param label - Node label (e.g., 'Actor', 'Delivery')
   * @param idField - The field used as unique identifier (e.g., 'id')
   * @param idValue - The value of the identifier
   * @param properties - Properties to set on the node
   * @param options - Additional options for the upsert
   */
  protected async upsertNode(
    label: string,
    idField: string,
    idValue: string,
    properties: Record<string, unknown>,
    options?: UpsertOptions
  ): Promise<void> {
    const session = this.neo4jService.getWriteSession();

    try {
      const setClauseParts = Object.keys(properties).map((key) => `n.${key} = $${key}`);
      if (options?.additionalSetClauses) {
        setClauseParts.push(...options.additionalSetClauses);
      }
      const setClause = setClauseParts.join(', ');

      const params = {
        idValue,
        ...properties,
        ...options?.additionalParams,
      };

      const query = `
        MERGE (n:${label} {${idField}: $idValue})
        SET ${setClause}
        RETURN n.${idField} as nodeId
      `;

      await session.run(query, params);
      this.logger.debug(`Upserted ${label} node with ${idField}=${idValue}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Idempotent relationship upsert using MERGE
   * Creates or updates a relationship between two nodes
   *
   * @param fromLabel - Label of the source node
   * @param fromIdField - ID field of the source node
   * @param fromIdValue - ID value of the source node
   * @param toLabel - Label of the target node
   * @param toIdField - ID field of the target node
   * @param toIdValue - ID value of the target node
   * @param relationType - Type of relationship (e.g., 'MEMBER_OF', 'ASSIGNED_TO')
   * @param options - Additional options including relationship properties
   */
  protected async upsertRelationship(
    fromLabel: string,
    fromIdField: string,
    fromIdValue: string,
    toLabel: string,
    toIdField: string,
    toIdValue: string,
    relationType: string,
    options?: RelationshipUpsertOptions
  ): Promise<void> {
    const session = this.neo4jService.getWriteSession();

    try {
      let setClause = '';
      const params: Record<string, unknown> = {
        fromId: fromIdValue,
        toId: toIdValue,
      };

      if (options?.relationshipProperties) {
        const propClauses = Object.keys(options.relationshipProperties).map(
          (key) => `r.${key} = $rel_${key}`
        );
        setClause = propClauses.length > 0 ? `SET ${propClauses.join(', ')}` : '';

        for (const [key, value] of Object.entries(options.relationshipProperties)) {
          params[`rel_${key}`] = value;
        }
      }

      const query = `
        MATCH (from:${fromLabel} {${fromIdField}: $fromId})
        MATCH (to:${toLabel} {${toIdField}: $toId})
        MERGE (from)-[r:${relationType}]->(to)
        ${setClause}
        RETURN type(r) as relType
      `;

      await session.run(query, params);
      this.logger.debug(
        `Upserted relationship ${fromLabel}(${fromIdValue})-[${relationType}]->${toLabel}(${toIdValue})`
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Delete a node by its identifier
   *
   * @param label - Node label
   * @param idField - The field used as unique identifier
   * @param idValue - The value of the identifier
   * @param detach - If true, delete all relationships first (DETACH DELETE)
   */
  protected async deleteNode(
    label: string,
    idField: string,
    idValue: string,
    detach = true
  ): Promise<void> {
    const session = this.neo4jService.getWriteSession();

    try {
      const deleteCmd = detach ? 'DETACH DELETE' : 'DELETE';
      const query = `
        MATCH (n:${label} {${idField}: $idValue})
        ${deleteCmd} n
      `;

      await session.run(query, { idValue });
      this.logger.debug(`Deleted ${label} node with ${idField}=${idValue}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Delete a relationship between two nodes
   */
  protected async deleteRelationship(
    fromLabel: string,
    fromIdField: string,
    fromIdValue: string,
    toLabel: string,
    toIdField: string,
    toIdValue: string,
    relationType: string
  ): Promise<void> {
    const session = this.neo4jService.getWriteSession();

    try {
      const query = `
        MATCH (from:${fromLabel} {${fromIdField}: $fromId})-[r:${relationType}]->(to:${toLabel} {${toIdField}: $toId})
        DELETE r
      `;

      await session.run(query, { fromId: fromIdValue, toId: toIdValue });
      this.logger.debug(
        `Deleted relationship ${fromLabel}(${fromIdValue})-[${relationType}]->${toLabel}(${toIdValue})`
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a custom Cypher query
   * Use this for complex operations not covered by the helper methods
   */
  protected async executeQuery(query: string, params: Record<string, unknown> = {}): Promise<void> {
    const session = this.neo4jService.getWriteSession();

    try {
      await session.run(query, params);
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a read query and return results
   */
  protected async executeReadQuery<T>(
    query: string,
    params: Record<string, unknown> = {},
    mapper: (record: unknown) => T
  ): Promise<T[]> {
    const session = this.neo4jService.getReadSession();

    try {
      const result = await session.run(query, params);
      return result.records.map(mapper);
    } finally {
      await session.close();
    }
  }

  /**
   * Record that an event has been processed
   * Updates internal state for replay tracking
   */
  protected async recordProcessedEvent(eventId: string): Promise<void> {
    this.state.lastProcessedEventId = eventId;
    this.state.lastProcessedAt = new Date();
    this.state.processedCount++;
  }

  /**
   * Get a write session from Neo4j
   * Remember to close the session after use!
   */
  protected getWriteSession(): Session {
    return this.neo4jService.getWriteSession();
  }

  /**
   * Get a read session from Neo4j
   * Remember to close the session after use!
   */
  protected getReadSession(): Session {
    return this.neo4jService.getReadSession();
  }
}
