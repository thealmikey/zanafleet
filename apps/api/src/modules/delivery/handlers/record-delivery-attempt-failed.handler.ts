import { Logger } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { RecordDeliveryAttemptFailedCommand } from '../commands/record-delivery-attempt-failed.command'
import { DeliveryEntity } from '../entities/delivery.entity'
import { DeliveryService } from '../services/delivery.service'
import { EventBusService } from '../../../core/event-bus'
import { NatsSubjects } from '../../../core/event-bus/event-bus.constants'
import { DeliveryFailedEventV1 } from '../events/delivery-failed.event'

@CommandHandler(RecordDeliveryAttemptFailedCommand)
export class RecordDeliveryAttemptFailedHandler
  implements ICommandHandler<RecordDeliveryAttemptFailedCommand>
{
  private readonly logger = new Logger(RecordDeliveryAttemptFailedHandler.name)

  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepo: Repository<DeliveryEntity>,
    private readonly deliveryService: DeliveryService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(command: RecordDeliveryAttemptFailedCommand): Promise<string> {
    const { deliveryId, reason, correlationId, causationId } = command
    // Load to access businessId
    const before = await this.deliveryRepo.findOneByOrFail({ id: deliveryId })

    await this.deliveryService.recordAttemptFailure(deliveryId, reason)

    const after = await this.deliveryRepo.findOneByOrFail({ id: deliveryId })

    if (after.lastAttemptAt == null) {
      this.logger.warn(`No lastAttemptAt after recording failure for deliveryId=${deliveryId}`)
      return deliveryId
    }

    const event = new DeliveryFailedEventV1({
      deliveryId,
      businessId: before.businessId,
      attemptCount: after.attemptCount,
      lastAttemptAt: after.lastAttemptAt,
      reason,
      correlationId,
      causationId,
    })

    await this.eventBus.publish(NatsSubjects.Delivery.FAILED_V1, event)
    return deliveryId
  }
}
