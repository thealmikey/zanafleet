import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { CreateInvoiceCommand } from '../commands/create-invoice.command';
import { InvoiceStatus } from '../dto/billing.enums';
import { ChargeEntity } from '../entities/charge.entity';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceCreatedEventV1, ChargeData } from '../events/invoice-created.event';
import { BillingCalculatorService } from '../services/billing-calculator.service';

/**
 * CreateInvoiceCommandHandler
 * Handles the atomic creation of invoices with their associated charges
 */
@Injectable()
@CommandHandler(CreateInvoiceCommand)
export class CreateInvoiceCommandHandler implements ICommandHandler<CreateInvoiceCommand> {
  private readonly logger = new Logger(CreateInvoiceCommandHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly billingCalculator: BillingCalculatorService,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  async execute(command: CreateInvoiceCommand): Promise<string> {
    const invoiceId = uuidv4();
    const now = new Date();

    const totals = this.billingCalculator.calculateTotalsFromCharges(command.charges);

    const chargeEntities: ChargeEntity[] = [];
    const chargeData: ChargeData[] = [];

    for (const charge of command.charges) {
      const chargeId = uuidv4();
      chargeEntities.push(
        ChargeEntity.fromDomain({
          chargeId,
          invoiceId,
          chargeType: charge.chargeType,
          description: charge.description,
          amount: charge.amount,
          currency: charge.currency,
          quantity: charge.quantity,
          unitPrice: charge.unitPrice,
          metadata: charge.metadata,
          createdAt: now,
        })
      );
      chargeData.push({
        chargeId,
        chargeType: charge.chargeType,
        description: charge.description ?? null,
        amount: charge.amount,
        currency: charge.currency,
        quantity: charge.quantity ?? 1,
        unitPrice: charge.unitPrice,
      });
    }

    const invoiceEntity = InvoiceEntity.fromDomain({
      invoiceId,
      payerAccountId: command.payerAccountId,
      payeeAccountId: command.payeeAccountId,
      deliveryId: command.deliveryId,
      orderId: command.orderId,
      status: InvoiceStatus.DRAFT,
      subtotal: totals.subtotal,
      totalDiscounts: totals.totalDiscounts,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
      currency: command.currency,
      dueDate: command.dueDate,
      metadata: command.metadata,
      createdAt: now,
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.save(InvoiceEntity, invoiceEntity);
      await manager.save(ChargeEntity, chargeEntities);
    });

    const event = new InvoiceCreatedEventV1({
      eventId: uuidv4(),
      invoiceId,
      payerAccountId: command.payerAccountId,
      payeeAccountId: command.payeeAccountId,
      deliveryId: command.deliveryId,
      orderId: command.orderId,
      status: InvoiceStatus.DRAFT,
      subtotal: totals.subtotal,
      totalDiscounts: totals.totalDiscounts,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
      currency: command.currency,
      charges: chargeData,
    });

    this.eventBus.publish(event);

    if (this.eventBusService) {
      this.eventBusService
        .publish(NatsSubjects.Billing.INVOICE_CREATED_V1, event)
        .catch((error) => {
          this.logger.error(`Failed to publish InvoiceCreatedEvent to NATS: ${error.message}`);
        });
    }

    this.logger.log(
      `Invoice created: ${invoiceId} with ${chargeEntities.length} charges, grandTotal: ${totals.grandTotal} ${command.currency}`
    );

    return invoiceId;
  }
}
