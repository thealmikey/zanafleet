import { Logger } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { MarkDeliveryPickedUpCommand } from '../commands/mark-delivery-picked-up.command'
import { DeliveryEntity } from '../entities/delivery.entity'
import { DeliveryService } from '../services/delivery.service'
import { EventBusService } from '../../../core/event-bus'
import { NatsSubjects } from '../../../core/event-bus/event-bus.constants'
import { DeliveryStatus } from '../../../../../../packages/contracts/src'
import { DeliveryPickedUpEventV1 } from '../events/delivery-picked-up.event'

@CommandHandler(MarkDeliveryPickedUpCommand)
export class MarkDeliveryPickedUpHandler implements ICommandHandler<MarkDeliveryPickedUpCommand> {
  private readonly logger = new Logger(MarkDeliveryPickedUpHandler.name)

  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepo: Repository<DeliveryEntity>,
    private readonly deliveryService: DeliveryService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(command: MarkDeliveryPickedUpCommand): Promise<string> {
    const { deliveryId, correlationId, causationId } = command
    const existing = await this.deliveryRepo.findOneByOrFail({ id: deliveryId })

    if (
      existing.status === DeliveryStatus.PickedUp ||
      existing.status === DeliveryStatus.InTransit ||
      existing.status === DeliveryStatus.Delivered ||
      existing.status === DeliveryStatus.Cancelled
    ) {
      this.logger.debug(`Idempotent skip for picked-up: deliveryId=${deliveryId}`)
      return deliveryId
    }

    const pickedUpAt = new Date()
    await this.deliveryService.updateStatus(deliveryId, DeliveryStatus.PickedUp, { pickedUpAt })

    const after = await this.deliveryRepo.findOneByOrFail({ id: deliveryId })

    const event = new DeliveryPickedUpEventV1({
      deliveryId,
      businessId: after.businessId,
      pickedUpAt,
      correlationId,
      causationId,
    })

    await this.eventBus.publish(NatsSubjects.Delivery.PICKED_UP_V1, event)
    return deliveryId
  }
}
