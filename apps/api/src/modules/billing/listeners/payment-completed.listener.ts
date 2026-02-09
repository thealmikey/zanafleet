import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { PaymentCompletedEventV1 } from '@api/modules/payment';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventsHandler, IEventHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { InvoiceStatus } from '../dto/billing.enums';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoicePaidEventV1 } from '../events/invoice-paid.event';

/**
 * PaymentCompletedListener
 * Listens for PaymentCompletedEventV1 and marks associated invoices as PAID
 */
@Injectable()
@EventsHandler(PaymentCompletedEventV1)
export class PaymentCompletedListener implements IEventHandler<PaymentCompletedEventV1> {
  private readonly logger = new Logger(PaymentCompletedListener.name);

  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepository: Repository<InvoiceEntity>,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async handle(event: PaymentCompletedEventV1): Promise<void> {
    this.logger.debug(`Handling PaymentCompletedEventV1: ${event.paymentIntentId}`);

    if (!event.invoiceId) {
      this.logger.debug(
        `Payment ${event.paymentIntentId} is not associated with an invoice, skipping`,
      );
      return;
    }

    const invoice = await this.invoiceRepository.findOne({
      where: { id: event.invoiceId },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found for payment: ${event.invoiceId}`);
      return;
    }

    if (invoice.status === InvoiceStatus.PAID) {
      this.logger.debug(`Invoice ${invoice.id} is already PAID, skipping`);
      return;
    }

    const paidAt = new Date();

    await this.invoiceRepository.update(invoice.id, {
      status: InvoiceStatus.PAID,
      paidAt,
    });

    const invoiceDomain = invoice.toDomain();

    const paidEvent = new InvoicePaidEventV1({
      eventId: uuidv4(),
      invoiceId: invoice.id,
      payerAccountId: invoiceDomain.payerAccountId,
      payeeAccountId: invoiceDomain.payeeAccountId,
      grandTotal: invoiceDomain.grandTotal,
      currency: invoiceDomain.currency,
      status: InvoiceStatus.PAID,
      paymentIntentId: event.paymentIntentId,
      paidAt,
      correlationId: event.correlationId,
    });

    this.eventBus.publish(paidEvent);

    if (this.eventBusService) {
      this.eventBusService
        .publish(NatsSubjects.Billing.INVOICE_PAID_V1, paidEvent)
        .catch((error) => {
          this.logger.error(`Failed to publish InvoicePaidEvent to NATS: ${error.message}`);
        });
    }

    this.logger.log(`Invoice marked as PAID: ${invoice.id}`);
  }
}
