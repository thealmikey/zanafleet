import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '@api/core/event-bus';
import { OrderStatus } from '@zanafleet/contracts';
import { OrderEntity } from '../entities/order.entity';
import { OrderCreatedEventV1 } from '../events/order-created.event';
import { CreateOrderCommand } from '../commands/create-order.command';

/**
 * CreateOrderCommandHandler
 *
 * Persists a new Order with Pending status and emits OrderCreatedEventV1.
 * Does not create Delivery to avoid cross-module coupling.
 */
@CommandHandler(CreateOrderCommand)
@Injectable()
export class CreateOrderCommandHandler implements ICommandHandler<CreateOrderCommand> {
  private readonly logger = new Logger(CreateOrderCommandHandler.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async execute(command: CreateOrderCommand): Promise<string> {
    const now = new Date();
    const orderId = uuidv4();
    const eventId = uuidv4();

    // Basic anti-duplication guard is domain-specific; skipping unless unique keys exist.
    // If later we add a dedupe key (e.g., idempotencyKey), we can enforce here.

    try {
      const entity = OrderEntity.fromDomain({
        orderId,
        businessId: command.businessId,
        deliveryId: null,
        itemSummary: command.itemSummary ?? null,
        itemMetadata: command.itemMetadata ?? null,
        customerName: command.customerName ?? null,
        customerPhone: command.customerPhone ?? null,
        scheduledTime: command.scheduledTime ?? null,
        status: OrderStatus.Pending,
        createdAt: now,
      });

      await this.orderRepository.save(entity);
      this.logger.log(`Order persisted: ${orderId}`);

      const event = new OrderCreatedEventV1({
        eventId,
        orderId,
        businessId: command.businessId,
        deliveryId: null,
        itemSummary: command.itemSummary ?? null,
        scheduledTime: command.scheduledTime ?? null,
        status: OrderStatus.Pending,
        createdAt: now,
        occurredAt: now,
      });

      this.eventBus.publish(event);
      this.logger.log(`OrderCreatedEventV1 emitted: ${eventId}`);

      if (this.eventBusService) {
        await this.eventBusService
          .publish('order.events.created-v1', event)
          .catch((err: Error) => this.logger.warn(`NATS publish failed: ${err.message}`));
      }

      return orderId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to create order: ${err.message}`, err.stack);
      throw error;
    }
  }
}
