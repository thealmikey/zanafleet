import { Logger } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { DeliveryStatus } from '../../../../../../packages/contracts/src'
import { EventBusService } from '../../../core/event-bus'
import { NatsSubjects } from '../../../core/event-bus/event-bus.constants'
import { MarkDeliveryDeliveredCommand } from '../commands/mark-delivery-delivered.command'
import { DeliveryEntity } from '../entities/delivery.entity'
import { DeliveryDeliveredEventV1 } from '../events/delivery-delivered.event'
import { DeliveryService } from '../services/delivery.service'

@CommandHandler(MarkDeliveryDeliveredCommand)
export class MarkDeliveryDeliveredHandler implements ICommandHandler<MarkDeliveryDeliveredCommand> {
  private readonly logger = new Logger(MarkDeliveryDeliveredHandler.name)

  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepo: Repository<DeliveryEntity>,
    private readonly deliveryService: DeliveryService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(command: MarkDeliveryDeliveredCommand): Promise<string> {
    const { deliveryId, correlationId, causationId } = command
    const existing = await this.deliveryRepo.findOneByOrFail({ id: deliveryId })

    if (existing.status === DeliveryStatus.Delivered || existing.status === DeliveryStatus.Cancelled) {
      this.logger.debug(`Idempotent skip for delivered: deliveryId=${deliveryId}`)
      return deliveryId
    }

    const deliveredAt = new Date()
    await this.deliveryService.updateStatus(deliveryId, DeliveryStatus.Delivered, { deliveredAt })

    const after = await this.deliveryRepo.findOneByOrFail({ id: deliveryId })

    const event = new DeliveryDeliveredEventV1({
      deliveryId,
      businessId: after.businessId,
      deliveredAt,
      correlationId,
      causationId,
    })

    await this.eventBus.publish(NatsSubjects.Delivery.DELIVERED_V1, event)
    return deliveryId
  }
}
