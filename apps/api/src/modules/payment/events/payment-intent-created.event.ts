import { PaymentIntentStatus, PaymentFlowType, PaymentMethod } from '../dto/payment.enums';

/**
 * PaymentIntentCreatedEventV1
 * Domain event representing the successful creation of a payment intent
 */
export class PaymentIntentCreatedEventV1 {
  readonly eventId: string;
  readonly eventType: 'PaymentIntentCreatedEvent-V1' = 'PaymentIntentCreatedEvent-V1';
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
  readonly status: PaymentIntentStatus;
  readonly paymentMethod: PaymentMethod;
  readonly providerId: string;
  readonly idempotencyKey: string;

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
    status: PaymentIntentStatus;
    paymentMethod: PaymentMethod;
    providerId: string;
    idempotencyKey: string;
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
    this.status = data.status;
    this.paymentMethod = data.paymentMethod;
    this.providerId = data.providerId;
    this.idempotencyKey = data.idempotencyKey;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'PaymentIntentCreatedEvent-V1';
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
    status: PaymentIntentStatus;
    paymentMethod: PaymentMethod;
    providerId: string;
    idempotencyKey: string;
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
      status: this.status,
      paymentMethod: this.paymentMethod,
      providerId: this.providerId,
      idempotencyKey: this.idempotencyKey,
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
    status: PaymentIntentStatus;
    paymentMethod: PaymentMethod;
    providerId: string;
    idempotencyKey: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): PaymentIntentCreatedEventV1 {
    return new PaymentIntentCreatedEventV1({
      eventId: data.eventId,
      paymentIntentId: data.paymentIntentId,
      payerAccountId: data.payerAccountId,
      payeeAccountId: data.payeeAccountId,
      flowType: data.flowType,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      paymentMethod: data.paymentMethod,
      providerId: data.providerId,
      idempotencyKey: data.idempotencyKey,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
