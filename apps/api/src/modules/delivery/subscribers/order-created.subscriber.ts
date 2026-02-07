import { randomUUID } from 'node:crypto'

import { Controller, Logger } from '@nestjs/common'
import { Ctx, MessagePattern, NatsContext, Payload } from '@nestjs/microservices'

import { EventBusService } from '../../../core/event-bus'
import { NatsSubjects } from '../../../core/event-bus/event-bus.constants'
import { DeliveryScheduledEventV1 } from '../events/delivery-scheduled.event'
import { DeliveryService } from '../services/delivery.service'

/**
 * Subscribes to Order.Created events and bootstraps Delivery records (opt-in via policy).
 */
@Controller()
export class OrderCreatedSubscriber {
  private readonly logger = new Logger(OrderCreatedSubscriber.name)

  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly eventBusService: EventBusService,
  ) {}

  @MessagePattern(NatsSubjects.Order.CREATED_V1)
  async handleOrderCreated(
    @Payload() data: Record<string, unknown>,
    @Ctx() _context: NatsContext,
  ): Promise<void> {
    try {
      // Defensive parse from serialized payload
      const businessId = String(data['businessId'])
      const orderId = String(data['orderId'])
      const deliveryIdFromOrder = (data['deliveryId'] ?? null) as string | null
      const itemSummary = (data['itemSummary'] ?? null) as string | null
      const scheduledTimeRaw = (data['scheduledTime'] ?? null) as string | Date | null
      const dropoffLocationId = (data['dropoffLocationId'] ?? undefined) as string | undefined
      const correlationId = (data['correlationId'] ?? undefined) as string | undefined
      const causationId = (data['causationId'] ?? undefined) as string | undefined

      // Skip if order already linked to a delivery
      if (deliveryIdFromOrder) {
        this.logger.debug(`Order ${orderId} already has deliveryId=${deliveryIdFromOrder}, skipping bootstrap`)
        return
      }

      // Policy: only bootstrap when scheduledTime is present
      const scheduledPickupTime =
        scheduledTimeRaw != null
          ? scheduledTimeRaw instanceof Date
            ? scheduledTimeRaw
            : new Date(scheduledTimeRaw)
          : null

      if (!scheduledPickupTime) {
        this.logger.debug(`Order ${orderId} has no scheduledTime; skipping delivery bootstrap`)
        return
      }

      // Create a scheduled delivery (pickupLocationId may be set later via stops)
      const delivery = await this.deliveryService.createScheduled({
        businessId,
        dropoffLocationId: dropoffLocationId ?? null,
        scheduledPickupTime,
      })

      // Link the order to this delivery (no FK)
      await this.deliveryService.linkOrders(delivery.deliveryId, [orderId])

      // Publish DeliveryScheduledEventV1
      const event = new DeliveryScheduledEventV1({
        eventId: randomUUID(),
        deliveryId: delivery.deliveryId,
        businessId,
        scheduledPickupTime,
        scheduledDropoffTime: null,
        itemSummary,
        correlationId,
        causationId,
      })

      await this.eventBusService.publish(NatsSubjects.Delivery.SCHEDULED_V1, event)
      this.logger.debug(`Bootstrapped deliveryId=${delivery.deliveryId} for orderId=${orderId}`)
    } catch (err) {
      this.logger.error('Failed to handle OrderCreated event for delivery bootstrap', err as Error)
      throw err
    }
  }
}
