import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliveryStatus } from '@zanafleet/contracts';
import { Repository } from 'typeorm';

import { EventBusService } from '../../../core/event-bus';
import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { AssignRiderToDeliveryCommand } from '../commands/assign-rider-to-delivery.command';
import { DeliveryEntity } from '../entities/delivery.entity';
import { DeliveryAssignedEventV1 } from '../events/delivery-assigned.event';
import { DeliveryService } from '../services/delivery.service';

@CommandHandler(AssignRiderToDeliveryCommand)
export class AssignRiderToDeliveryHandler implements ICommandHandler<AssignRiderToDeliveryCommand> {
  private readonly logger = new Logger(AssignRiderToDeliveryHandler.name);

  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepo: Repository<DeliveryEntity>,
    private readonly deliveryService: DeliveryService,
    private readonly eventBus: EventBusService
  ) {}

  async execute(command: AssignRiderToDeliveryCommand): Promise<string> {
    const { deliveryId, riderId, notifyAssignment, correlationId, causationId } = command;
    const existing = await this.deliveryRepo.findOneByOrFail({ id: deliveryId });

    if (
      existing.status === DeliveryStatus.Delivered ||
      existing.status === DeliveryStatus.Cancelled ||
      (existing.status === DeliveryStatus.Assigned && existing.assignedRiderId === riderId)
    ) {
      this.logger.debug(`Idempotent skip for assign rider: deliveryId=${deliveryId}`);
      return deliveryId;
    }

    await this.deliveryService.assignRider(deliveryId, riderId, notifyAssignment);
    if (existing.status !== DeliveryStatus.Assigned) {
      await this.deliveryService.updateStatus(deliveryId, DeliveryStatus.Assigned);
    }

    const after = await this.deliveryRepo.findOneByOrFail({ id: deliveryId });

    const event = new DeliveryAssignedEventV1({
      deliveryId,
      businessId: after.businessId,
      assignedRiderId: riderId,
      assignedAt: after.assignedAt ?? null,
      accepted: undefined,
      correlationId,
      causationId,
    });

    await this.eventBus.publish(NatsSubjects.Delivery.ASSIGNED_V1, event);
    return deliveryId;
  }
}
