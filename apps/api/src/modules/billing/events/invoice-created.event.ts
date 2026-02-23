import { InvoiceStatus, ChargeType } from '../dto/billing.enums';

export interface ChargeData {
  chargeId: string;
  chargeType: ChargeType;
  description: string | null;
  amount: number;
  currency: string;
  quantity: number;
  unitPrice: number;
}

/**
 * InvoiceCreatedEventV1
 * Domain event representing the successful creation of an invoice with charges
 */
export class InvoiceCreatedEventV1 {
  readonly eventId: string;
  readonly eventType = 'InvoiceCreatedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Invoice' as const;

  readonly invoiceId: string;
  readonly payerAccountId: string;
  readonly payeeAccountId: string;
  readonly deliveryId: string | null;
  readonly orderId: string | null;
  readonly status: InvoiceStatus;
  readonly subtotal: number;
  readonly totalDiscounts: number;
  readonly totalTax: number;
  readonly grandTotal: number;
  readonly currency: string;
  readonly charges: ChargeData[];

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    invoiceId: string;
    payerAccountId: string;
    payeeAccountId: string;
    deliveryId?: string | null;
    orderId?: string | null;
    status: InvoiceStatus;
    subtotal: number;
    totalDiscounts: number;
    totalTax: number;
    grandTotal: number;
    currency: string;
    charges: ChargeData[];
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.invoiceId = data.invoiceId;
    this.aggregateId = data.invoiceId;
    this.payerAccountId = data.payerAccountId;
    this.payeeAccountId = data.payeeAccountId;
    this.deliveryId = data.deliveryId ?? null;
    this.orderId = data.orderId ?? null;
    this.status = data.status;
    this.subtotal = data.subtotal;
    this.totalDiscounts = data.totalDiscounts;
    this.totalTax = data.totalTax;
    this.grandTotal = data.grandTotal;
    this.currency = data.currency;
    this.charges = data.charges;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'InvoiceCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Invoice';
    invoiceId: string;
    payerAccountId: string;
    payeeAccountId: string;
    deliveryId: string | null;
    orderId: string | null;
    status: InvoiceStatus;
    subtotal: number;
    totalDiscounts: number;
    totalTax: number;
    grandTotal: number;
    currency: string;
    charges: ChargeData[];
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
      deliveryId: this.deliveryId,
      orderId: this.orderId,
      status: this.status,
      subtotal: this.subtotal,
      totalDiscounts: this.totalDiscounts,
      totalTax: this.totalTax,
      grandTotal: this.grandTotal,
      currency: this.currency,
      charges: this.charges,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    invoiceId: string;
    payerAccountId: string;
    payeeAccountId: string;
    deliveryId?: string | null;
    orderId?: string | null;
    status: InvoiceStatus;
    subtotal: number;
    totalDiscounts: number;
    totalTax: number;
    grandTotal: number;
    currency: string;
    charges: ChargeData[];
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): InvoiceCreatedEventV1 {
    return new InvoiceCreatedEventV1({
      eventId: data.eventId,
      invoiceId: data.invoiceId,
      payerAccountId: data.payerAccountId,
      payeeAccountId: data.payeeAccountId,
      deliveryId: data.deliveryId,
      orderId: data.orderId,
      status: data.status,
      subtotal: data.subtotal,
      totalDiscounts: data.totalDiscounts,
      totalTax: data.totalTax,
      grandTotal: data.grandTotal,
      currency: data.currency,
      charges: data.charges,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
