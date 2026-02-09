import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import {
  CreatePaymentIntentCommand,
  PaymentFlowType,
} from '@api/modules/payment';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus, CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { IssueInvoiceCommand } from '../commands/issue-invoice.command';
import { InvoiceStatus } from '../dto/billing.enums';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceIssuedEventV1 } from '../events/invoice-issued.event';

export interface IssueInvoiceResult {
  invoiceId: string;
  paymentIntentId: string;
}

/**
 * IssueInvoiceCommandHandler
 * Transitions invoice from DRAFT to ISSUED and creates PaymentIntent
 */
@Injectable()
@CommandHandler(IssueInvoiceCommand)
export class IssueInvoiceCommandHandler implements ICommandHandler<IssueInvoiceCommand> {
  private readonly logger = new Logger(IssueInvoiceCommandHandler.name);

  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepository: Repository<InvoiceEntity>,
    private readonly eventBus: EventBus,
    private readonly commandBus: CommandBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async execute(command: IssueInvoiceCommand): Promise<IssueInvoiceResult> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: command.invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice not found: ${command.invoiceId}`);
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error(`Invoice is not in DRAFT status: ${invoice.status}`);
    }

    const invoiceDomain = invoice.toDomain();

    const paymentResult = await this.commandBus.execute(
      new CreatePaymentIntentCommand({
        payerAccountId: invoiceDomain.payerAccountId,
        payeeAccountId: invoiceDomain.payeeAccountId,
        flowType: PaymentFlowType.C2B,
        amount: invoiceDomain.grandTotal,
        currency: invoiceDomain.currency,
        paymentMethod: command.paymentMethod,
        providerId: command.providerId,
        invoiceId: command.invoiceId,
        idempotencyKey: `invoice-${command.invoiceId}`,
        metadata: {
          invoiceId: command.invoiceId,
          deliveryId: invoiceDomain.deliveryId,
          orderId: invoiceDomain.orderId,
        },
      }),
    );

    await this.invoiceRepository.update(command.invoiceId, {
      status: InvoiceStatus.ISSUED,
    });

    const event = new InvoiceIssuedEventV1({
      eventId: uuidv4(),
      invoiceId: command.invoiceId,
      payerAccountId: invoiceDomain.payerAccountId,
      payeeAccountId: invoiceDomain.payeeAccountId,
      grandTotal: invoiceDomain.grandTotal,
      currency: invoiceDomain.currency,
      status: InvoiceStatus.ISSUED,
      paymentIntentId: paymentResult.paymentIntentId,
      correlationId: command.correlationId,
    });

    this.eventBus.publish(event);

    if (this.eventBusService) {
      this.eventBusService
        .publish(NatsSubjects.Billing.INVOICE_ISSUED_V1, event)
        .catch((error) => {
          this.logger.error(`Failed to publish InvoiceIssuedEvent to NATS: ${error.message}`);
        });
    }

    this.logger.log(
      `Invoice issued: ${command.invoiceId}, paymentIntent: ${paymentResult.paymentIntentId}`,
    );

    return {
      invoiceId: command.invoiceId,
      paymentIntentId: paymentResult.paymentIntentId,
    };
  }
}
