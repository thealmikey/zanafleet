import { EventBusService } from '@api/core/event-bus';
import { PaymentMethod, CreatePaymentIntentCommand } from '@api/modules/payment';
import { NotFoundException } from '@nestjs/common';
import { EventBus, CommandBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { IssueInvoiceCommand } from '../../commands/issue-invoice.command';
import { InvoiceStatus } from '../../dto/billing.enums';
import { InvoiceEntity } from '../../entities/invoice.entity';
import { InvoiceIssuedEventV1 } from '../../events/invoice-issued.event';
import { IssueInvoiceCommandHandler } from '../../handlers/issue-invoice.handler';

describe('IssueInvoiceCommandHandler', () => {
  let handler: IssueInvoiceCommandHandler;
  let mockInvoiceRepo: jest.Mocked<Repository<InvoiceEntity>>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockCommandBus: jest.Mocked<CommandBus>;
  let mockEventBusService: jest.Mocked<EventBusService>;

  const existingInvoice = (): InvoiceEntity => {
    const entity = new InvoiceEntity();
    entity.id = '550e8400-e29b-41d4-a716-446655440000';
    entity.payerAccountId = '660e8400-e29b-41d4-a716-446655440001';
    entity.payeeAccountId = '770e8400-e29b-41d4-a716-446655440002';
    entity.deliveryId = '880e8400-e29b-41d4-a716-446655440003';
    entity.orderId = null;
    entity.status = InvoiceStatus.DRAFT;
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

  const validCommand = new IssueInvoiceCommand({
    invoiceId: '550e8400-e29b-41d4-a716-446655440000',
    paymentMethod: PaymentMethod.CARD,
    providerId: 'stripe',
    correlationId: '990e8400-e29b-41d4-a716-446655440004',
  });

  beforeEach(() => {
    mockInvoiceRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Repository<InvoiceEntity>>;

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    mockCommandBus = {
      execute: jest.fn().mockResolvedValue({
        paymentIntentId: 'pi-123456',
        isNew: true,
      }),
    } as unknown as jest.Mocked<CommandBus>;

    mockEventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBusService>;
  });

  describe('successful issuance', () => {
    beforeEach(() => {
      handler = new IssueInvoiceCommandHandler(
        mockInvoiceRepo,
        mockEventBus,
        mockCommandBus,
        mockEventBusService
      );

      mockInvoiceRepo.findOne.mockResolvedValue(existingInvoice());
    });

    it('should create PaymentIntent with correct amount', async () => {
      await handler.execute(validCommand);

      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      const commandArg = mockCommandBus.execute.mock.calls[0][0] as CreatePaymentIntentCommand;
      expect(commandArg.amount).toBe(104.4);
      expect(commandArg.currency).toBe('USD');
      expect(commandArg.paymentMethod).toBe(PaymentMethod.CARD);
      expect(commandArg.providerId).toBe('stripe');
      expect(commandArg.invoiceId).toBe(validCommand.invoiceId);
    });

    it('should update invoice status to ISSUED', async () => {
      await handler.execute(validCommand);

      expect(mockInvoiceRepo.update).toHaveBeenCalledWith(validCommand.invoiceId, {
        status: InvoiceStatus.ISSUED,
      });
    });

    it('should publish InvoiceIssuedEventV1', async () => {
      await handler.execute(validCommand);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as InvoiceIssuedEventV1;
      expect(publishedEvent.eventType).toBe('InvoiceIssuedEvent-V1');
      expect(publishedEvent.invoiceId).toBe(validCommand.invoiceId);
      expect(publishedEvent.status).toBe(InvoiceStatus.ISSUED);
      expect(publishedEvent.paymentIntentId).toBe('pi-123456');
    });

    it('should return invoiceId and paymentIntentId', async () => {
      const result = await handler.execute(validCommand);

      expect(result.invoiceId).toBe(validCommand.invoiceId);
      expect(result.paymentIntentId).toBe('pi-123456');
    });

    it('should publish to NATS', async () => {
      await handler.execute(validCommand);

      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'billing.events.invoice-issued-v1',
        expect.any(InvoiceIssuedEventV1)
      );
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      handler = new IssueInvoiceCommandHandler(
        mockInvoiceRepo,
        mockEventBus,
        mockCommandBus,
        undefined
      );
    });

    it('should throw NotFoundException when invoice does not exist', async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(null);

      await expect(handler.execute(validCommand)).rejects.toThrow(NotFoundException);
    });

    it('should throw error when invoice is not in DRAFT status', async () => {
      const issuedInvoice = existingInvoice();
      issuedInvoice.status = InvoiceStatus.ISSUED;
      mockInvoiceRepo.findOne.mockResolvedValue(issuedInvoice);

      await expect(handler.execute(validCommand)).rejects.toThrow('Invoice is not in DRAFT status');
    });

    it('should throw error when invoice is already PAID', async () => {
      const paidInvoice = existingInvoice();
      paidInvoice.status = InvoiceStatus.PAID;
      mockInvoiceRepo.findOne.mockResolvedValue(paidInvoice);

      await expect(handler.execute(validCommand)).rejects.toThrow('Invoice is not in DRAFT status');
    });
  });

  describe('idempotency key', () => {
    beforeEach(() => {
      handler = new IssueInvoiceCommandHandler(
        mockInvoiceRepo,
        mockEventBus,
        mockCommandBus,
        undefined
      );

      mockInvoiceRepo.findOne.mockResolvedValue(existingInvoice());
    });

    it('should use invoice ID as idempotency key prefix', async () => {
      await handler.execute(validCommand);

      const commandArg = mockCommandBus.execute.mock.calls[0][0] as CreatePaymentIntentCommand;
      expect(commandArg.idempotencyKey).toBe(`invoice-${validCommand.invoiceId}`);
    });
  });
});
