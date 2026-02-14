import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { ProcessCreatedEventV1 } from '../events/process-created.event';
import { ProcessStateChangedEventV1 } from '../events/process-state-changed.event';

/**
 * ProcessInstanceNeo4jProjection
 *
 * Neo4j projection handler that manages ProcessInstance nodes in the graph database.
 *
 * Architecture:
 * - Listens for ProcessCreatedEvent and ProcessStateChangedEvent events
 * - Creates/updates ProcessInstance nodes in Neo4j
 * - Maintains relationships to related entities (Order, User, Vehicle)
 *
 * Node Structure:
 * (:ProcessInstance {id, definitionId, name, currentState, status, createdAt, updatedAt})
 *
 * Relationships:
 * - (:ProcessInstance)-[:RELATES_TO]->(:Order)
 * - (:ProcessInstance)-[:INVOLVES]->(:User)
 * - (:ProcessInstance)-[:INVOLVES]->(:Vehicle)
 * - (:ProcessInstance)-[:HAS_STATE]->(:ProcessState)
 */
@EventsHandler(ProcessCreatedEventV1)
@Injectable()
export class ProcessInstanceNeo4jProjection implements IEventHandler<ProcessCreatedEventV1> {
  private readonly logger = new Logger(ProcessInstanceNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle process created event
   * Creates ProcessInstance node in Neo4j using MERGE for idempotency
   */
  async handle(event: ProcessCreatedEventV1): Promise<void> {
    this.logger.log(`Handling ProcessCreatedEvent-V1 for instance: ${event.instanceId}`);

    const session = this.neo4j.getWriteSession();

    try {
      // Create ProcessInstance node
      await session.run(
        `
        MERGE (p:ProcessInstance {id: $instanceId})
        SET p.definitionId = $definitionId,
            p.name = $name,
            p.currentState = $initialState,
            p.status = 'active',
            p.createdAt = datetime($occurredAt),
            p.updatedAt = datetime($occurredAt)
        RETURN p.id as instanceId
        `,
        {
          instanceId: event.instanceId,
          definitionId: event.definitionId,
          name: event.name,
          initialState: event.initialState,
          occurredAt: event.occurredAt.toISOString(),
        }
      );

      // Create relationship to ProcessState
      await session.run(
        `
        MATCH (p:ProcessInstance {id: $instanceId})
        MERGE (s:ProcessState {name: $state})
        MERGE (p)-[:HAS_STATE]->(s)
        `,
        {
          instanceId: event.instanceId,
          state: event.initialState,
        }
      );

      // Create relationships to related entities
      for (const entity of event.relatedEntities) {
        await session.run(
          `
          MATCH (p:ProcessInstance {id: $instanceId})
          MERGE (e:$entityType {id: $entityId})
          MERGE (p)-[:INVOLVES {role: $role, linkedAt: $linkedAt}]->(e)
          `,
          {
            instanceId: event.instanceId,
            entityType: entity.entityType,
            entityId: entity.entityId,
            role: entity.role,
            linkedAt: entity.linkedAt.toISOString(),
          }
        );
      }

      this.logger.debug(`ProcessInstance node created in Neo4j: ${event.instanceId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to project process to Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }
}

/**
 * ProcessStateChangedNeo4jProjection
 *
 * Handles ProcessStateChangedEvent to update process state in Neo4j.
 */
@EventsHandler(ProcessStateChangedEventV1)
@Injectable()
export class ProcessStateChangedNeo4jProjection implements IEventHandler<ProcessStateChangedEventV1> {
  private readonly logger = new Logger(ProcessStateChangedNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Handle process state changed event
   * Updates ProcessInstance node state in Neo4j
   */
  async handle(event: ProcessStateChangedEventV1): Promise<void> {
    this.logger.log(
      `Handling ProcessStateChangedEvent-V1 for instance: ${event.instanceId} (${event.previousState} -> ${event.newState})`,
    );

    const session = this.neo4j.getWriteSession();

    try {
      // Update ProcessInstance node
      await session.run(
        `
        MATCH (p:ProcessInstance {id: $instanceId})
        SET p.currentState = $newState,
            p.updatedAt = datetime($occurredAt),
            p.previousState = $previousState
        RETURN p.id as instanceId
        `,
        {
          instanceId: event.instanceId,
          newState: event.newState,
          previousState: event.previousState,
          occurredAt: event.occurredAt.toISOString(),
        }
      );

      // Update HAS_STATE relationship
      await session.run(
        `
        MATCH (p:ProcessInstance {id: $instanceId})-[r:HAS_STATE]->(s:ProcessState)
        DELETE r
        `,
        {
          instanceId: event.instanceId,
        }
      );

      await session.run(
        `
        MATCH (p:ProcessInstance {id: $instanceId})
        MERGE (newState:ProcessState {name: $newState})
        MERGE (p)-[:HAS_STATE {since: $occurredAt}]->(newState)
        `,
        {
          instanceId: event.instanceId,
          newState: event.newState,
          occurredAt: event.occurredAt.toISOString(),
        }
      );

      // Update status if terminal state
      const terminalStates = ['completed', 'cancelled', 'failed'];
      if (terminalStates.includes(event.newState)) {
        await session.run(
          `
          MATCH (p:ProcessInstance {id: $instanceId})
          SET p.status = $newState
          `,
          {
            instanceId: event.instanceId,
            newState: event.newState,
          }
        );
      }

      this.logger.debug(
        `ProcessInstance state updated in Neo4j: ${event.instanceId} -> ${event.newState}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to update process state in Neo4j: ${err.message}`, err.stack);
      throw error;
    } finally {
      await session.close();
    }
  }
}
