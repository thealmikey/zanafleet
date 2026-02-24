import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliveryStatus } from '@zanafleet/contracts';
import { Repository } from 'typeorm';

import { EventBusService } from '../../../core/event-bus';
import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { AcceptDeliveryAssignmentCommand } from '../commands/accept-delivery-assignment.command';
import { DeliveryEntity } from '../entities/delivery.entity';
import { DeliveryAssignedEventV1 } from '../events/delivery-assigned.event';
import { DeliveryService } from '../services/delivery.service';

@CommandHandler(AcceptDeliveryAssignmentCommand)
export class AcceptDeliveryAssignmentHandler
  implements ICommandHandler<AcceptDeliveryAssignmentCommand>
{
  private readonly logger = new Logger(AcceptDeliveryAssignmentHandler.name);

  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepo: Repository<DeliveryEntity>,
    private readonly deliveryService: DeliveryService,
    private readonly eventBus: EventBusService
  ) {}

  async execute(command: AcceptDeliveryAssignmentCommand): Promise<string> {
    const { deliveryId, riderId, correlationId, causationId } = command;
    const existing = await this.deliveryRepo.findOneByOrFail({ id: deliveryId });

    if (existing.assignedRiderId === riderId && existing.assignmentNotifiedAt != null) {
      this.logger.debug(`Idempotent skip for accept assignment: deliveryId=${deliveryId}`);
      return deliveryId;
    }

    await this.deliveryService.assignRider(deliveryId, riderId, true);
    if (
      existing.status !== DeliveryStatus.Assigned &&
      existing.status !== DeliveryStatus.PickedUp &&
      existing.status !== DeliveryStatus.InTransit
    ) {
      await this.deliveryService.updateStatus(deliveryId, DeliveryStatus.Assigned);
    }

    const after = await this.deliveryRepo.findOneByOrFail({ id: deliveryId });

    const event = new DeliveryAssignedEventV1({
      deliveryId,
      businessId: after.businessId,
      assignedRiderId: riderId,
      assignedAt: after.assignedAt ?? null,
      accepted: true,
      correlationId,
      causationId,
    });

    await this.eventBus.publish(NatsSubjects.Delivery.ASSIGNED_V1, event);
    return deliveryId;
  }
}
