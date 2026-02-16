import { Neo4jService } from '@api/core/neo4j';
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AISuggestionEntity } from '../entities/ai-suggestion.entity';
import { AISuggestionAcceptedEventV1 } from '../events/ai-suggestion-accepted.event';
import { AISuggestionGeneratedEventV1 } from '../events/ai-suggestion-generated.event';
import { AISuggestionRejectedEventV1 } from '../events/ai-suggestion-rejected.event';

/**
 * AI Suggestion Neo4j Projection
 *
 * Handles AI suggestion events to update the Neo4j graph.
 */
@EventsHandler(
  AISuggestionGeneratedEventV1,
  AISuggestionAcceptedEventV1,
  AISuggestionRejectedEventV1
)
@Injectable()
export class AISuggestionNeo4jProjection
  implements IEventHandler<AISuggestionGeneratedEventV1 | AISuggestionAcceptedEventV1 | AISuggestionRejectedEventV1>
{
  private readonly logger = new Logger(AISuggestionNeo4jProjection.name);

  constructor(
    private readonly neo4j: Neo4jService,
    @InjectRepository(AISuggestionEntity)
    private readonly suggestionRepository: Repository<AISuggestionEntity>
  ) {}

  /**
   * Handle suggestion generated event
   */
  async handle(event: AISuggestionGeneratedEventV1 | AISuggestionAcceptedEventV1 | AISuggestionRejectedEventV1): Promise<void> {
    // Route to appropriate handler based on event type
    if (event instanceof AISuggestionGeneratedEventV1) {
      await this.handleSuggestionGenerated(event);
    } else if (event instanceof AISuggestionAcceptedEventV1) {
      await this.handleSuggestionAccepted(event);
    } else if (event instanceof AISuggestionRejectedEventV1) {
      await this.handleSuggestionRejected(event);
    }
  }

  /**
   * Handle suggestion generated event
   * Creates or updates AISuggestion node in Neo4j
   */
  private async handleSuggestionGenerated(event: AISuggestionGeneratedEventV1): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      // Merge (create or update) AISuggestion node
      await session.run(
        `
        MERGE (s:AISuggestion {id: $suggestionId})
        SET s.actorId = $actorId,
            s.contextType = $contextType,
            s.contextId = $contextId,
            s.workflowState = $workflowState,
            s.capability = $capability,
            s.reason = $reason,
            s.confidence = $confidence,
            s.riskScore = $riskScore,
            s.status = $status,
            s.createdAt = datetime($createdAt),
            s.expiresAt = datetime($expiresAt),
            s.updatedAt = datetime()
        WITH s
        MATCH (a:Actor {id: $actorId})
        MERGE (a)-[:HAS_AI_SUGGESTION]->(s)
        `,
        {
          suggestionId: event.suggestionId,
          actorId: event.actorId,
          contextType: event.contextType,
          contextId: event.contextId,
          workflowState: event.workflowState,
          capability: event.capability,
          reason: event.reason,
          confidence: event.confidence,
          riskScore: event.riskScore ?? 0,
          status: 'pending',
          createdAt: event.occurredAt.toISOString(),
          expiresAt: event.expiresAt.toISOString(),
        }
      );

      // Create relationship to context (e.g., workflow)
      await session.run(
        `
        MATCH (s:AISuggestion {id: $suggestionId})
        MATCH (c {id: $contextId})
        MERGE (s)-[:SUGGESTED_FOR]->(c)
        `,
        {
          suggestionId: event.suggestionId,
          contextId: event.contextId,
        }
      );

      this.logger.debug(`Created AI suggestion node: ${event.suggestionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to create AI suggestion node: ${(error as Error).message}`,
        (error as Error).stack
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Handle suggestion accepted event
   * Updates status to accepted
   */
  private async handleSuggestionAccepted(event: AISuggestionAcceptedEventV1): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      await session.run(
        `
        MATCH (s:AISuggestion {id: $suggestionId})
        SET s.status = 'accepted',
            s.updatedAt = datetime()
        `,
        {
          suggestionId: event.suggestionId,
        }
      );

      this.logger.debug(`Updated AI suggestion status to accepted: ${event.suggestionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update AI suggestion status: ${(error as Error).message}`,
        (error as Error).stack
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Handle suggestion rejected event
   * Updates status to rejected
   */
  private async handleSuggestionRejected(event: AISuggestionRejectedEventV1): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      await session.run(
        `
        MATCH (s:AISuggestion {id: $suggestionId})
        SET s.status = 'rejected',
            s.updatedAt = datetime()
        `,
        {
          suggestionId: event.suggestionId,
        }
      );

      this.logger.debug(`Updated AI suggestion status to rejected: ${event.suggestionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to update AI suggestion status: ${(error as Error).message}`,
        (error as Error).stack
      );
    } finally {
      await session.close();
    }
  }
}
