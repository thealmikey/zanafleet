import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { LocationResolverService } from '@api/core/location/location-resolver.service';
import { haversineDistanceMeters } from '@api/core/utils/geo.utils';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { CreateOrderCommand } from '../../order/commands/create-order.command';
import { OrderEntity } from '../../order/entities/order.entity';
import { DeliveryLocationEntity } from '../entities/delivery-location.entity';
import { DeliveryRequestedEventV1 } from '../events/delivery-requested.event';
import { DeliveryService } from '../services/delivery.service';

import { DeliveryLifecycleCoordinator } from './delivery-lifecycle.coordinator';
import { DeliveryMatchingCoordinator } from './delivery-matching.coordinator';

export interface LocationPinInput {
  locationId?: string;
  latitude?: number;
  longitude?: number;
  label?: string;
}

export interface RequestDeliveryInput {
  businessId: string;
  workspaceId: string;
  actorId: string;
  pickup: LocationPinInput;
  dropoff: LocationPinInput;
  recipientName: string;
  recipientPhone: string;
  itemId?: string;
  itemDescription?: string;
  scheduledPickupTime?: Date;
  declaredItemValue?: number;
  specialInstructions?: string;
  distanceKm?: number;
}

export interface RequestDeliveryResult {
  deliveryId: string;
  orderId: string;
  estimatedCharges: number;
  currency: string;
  matchingTriggered: boolean;
  assignedRiderId: string | null;
}

@Injectable()
export class DeliveryRequestCoordinator {
  private readonly logger = new Logger(DeliveryRequestCoordinator.name);

  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(DeliveryLocationEntity)
    private readonly deliveryLocationRepository: Repository<DeliveryLocationEntity>,
    private readonly locationResolverService: LocationResolverService,
    private readonly deliveryLifecycleCoordinator: DeliveryLifecycleCoordinator,
    private readonly deliveryMatchingCoordinator: DeliveryMatchingCoordinator,
    private readonly deliveryService: DeliveryService,
    private readonly eventBus: EventBusService,
  ) { }

  async requestDelivery(input: RequestDeliveryInput): Promise<RequestDeliveryResult> {
    const itemSummary = this.buildItemSummary(input.itemId, input.itemDescription);
    const pickup = await this.resolveLocationPin(input.pickup);
    const dropoff = await this.resolveLocationPin(input.dropoff);

    const distanceKm = input.distanceKm ?? this.estimateDistanceKm(pickup.point, dropoff.point);

    const orderInput = CreateOrderCommand.validate({
      businessId: input.businessId,
      itemSummary,
      customerName: input.recipientName,
      customerPhone: input.recipientPhone,
      scheduledTime: input.scheduledPickupTime,
      itemMetadata: {
        itemId: input.itemId ?? null,
        pickupLocationId: pickup.locationId,
        dropoffLocationId: dropoff.locationId,
        pickupCoordinates: pickup.point,
        dropoffCoordinates: dropoff.point,
        declaredItemValue: input.declaredItemValue ?? null,
        specialInstructions: input.specialInstructions ?? null,
      },
    });

    const orderId = await this.commandBus.execute<CreateOrderCommand, string>(
      new CreateOrderCommand(orderInput),
    );

    const lifecycleResult = await this.deliveryLifecycleCoordinator.createDelivery({
      businessId: input.businessId,
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      pickupLocationId: pickup.locationId,
      dropoffLocationId: dropoff.locationId,
      isScheduled: !!input.scheduledPickupTime,
      scheduledPickupTime: input.scheduledPickupTime,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      distanceKm,
    });

    await this.orderRepository.update(orderId, {
      deliveryId: lifecycleResult.deliveryId,
    });
    await this.deliveryService.linkOrders(lifecycleResult.deliveryId, [orderId]);

    const requestedEvent = new DeliveryRequestedEventV1({
      eventId: uuidv4(),
      deliveryId: lifecycleResult.deliveryId,
      businessId: input.businessId,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      orderId,
      requestedAt: new Date(),
      estimatedCharges: lifecycleResult.estimatedCharges,
      currency: 'KES',
      itemSummary,
      customerName: input.recipientName,
      customerPhone: input.recipientPhone,
      scheduledPickupTime: input.scheduledPickupTime ?? null,
    });

    await this.eventBus.publish(NatsSubjects.Delivery.REQUESTED_V1, requestedEvent);

    let assignedRiderId: string | null = null;
    let matchingTriggered = false;

    if (!input.scheduledPickupTime) {
      matchingTriggered = true;
      try {
        const matchingResult = await this.deliveryMatchingCoordinator.findAndAssignRider(
          lifecycleResult.deliveryId,
        );
        assignedRiderId = matchingResult.success ? matchingResult.assignedRiderId ?? null : null;
      } catch (error) {
        this.logger.warn(
          `Auto-matching failed for delivery ${lifecycleResult.deliveryId}: ${(error as Error).message}`,
        );
      }
    }

    return {
      deliveryId: lifecycleResult.deliveryId,
      orderId,
      estimatedCharges: lifecycleResult.estimatedCharges,
      currency: 'KES',
      matchingTriggered,
      assignedRiderId,
    };
  }

  private buildItemSummary(itemId?: string, itemDescription?: string): string {
    const normalizedItemId = itemId?.trim();
    const normalizedDescription = itemDescription?.trim();

    if (!normalizedItemId && !normalizedDescription) {
      throw new BadRequestException('Either itemId or itemDescription must be provided');
    }

    if (normalizedItemId && normalizedDescription) {
      return `${normalizedItemId}: ${normalizedDescription}`;
    }

    return normalizedDescription ?? normalizedItemId!;
  }

  private async resolveLocationPin(input: LocationPinInput): Promise<{
    locationId: string;
    point: { latitude: number; longitude: number } | null;
  }> {
    if (input.locationId?.trim()) {
      if (input.latitude !== undefined && input.longitude !== undefined) {
        return {
          locationId: input.locationId,
          point: { latitude: input.latitude, longitude: input.longitude },
        };
      }

      const point = await this.locationResolverService.resolveToPoint(input.locationId);
      return {
        locationId: input.locationId,
        point,
      };
    }

    if (input.latitude === undefined || input.longitude === undefined) {
      throw new BadRequestException(
        'A location requires either locationId or both latitude and longitude',
      );
    }

    if (input.latitude < -90 || input.latitude > 90) {
      throw new BadRequestException('Latitude must be between -90 and 90');
    }

    if (input.longitude < -180 || input.longitude > 180) {
      throw new BadRequestException('Longitude must be between -180 and 180');
    }

    const entity = this.deliveryLocationRepository.create({
      id: uuidv4(),
      latitude: input.latitude,
      longitude: input.longitude,
      point: {
        type: 'Point',
        coordinates: [input.longitude, input.latitude],
      },
      label: input.label?.trim() || null,
      source: 'CUSTOMER_PIN',
    });

    await this.deliveryLocationRepository.save(entity);

    return {
      locationId: entity.id,
      point: {
        latitude: entity.latitude,
        longitude: entity.longitude,
      },
    };
  }

  private estimateDistanceKm(
    pickup: { latitude: number; longitude: number } | null,
    dropoff: { latitude: number; longitude: number } | null,
  ): number | undefined {
    if (!pickup || !dropoff) {
      return undefined;
    }

    const meters = haversineDistanceMeters(pickup, dropoff);
    return Number((meters / 1000).toFixed(2));
  }
}
