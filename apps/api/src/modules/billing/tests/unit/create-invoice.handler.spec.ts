import { EventBusService } from '@api/core/event-bus';
import { EventBus } from '@nestjs/cqrs';
import { DataSource, EntityManager } from 'typeorm';

import { CreateInvoiceCommand } from '../../commands/create-invoice.command';
import { ChargeType, InvoiceStatus } from '../../dto/billing.enums';
import { ChargeEntity } from '../../entities/charge.entity';
import { InvoiceEntity } from '../../entities/invoice.entity';
import { InvoiceCreatedEventV1 } from '../../events/invoice-created.event';
import { CreateInvoiceCommandHandler } from '../../handlers/create-invoice.handler';
import { BillingCalculatorService } from '../../services/billing-calculator.service';

describe('CreateInvoiceCommandHandler', () => {
  let handler: CreateInvoiceCommandHandler;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockEventBusService: jest.Mocked<EventBusService>;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let billingCalculator: BillingCalculatorService;

  const validCommand = new CreateInvoiceCommand({
    payerAccountId: '550e8400-e29b-41d4-a716-446655440000',
    payeeAccountId: '660e8400-e29b-41d4-a716-446655440001',
    deliveryId: '770e8400-e29b-41d4-a716-446655440002',
    charges: [
      {
        chargeType: ChargeType.BASE_DELIVERY_FEE,
        description: 'Base delivery fee',
        amount: 5.0,
        currency: 'USD',
        quantity: 1,
        unitPrice: 5.0,
      },
      {
        chargeType: ChargeType.DISTANCE_FEE,
        description: 'Distance fee',
        amount: 15.0,
        currency: 'USD',
        quantity: 10,
        unitPrice: 1.5,
      },
      {
        chargeType: ChargeType.TAX,
        description: 'Tax',
        amount: 3.2,
        currency: 'USD',
        quantity: 1,
        unitPrice: 3.2,
      },
    ],
    currency: 'USD',
  });

  beforeEach(() => {
    mockEntityManager = {
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EntityManager>;

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockEntityManager);
      }),
    } as unknown as jest.Mocked<DataSource>;

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    mockEventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventBusService>;

    billingCalculator = new BillingCalculatorService();
  });

  describe('without EventBusService', () => {
    beforeEach(() => {
      handler = new CreateInvoiceCommandHandler(
        mockDataSource,
        billingCalculator,
        mockEventBus,
        undefined,
      );
    });

    it('should save invoice and charges atomically in a transaction', async () => {
      await handler.execute(validCommand);

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);

      const invoiceSaveCall = mockEntityManager.save.mock.calls.find(
        (call) => call[0] === InvoiceEntity,
      );
      expect(invoiceSaveCall).toBeDefined();

      const chargesSaveCall = mockEntityManager.save.mock.calls.find(
        (call) => call[0] === ChargeEntity,
      );
      expect(chargesSaveCall).toBeDefined();
    });

    it('should create invoice with DRAFT status', async () => {
      await handler.execute(validCommand);

      const invoiceSaveCall = mockEntityManager.save.mock.calls.find(
        (call) => call[0] === InvoiceEntity,
      );
      const savedInvoice = invoiceSaveCall?.[1] as InvoiceEntity;

      expect(savedInvoice.status).toBe(InvoiceStatus.DRAFT);
    });

    it('should calculate correct totals', async () => {
      await handler.execute(validCommand);

      const invoiceSaveCall = mockEntityManager.save.mock.calls.find(
        (call) => call[0] === InvoiceEntity,
      );
      const savedInvoice = invoiceSaveCall?.[1] as InvoiceEntity;

      expect(savedInvoice.subtotal).toBe('20.00');
      expect(savedInvoice.totalTax).toBe('3.20');
      expect(savedInvoice.grandTotal).toBe('23.20');
    });

    it('should publish InvoiceCreatedEventV1 to event bus', async () => {
      await handler.execute(validCommand);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as InvoiceCreatedEventV1;
      expect(publishedEvent.eventType).toBe('InvoiceCreatedEvent-V1');
      expect(publishedEvent.status).toBe(InvoiceStatus.DRAFT);
      expect(publishedEvent.charges).toHaveLength(3);
    });

    it('should return the generated invoiceId', async () => {
      const result = await handler.execute(validCommand);

      expect(result).toBeDefined();
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should not publish to NATS when eventBusService is not available', async () => {
      await handler.execute(validCommand);

      expect(mockEventBusService.publish).not.toHaveBeenCalled();
    });
  });

  describe('with EventBusService', () => {
    beforeEach(() => {
      handler = new CreateInvoiceCommandHandler(
        mockDataSource,
        billingCalculator,
        mockEventBus,
        mockEventBusService,
      );
    });

    it('should publish to NATS when eventBusService is available', async () => {
      await handler.execute(validCommand);

      expect(mockEventBusService.publish).toHaveBeenCalledTimes(1);
      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'billing.events.invoice-created-v1',
        expect.any(InvoiceCreatedEventV1),
      );
    });

    it('should handle NATS publish failure gracefully', async () => {
      mockEventBusService.publish.mockRejectedValue(new Error('NATS connection failed'));

      const result = await handler.execute(validCommand);

      expect(result).toBeDefined();
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('with discounts', () => {
    beforeEach(() => {
      handler = new CreateInvoiceCommandHandler(
        mockDataSource,
        billingCalculator,
        mockEventBus,
        undefined,
      );
    });

    it('should handle discount charges correctly', async () => {
      const commandWithDiscount = new CreateInvoiceCommand({
        ...validCommand,
        charges: [
          {
            chargeType: ChargeType.BASE_DELIVERY_FEE,
            amount: 20.0,
            currency: 'USD',
            quantity: 1,
            unitPrice: 20.0,
          },
          {
            chargeType: ChargeType.DISCOUNT,
            description: 'Promo discount',
            amount: -5.0,
            currency: 'USD',
            quantity: 1,
            unitPrice: -5.0,
          },
          {
            chargeType: ChargeType.TAX,
            amount: 3.2,
            currency: 'USD',
            quantity: 1,
            unitPrice: 3.2,
          },
        ],
      });

      await handler.execute(commandWithDiscount);

      const invoiceSaveCall = mockEntityManager.save.mock.calls.find(
        (call) => call[0] === InvoiceEntity,
      );
      const savedInvoice = invoiceSaveCall?.[1] as InvoiceEntity;

      expect(savedInvoice.totalDiscounts).toBe('5.00');
      expect(savedInvoice.grandTotal).toBe('18.20');
    });
  });
});
