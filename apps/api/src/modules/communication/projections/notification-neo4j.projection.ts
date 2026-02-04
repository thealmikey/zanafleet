import { Injectable, Logger } from '@nestjs/common';
import { IEventHandler } from '@nestjs/cqrs';

import { Neo4jService } from '../../../core/neo4j/neo4j.service';
import { NotificationSentEventV1 } from '../events/notification-sent.event';
import { NotificationFailedEventV1 } from '../events/notification-failed.event';
import { NotificationSkippedEventV1 } from '../events/notification-skipped.event';
import { RecipientType } from '../dto/notification.enums';

/**
 * NotificationNeo4jProjection
 *
 * Maintains notification state in Neo4j graph database for real-time visibility.
 * Follows dual-persistence pattern:
 * - Postgres: Primary store for notification entities
 * - Neo4j: Graph projection for relationships and analytics
 *
 * Creates Notification nodes with:
 * - Status tracking (SENT, FAILED, SKIPPED)
 * - Recipient relationships based on type (Actor, Rider, Business)
 * - Template usage tracking
 */
@Injectable()
export class NotificationNeo4jProjection
  implements
    IEventHandler<NotificationSentEventV1 | NotificationFailedEventV1 | NotificationSkippedEventV1>
{
  private readonly logger = new Logger(NotificationNeo4jProjection.name);

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Route events to appropriate handlers based on event type
   */
  async handle(
    event: NotificationSentEventV1 | NotificationFailedEventV1 | NotificationSkippedEventV1,
  ): Promise<void> {
    if (event.eventType === 'NotificationSentEvent-V1') {
      await this.handleNotificationSent(event as NotificationSentEventV1);
    } else if (event.eventType === 'NotificationFailedEvent-V1') {
      await this.handleNotificationFailed(event as NotificationFailedEventV1);
    } else if (event.eventType === 'NotificationSkippedEvent-V1') {
      await this.handleNotificationSkipped(event as NotificationSkippedEventV1);
    }
  }

  /**
   * Handle NotificationSentEventV1
   * Creates notification node and recipient relationship
   *
   * Cypher Pattern:
   * MATCH (r:Actor {id: $recipientId})
   * CREATE (n:Notification {id: $notificationId, channel: $channel, status: 'SENT', sentAt: $sentAt})
   * CREATE (r)-[:RECEIVED]->(n)
   * CREATE (n)-[:USED_TEMPLATE]->(t)
   */
  private async handleNotificationSent(event: NotificationSentEventV1): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      const recipientLabel = this.getRecipientLabel(event.recipientType);

      // Create notification and link to recipient
      const createNotificationQuery = `
        MATCH (r:${recipientLabel} {id: $recipientId})
        CREATE (n:Notification {
          id: $notificationId,
          channel: $channel,
          status: 'SENT',
          sentAt: $sentAt,
          createdAt: datetime()
        })
        CREATE (r)-[:RECEIVED]->(n)
      `;

      await session.run(createNotificationQuery, {
        recipientId: event.recipientId,
        notificationId: event.aggregateId,
        channel: event.channel,
        sentAt: event.occurredAt,
      });

      // Link to template if available
      if ('templateId' in event && event.templateId) {
        const linkTemplateQuery = `
          MATCH (n:Notification {id: $notificationId})
          MATCH (t:Template {id: $templateId})
          CREATE (n)-[:USED_TEMPLATE]->(t)
        `;

        await session.run(linkTemplateQuery, {
          notificationId: event.aggregateId,
          templateId: event.templateId,
        });
      }

      this.logger.debug(
        `Notification sent: ${event.aggregateId} to ${event.recipientType} ${event.recipientId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to project notification sent event: ${event.aggregateId}`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Handle NotificationFailedEventV1
   * Creates or updates notification node with failure status
   *
   * Cypher Pattern:
   * MERGE (n:Notification {id: $notificationId})
   * SET n.status = 'FAILED', n.error = $error, n.failedAt = $failedAt
   */
  private async handleNotificationFailed(event: NotificationFailedEventV1): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      const mergeNotificationQuery = `
        MERGE (n:Notification {id: $notificationId})
        SET n.status = 'FAILED',
            n.error = $error,
            n.failedAt = $failedAt,
            n.updatedAt = datetime()
      `;

      await session.run(mergeNotificationQuery, {
        notificationId: event.aggregateId,
        error: event.error,
        failedAt: event.occurredAt,
      });

      this.logger.debug(`Notification failed: ${event.aggregateId} - ${event.error}`);
    } catch (error) {
      this.logger.error(`Failed to project notification failed event: ${event.aggregateId}`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Handle NotificationSkippedEventV1
   * Creates notification node with skipped status
   *
   * Cypher Pattern:
   * CREATE (n:Notification {id: $notificationId, status: 'SKIPPED', reason: $reason})
   */
  private async handleNotificationSkipped(event: NotificationSkippedEventV1): Promise<void> {
    const session = this.neo4j.getWriteSession();

    try {
      const createNotificationQuery = `
        CREATE (n:Notification {
          id: $notificationId,
          status: 'SKIPPED',
          reason: $reason,
          createdAt: datetime()
        })
      `;

      await session.run(createNotificationQuery, {
        notificationId: event.aggregateId,
        reason: event.reason,
      });

      this.logger.debug(`Notification skipped: ${event.aggregateId} - ${event.reason}`);
    } catch (error) {
      this.logger.error(
        `Failed to project notification skipped event: ${event.aggregateId}`,
        error,
      );
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Get Neo4j node label for recipient type
   */
  private getRecipientLabel(recipientType: RecipientType): string {
    switch (recipientType) {
      case RecipientType.ACTOR:
        return 'Actor';
      case RecipientType.RIDER:
        return 'Rider';
      case RecipientType.BUSINESS:
        return 'Business';
      default:
        return 'Actor';
    }
  }
}
