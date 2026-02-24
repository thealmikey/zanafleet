import { EventBusService } from '@api/core/event-bus';
import { PaymentCompletedEventV1, PaymentFlowType } from '@api/modules/payment';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { InvoiceStatus } from '../../dto/billing.enums';
import { InvoiceEntity } from '../../entities/invoice.entity';
import { InvoicePaidEventV1 } from '../../events/invoice-paid.event';
import { PaymentCompletedListener } from '../../listeners/payment-completed.listener';

describe('PaymentCompletedListener', () => {
  let listener: PaymentCompletedListener;
  let mockInvoiceRepo: jest.Mocked<Repository<InvoiceEntity>>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockEventBusService: jest.Mocked<EventBusService>;

  const createPaymentCompletedEvent = (
    paymentIntentId: string,
    invoiceId?: string | null
  ): PaymentCompletedEventV1 => {
    return new PaymentCompletedEventV1({
      eventId: '110e8400-e29b-41d4-a716-446655440010',
      paymentIntentId,
      payerAccountId: '660e8400-e29b-41d4-a716-446655440001',
      payeeAccountId: '770e8400-e29b-41d4-a716-446655440002',
      flowType: PaymentFlowType.C2B,
      amount: 104.4,
      currency: 'USD',
      providerId: 'stripe',
      providerTransactionId: 'pi_provider_123',
      transactionId: 'tx-123',
      invoiceId: invoiceId ?? null,
      correlationId: 'corr-123',
    });
  };

  const existingInvoice = (): InvoiceEntity => {
    const entity = new InvoiceEntity();
    entity.id = '550e8400-e29b-41d4-a716-446655440000';
    entity.payerAccountId = '660e8400-e29b-41d4-a716-446655440001';
    entity.payeeAccountId = '770e8400-e29b-41d4-a716-446655440002';
    entity.status = InvoiceStatus.ISSUED;
    entity.subtotal = '100.00';
    entity.totalDiscounts = '10.00';
    entity.totalTax = '14.40';
    entity.grandTotal = '104.40';
    entity.currency = 'USD';
    entity.dueDate = null;
    entity.paidAt = null;
    entity.metadata = null;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    return entity;
  };

  beforeEach(() => {
    mockInvoiceRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Repository<InvoiceEntity>>;

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    mockEventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBusService>;

    listener = new PaymentCompletedListener(mockInvoiceRepo, mockEventBus, mockEventBusService);
  });

  describe('handle', () => {
    it('should mark invoice as PAID when payment completes', async () => {
      const invoiceId = '550e8400-e29b-41d4-a716-446655440000';
      const paymentIntentId = '880e8400-e29b-41d4-a716-446655440003';

      mockInvoiceRepo.findOne.mockResolvedValue(existingInvoice());

      await listener.handle(createPaymentCompletedEvent(paymentIntentId, invoiceId));

      expect(mockInvoiceRepo.update).toHaveBeenCalledWith(invoiceId, {
        status: InvoiceStatus.PAID,
        paidAt: expect.any(Date),
      });
    });

    it('should publish InvoicePaidEventV1', async () => {
      const invoiceId = '550e8400-e29b-41d4-a716-446655440000';
      const paymentIntentId = '880e8400-e29b-41d4-a716-446655440003';

      mockInvoiceRepo.findOne.mockResolvedValue(existingInvoice());

      await listener.handle(createPaymentCompletedEvent(paymentIntentId, invoiceId));

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as InvoicePaidEventV1;
      expect(publishedEvent.eventType).toBe('InvoicePaidEvent-V1');
      expect(publishedEvent.invoiceId).toBe(invoiceId);
      expect(publishedEvent.status).toBe(InvoiceStatus.PAID);
    });

    it('should skip when event has no associated invoice', async () => {
      const paymentIntentId = '880e8400-e29b-41d4-a716-446655440003';

      await listener.handle(createPaymentCompletedEvent(paymentIntentId, null));

      expect(mockInvoiceRepo.findOne).not.toHaveBeenCalled();
      expect(mockInvoiceRepo.update).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should skip when invoice is already PAID', async () => {
      const invoiceId = '550e8400-e29b-41d4-a716-446655440000';
      const paymentIntentId = '880e8400-e29b-41d4-a716-446655440003';

      const paidInvoice = existingInvoice();
      paidInvoice.status = InvoiceStatus.PAID;
      mockInvoiceRepo.findOne.mockResolvedValue(paidInvoice);

      await listener.handle(createPaymentCompletedEvent(paymentIntentId, invoiceId));

      expect(mockInvoiceRepo.update).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should publish to NATS when eventBusService is available', async () => {
      const invoiceId = '550e8400-e29b-41d4-a716-446655440000';
      const paymentIntentId = '880e8400-e29b-41d4-a716-446655440003';

      mockInvoiceRepo.findOne.mockResolvedValue(existingInvoice());

      await listener.handle(createPaymentCompletedEvent(paymentIntentId, invoiceId));

      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'billing.events.invoice-paid-v1',
        expect.any(InvoicePaidEventV1)
      );
    });
  });
});
