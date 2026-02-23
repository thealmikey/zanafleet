import { InvoiceStatus } from '../dto/billing.enums';

/**
 * InvoicePaidEventV1
 * Domain event representing an invoice being fully paid
 */
export class InvoicePaidEventV1 {
  readonly eventId: string;
  readonly eventType = 'InvoicePaidEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Invoice' as const;

  readonly invoiceId: string;
  readonly payerAccountId: string;
  readonly payeeAccountId: string;
  readonly grandTotal: number;
  readonly currency: string;
  readonly status: InvoiceStatus;
  readonly paymentIntentId: string;
  readonly paidAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    invoiceId: string;
    payerAccountId: string;
    payeeAccountId: string;
    grandTotal: number;
    currency: string;
    status: InvoiceStatus;
    paymentIntentId: string;
    paidAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.invoiceId = data.invoiceId;
    this.aggregateId = data.invoiceId;
    this.payerAccountId = data.payerAccountId;
    this.payeeAccountId = data.payeeAccountId;
    this.grandTotal = data.grandTotal;
    this.currency = data.currency;
    this.status = data.status;
    this.paymentIntentId = data.paymentIntentId;
    this.paidAt = data.paidAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'InvoicePaidEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Invoice';
    invoiceId: string;
    payerAccountId: string;
    payeeAccountId: string;
    grandTotal: number;
    currency: string;
    status: InvoiceStatus;
    paymentIntentId: string;
    paidAt: string;
    correlationId?: string;
    causationId?: string;
  } {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      invoiceId: this.invoiceId,
      payerAccountId: this.payerAccountId,
      payeeAccountId: this.payeeAccountId,
      grandTotal: this.grandTotal,
      currency: this.currency,
      status: this.status,
      paymentIntentId: this.paymentIntentId,
      paidAt: this.paidAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    invoiceId: string;
    payerAccountId: string;
    payeeAccountId: string;
    grandTotal: number;
    currency: string;
    status: InvoiceStatus;
    paymentIntentId: string;
    paidAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): InvoicePaidEventV1 {
    return new InvoicePaidEventV1({
      eventId: data.eventId,
      invoiceId: data.invoiceId,
      payerAccountId: data.payerAccountId,
      payeeAccountId: data.payeeAccountId,
      grandTotal: data.grandTotal,
      currency: data.currency,
      status: data.status,
      paymentIntentId: data.paymentIntentId,
      paidAt: new Date(data.paidAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
