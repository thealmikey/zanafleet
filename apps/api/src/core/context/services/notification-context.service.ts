import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationEntity } from '@api/modules/communication/entities/notification.entity';
import { DeliveryEntity } from '@api/modules/delivery/entities/delivery.entity';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';
import { WorkspaceEntity } from '@api/modules/workspace/entities/workspace.entity';

import { NotificationContext, NotificationDelivery } from '../context.types';

/**
 * NotificationContextService
 *
 * Handles context extraction and disambiguation for notifications
 * across multiple workspaces. Ensures notifications are properly
 * routed to the correct workspace context.
 */

@Injectable()
export class NotificationContextService {
  private readonly logger = new Logger(NotificationContextService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>,
    @InjectRepository(MembershipEntity)
    private readonly membershipRepository: Repository<MembershipEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>
  ) {}

  /**
   * Extract workspace context from a notification
   */
  async extractContext(notificationId: string): Promise<NotificationContext | null> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      this.logger.warn(`Notification not found: ${notificationId}`);
      return null;
    }

    // Priority 1: Explicit workspace in metadata - check correlationId which may contain workspace info
    // The notification entity has workspaceId field, use it directly
    if (notification.workspaceId) {
      return this.buildContext(notification);
    }

    // Priority 2: Try to derive from entity (via correlationId)
    if (notification.correlationId) {
      const entityWorkspace = await this.resolveEntityWorkspace(notification.correlationId);
      if (entityWorkspace) {
        return {
          ...(await this.buildContext(notification)),
          workspaceId: entityWorkspace,
        };
      }
    }

    // Priority 3: Fallback to default workspace for recipient
    const defaultWorkspace = await this.getDefaultWorkspace(notification.recipientId);
    if (defaultWorkspace) {
      return {
        ...(await this.buildContext(notification)),
        workspaceId: defaultWorkspace,
      };
    }

    return null;
  }

  /**
   * Build notification context from entity
   */
  private async buildContext(notification: NotificationEntity): Promise<NotificationContext> {
    return {
      notificationId: notification.id,
      workspaceId: notification.workspaceId,
      actorId: notification.recipientId,
      entityType: notification.correlationId ? 'job' : 'notification',
      entityId: notification.correlationId ?? '',
      action: this.inferActionFromTemplate(notification.templateId),
      deepLink: this.generateDeepLink(notification),
    };
  }

  /**
   * Infer action from template ID
   */
  private inferActionFromTemplate(templateId: string): string {
    const templateActionMap: Record<string, string> = {
      'job-offered': 'job_offered',
      'job-assigned': 'job_assigned',
      'job-completed': 'job_completed',
      'earnings-deposited': 'earnings_deposited',
      'order-created': 'order_created',
      'job-created': 'job_created',
    };

    return templateActionMap[templateId] ?? 'notification';
  }

  /**
   * Resolve workspace from entity ID (e.g., job ID)
   */
  private async resolveEntityWorkspace(entityId: string): Promise<string | null> {
    // Try to find as delivery
    const delivery = await this.deliveryRepository.findOne({
      where: { id: entityId },
      select: ['workspaceId'],
    });

    if (delivery?.workspaceId) {
      return delivery.workspaceId;
    }

    // Could extend to other entity types (Order, MoveRequest, etc.)
    return null;
  }

  /**
   * Get default workspace for actor
   */
  private async getDefaultWorkspace(actorId: string): Promise<string | null> {
    const membership = await this.membershipRepository.findOne({
      where: { actorId, defaultWorkspace: true },
    });

    if (membership) {
      return membership.workspaceId;
    }

    // Fallback to first membership
    const firstMembership = await this.membershipRepository.findOne({
      where: { actorId },
      order: { since: 'ASC' },
    });

    return firstMembership?.workspaceId ?? null;
  }

  /**
   * Generate deep link for notification
   */
  private generateDeepLink(notification: NotificationEntity): string {
    const baseUrl = process.env.APP_BASE_URL ?? 'https://app.zanafleet.com';

    // Map template to route
    const routeMap: Record<string, string> = {
      'job-offered': `/rider/jobs/${notification.correlationId}/accept`,
      'job-assigned': `/rider/jobs/${notification.correlationId}`,
      'job-completed': `/rider/jobs/${notification.correlationId}/details`,
      'earnings-deposited': '/rider/earnings',
      'order-created': `/customer/orders/${notification.correlationId}`,
      'job-created': `/business/jobs/${notification.correlationId}`,
    };

    const route = routeMap[notification.templateId] ?? '/';
    const workspaceParam = notification.workspaceId ? `?workspace=${notification.workspaceId}` : '';

    return `${baseUrl}${route}${workspaceParam}`;
  }

  /**
   * Route notification based on current context
   */
  async routeNotification(
    actorId: string,
    notificationWorkspaceId: string
  ): Promise<NotificationDelivery> {
    // Get actor's current context (default workspace)
    const currentContext = await this.getDefaultWorkspace(actorId);

    const isForCurrentWorkspace = notificationWorkspaceId === currentContext;

    if (isForCurrentWorkspace) {
      return {
        delivery: 'immediate',
        requiresContextSwitch: false,
        targetWorkspace: notificationWorkspaceId,
      };
    }

    // Check if actor has membership in notification's workspace
    const hasMembership = await this.membershipRepository.findOne({
      where: { actorId, workspaceId: notificationWorkspaceId },
    });

    if (!hasMembership) {
      // Notification is for workspace actor doesn't have access to
      return {
        delivery: 'deferred',
        requiresContextSwitch: false,
        targetWorkspace: currentContext ?? '',
        message: 'Notification is for a workspace you do not have access to',
      };
    }

    // Notification is for different workspace that actor has access to
    return {
      delivery: 'immediate',
      requiresContextSwitch: true,
      targetWorkspace: notificationWorkspaceId,
      contextSource: notificationWorkspaceId,
      message: `This notification is for a different workspace. Switch to view?`,
    };
  }

  /**
   * Batch extract contexts for multiple notifications
   */
  async extractContexts(notificationIds: string[]): Promise<NotificationContext[]> {
    const contexts: NotificationContext[] = [];

    for (const id of notificationIds) {
      const context = await this.extractContext(id);
      if (context) {
        contexts.push(context);
      }
    }

    return contexts;
  }
}
