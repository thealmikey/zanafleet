import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliveryStatus } from '@zanafleet/contracts';
import { Repository } from 'typeorm';

import { EventBusService } from '../../../core/event-bus';
import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { MarkDeliveryInTransitCommand } from '../commands/mark-delivery-in-transit.command';
import { DeliveryEntity } from '../entities/delivery.entity';
import { DeliveryInTransitEventV1 } from '../events/delivery-in-transit.event';
import { DeliveryService } from '../services/delivery.service';

@CommandHandler(MarkDeliveryInTransitCommand)
export class MarkDeliveryInTransitHandler implements ICommandHandler<MarkDeliveryInTransitCommand> {
  private readonly logger = new Logger(MarkDeliveryInTransitHandler.name);

  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepo: Repository<DeliveryEntity>,
    private readonly deliveryService: DeliveryService,
    private readonly eventBus: EventBusService
  ) {}

  async execute(command: MarkDeliveryInTransitCommand): Promise<string> {
    const { deliveryId, correlationId, causationId } = command;
    const existing = await this.deliveryRepo.findOneByOrFail({ id: deliveryId });

    if (
      existing.status === DeliveryStatus.InTransit ||
      existing.status === DeliveryStatus.Delivered ||
      existing.status === DeliveryStatus.Cancelled
    ) {
      this.logger.debug(`Idempotent skip for in-transit: deliveryId=${deliveryId}`);
      return deliveryId;
    }

    await this.deliveryService.updateStatus(deliveryId, DeliveryStatus.InTransit);

    const after = await this.deliveryRepo.findOneByOrFail({ id: deliveryId });
    const inTransitAt = new Date();

    const event = new DeliveryInTransitEventV1({
      deliveryId,
      businessId: after.businessId,
      inTransitAt,
      correlationId,
      causationId,
    });

    await this.eventBus.publish(NatsSubjects.Delivery.IN_TRANSIT_V1, event);
    return deliveryId;
  }
}
