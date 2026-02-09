import { PaymentFlowType } from '../dto/payment.enums';

/**
 * PaymentCompletedEventV1
 * Domain event representing successful payment completion with ledger entries
 */
export class PaymentCompletedEventV1 {
  readonly eventId: string;
  readonly eventType: 'PaymentCompletedEvent-V1' = 'PaymentCompletedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'PaymentIntent' = 'PaymentIntent';

  readonly paymentIntentId: string;
  readonly payerAccountId: string;
  readonly payeeAccountId: string;
  readonly flowType: PaymentFlowType;
  readonly amount: number;
  readonly currency: string;
  readonly providerId: string;
  readonly providerTransactionId: string;
  readonly transactionId: string;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    paymentIntentId: string;
    payerAccountId: string;
    payeeAccountId: string;
    flowType: PaymentFlowType;
    amount: number;
    currency: string;
    providerId: string;
    providerTransactionId: string;
    transactionId: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.paymentIntentId = data.paymentIntentId;
    this.aggregateId = data.paymentIntentId;
    this.payerAccountId = data.payerAccountId;
    this.payeeAccountId = data.payeeAccountId;
    this.flowType = data.flowType;
    this.amount = data.amount;
    this.currency = data.currency;
    this.providerId = data.providerId;
    this.providerTransactionId = data.providerTransactionId;
    this.transactionId = data.transactionId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'PaymentCompletedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'PaymentIntent';
    paymentIntentId: string;
    payerAccountId: string;
    payeeAccountId: string;
    flowType: PaymentFlowType;
    amount: number;
    currency: string;
    providerId: string;
    providerTransactionId: string;
    transactionId: string;
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
      paymentIntentId: this.paymentIntentId,
      payerAccountId: this.payerAccountId,
      payeeAccountId: this.payeeAccountId,
      flowType: this.flowType,
      amount: this.amount,
      currency: this.currency,
      providerId: this.providerId,
      providerTransactionId: this.providerTransactionId,
      transactionId: this.transactionId,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    paymentIntentId: string;
    payerAccountId: string;
    payeeAccountId: string;
    flowType: PaymentFlowType;
    amount: number;
    currency: string;
    providerId: string;
    providerTransactionId: string;
    transactionId: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): PaymentCompletedEventV1 {
    return new PaymentCompletedEventV1({
      eventId: data.eventId,
      paymentIntentId: data.paymentIntentId,
      payerAccountId: data.payerAccountId,
      payeeAccountId: data.payeeAccountId,
      flowType: data.flowType,
      amount: data.amount,
      currency: data.currency,
      providerId: data.providerId,
      providerTransactionId: data.providerTransactionId,
      transactionId: data.transactionId,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
