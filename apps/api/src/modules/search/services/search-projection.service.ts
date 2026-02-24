import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { BusinessOnboardedEventV1 } from '../../business/events/business-onboarded.event';
import { DeliveryCreatedEventV1 } from '../../delivery/events/delivery-created.event';
import { DeliveryStateTransitionedEventV1 } from '../../delivery/events/delivery-state-transitioned.event';
import { OrderCreatedEventV1 } from '../../order/events/order-created.event';
import { ISearchProvider, SEARCH_PROVIDER } from '../providers/search-provider.interface';

@Injectable()
@EventsHandler(
  OrderCreatedEventV1,
  BusinessOnboardedEventV1,
  DeliveryCreatedEventV1,
  DeliveryStateTransitionedEventV1
)
export class SearchProjectionService implements IEventHandler<any> {
  private readonly logger = new Logger(SearchProjectionService.name);

  constructor(@Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider) {}

  async handle(event: any): Promise<void> {
    try {
      if (event instanceof OrderCreatedEventV1) {
        await this.handleOrderCreated(event);
      } else if (event instanceof BusinessOnboardedEventV1) {
        await this.handleBusinessOnboarded(event);
      } else if (event instanceof DeliveryCreatedEventV1) {
        await this.handleDeliveryCreated(event);
      } else if (event instanceof DeliveryStateTransitionedEventV1) {
        await this.handleDeliveryStatusChanged(event);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to process event ${event.constructor.name} for search indexing: ${error.message}`,
        error.stack
      );
    }
  }

  private async handleOrderCreated(event: OrderCreatedEventV1): Promise<void> {
    this.logger.debug(`Indexing Order: ${event.orderId}`);
    await this.searchProvider.index({
      entityId: event.orderId,
      entityType: 'Order',
      workspaceId: event.businessId, // Contextual fallback: businessId
      title: `Order #${event.orderId.slice(0, 8).toUpperCase()}`,
      description: event.itemSummary || 'No items listed',
      metadata: {
        status: event.status,
        totalAmount: event.totalAmount,
        currency: event.currency,
        paymentStatus: event.paymentStatus,
      },
      createdAt: event.createdAt,
    });
  }

  private async handleBusinessOnboarded(event: BusinessOnboardedEventV1): Promise<void> {
    this.logger.debug(`Indexing Business: ${event.businessId}`);
    await this.searchProvider.index({
      entityId: event.businessId,
      entityType: 'Business',
      workspaceId: event.businessId, // For business-level partitioning
      title: event.businessName,
      description: `${event.businessType} Merchant`,
      metadata: {
        phone: event.phone,
        email: event.email,
        businessType: event.businessType,
      },
      location: {
        latitude: event.location.latitude,
        longitude: event.location.longitude,
      },
      createdAt: event.createdAt,
    });
  }

  private async handleDeliveryCreated(event: DeliveryCreatedEventV1): Promise<void> {
    this.logger.debug(`Indexing Delivery: ${event.deliveryId}`);
    await this.searchProvider.index({
      entityId: event.deliveryId,
      entityType: 'Delivery',
      workspaceId: event.workspaceId,
      title: `Delivery #${event.deliveryId.slice(0, 8).toUpperCase()}`,
      description: `New delivery request`,
      metadata: {
        isScheduled: event.isScheduled,
        currency: event.currency,
      },
      createdAt: event.createdAt,
    });
  }

  private async handleDeliveryStatusChanged(
    event: DeliveryStateTransitionedEventV1
  ): Promise<void> {
    this.logger.debug(`Updating Delivery Index: ${event.deliveryId}`);
    // We update the existing document (Postgres provider uses UPSERT)
    await this.searchProvider.index({
      entityId: event.deliveryId,
      entityType: 'Delivery',
      workspaceId: 'UNDEFINED', // We don't have workspaceId in this event, but UPSERT works by entityId/entityType
      title: `Delivery #${event.deliveryId.slice(0, 8).toUpperCase()}`,
      description: `Delivery is now ${event.newState}`,
      metadata: {
        status: event.newState,
        previousStatus: event.previousState,
      },
      updatedAt: event.transitionedAt,
    });
  }
}
