import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { CreatePaymentIntentCommand } from '../commands/create-payment-intent.command';
import { PaymentIntentStatus } from '../dto/payment.enums';
import { PaymentIntentEntity } from '../entities/payment-intent.entity';
import { PaymentIntentCreatedEventV1 } from '../events/payment-intent-created.event';

export interface CreatePaymentIntentResult {
  paymentIntentId: string;
  isNew: boolean;
}

/**
 * CreatePaymentIntentCommandHandler
 * Handles the creation of new payment intents with idempotency support
 */
@Injectable()
@CommandHandler(CreatePaymentIntentCommand)
export class CreatePaymentIntentCommandHandler
  implements ICommandHandler<CreatePaymentIntentCommand>
{
  private readonly logger = new Logger(CreatePaymentIntentCommandHandler.name);

  constructor(
    @InjectRepository(PaymentIntentEntity)
    private readonly paymentIntentRepository: Repository<PaymentIntentEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  async execute(command: CreatePaymentIntentCommand): Promise<CreatePaymentIntentResult> {
    const existingIntent = await this.paymentIntentRepository.findOne({
      where: { idempotencyKey: command.idempotencyKey },
    });

    if (existingIntent) {
      this.logger.log(`Idempotent request: returning existing payment intent ${existingIntent.id}`);
      return {
        paymentIntentId: existingIntent.id,
        isNew: false,
      };
    }

    const paymentIntentId = uuidv4();
    const now = new Date();

    const entity = PaymentIntentEntity.fromDomain({
      paymentIntentId,
      payerAccountId: command.payerAccountId,
      payeeAccountId: command.payeeAccountId,
      flowType: command.flowType,
      amount: command.amount,
      currency: command.currency,
      status: PaymentIntentStatus.CREATED,
      paymentMethod: command.paymentMethod,
      providerId: command.providerId,
      invoiceId: command.invoiceId,
      idempotencyKey: command.idempotencyKey,
      metadata: command.metadata,
      expiresAt: command.expiresAt,
      createdAt: now,
    });

    await this.paymentIntentRepository.save(entity);

    const event = new PaymentIntentCreatedEventV1({
      eventId: uuidv4(),
      paymentIntentId,
      payerAccountId: command.payerAccountId,
      payeeAccountId: command.payeeAccountId,
      flowType: command.flowType,
      amount: command.amount,
      currency: command.currency,
      status: PaymentIntentStatus.CREATED,
      paymentMethod: command.paymentMethod,
      providerId: command.providerId,
      idempotencyKey: command.idempotencyKey,
    });

    this.eventBus.publish(event);

    if (this.eventBusService) {
      this.eventBusService.publish(NatsSubjects.Payment.INTENT_CREATED_V1, event).catch((error) => {
        this.logger.error(`Failed to publish PaymentIntentCreatedEvent to NATS: ${error.message}`);
      });
    }

    this.logger.log(
      `Payment intent created: ${paymentIntentId} for ${command.amount} ${command.currency}`
    );

    return {
      paymentIntentId,
      isNew: true,
    };
  }
}
