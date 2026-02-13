import { Logger } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { DeliveryStatus } from '@zanafleet/contracts'
import { Repository } from 'typeorm'

import { EventBusService } from '../../../core/event-bus'
import { NatsSubjects } from '../../../core/event-bus/event-bus.constants'
import { CancelDeliveryCommand } from '../commands/cancel-delivery.command'
import { DeliveryEntity } from '../entities/delivery.entity'
import { DeliveryCancelledEventV1 } from '../events/delivery-cancelled.event'
import { DeliveryService } from '../services/delivery.service'

@CommandHandler(CancelDeliveryCommand)
export class CancelDeliveryHandler implements ICommandHandler<CancelDeliveryCommand> {
  private readonly logger = new Logger(CancelDeliveryHandler.name)

  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepo: Repository<DeliveryEntity>,
    private readonly deliveryService: DeliveryService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(command: CancelDeliveryCommand): Promise<string> {
    const { deliveryId, reason, correlationId, causationId } = command
    const existing = await this.deliveryRepo.findOneByOrFail({ id: deliveryId })

    if (existing.status === DeliveryStatus.Cancelled || existing.status === DeliveryStatus.Delivered) {
      this.logger.debug(`Idempotent skip for cancel: deliveryId=${deliveryId}`)
      return deliveryId
    }

    const cancelledAt = new Date()
    await this.deliveryService.updateStatus(deliveryId, DeliveryStatus.Cancelled, { cancelledAt })

    // Get delivery state after update
    await this.deliveryRepo.findOneByOrFail({ id: deliveryId })

    const event = new DeliveryCancelledEventV1({
      eventId: randomUUID(),
      deliveryId,
      reason: reason ?? 'Not specified',
      previousState: existing.status,
      ledgerReservationReleased: false,
      cancelledAt,
      correlationId,
      causationId,
    })

    await this.eventBus.publish(NatsSubjects.Delivery.CANCELLED_V1, event)
    return deliveryId
  }
}
