import { CapabilityGuard } from '@api/core/api/guards';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeliveryStatus, OrderStatus } from '@zanafleet/contracts';
import request from 'supertest';


import { InvoiceEntity } from '../../../billing/entities/invoice.entity';
import { DeliveryEntity } from '../../../delivery/entities/delivery.entity';
import { OrderEntity } from '../../../order/entities/order.entity';
import { BusinessDashboardController } from '../../controllers/business-dashboard.controller';

describe('BusinessDashboardController (e2e)', () => {
  let app: INestApplication;
  let mockOrderRepository: {
    findAndCount: jest.Mock;
  };
  let mockDeliveryRepository: {
    findAndCount: jest.Mock;
  };
  let mockInvoiceRepository: {
    findAndCount: jest.Mock;
    find: jest.Mock;
  };
  let mockCapabilityAccessController: { hasCapability: jest.Mock };

  const createMockOrder = (overrides: Partial<OrderEntity> = {}): Partial<OrderEntity> => ({
    id: overrides.id ?? 'order-123',
    businessId: overrides.businessId ?? 'business-123',
    status: overrides.status ?? OrderStatus.Pending,
    customerName: overrides.customerName ?? 'John Doe',
    customerPhone: overrides.customerPhone ?? '+254700000000',
    itemSummary: overrides.itemSummary ?? 'Test item',
    deliveryId: overrides.deliveryId ?? null,
    scheduledTime: overrides.scheduledTime ?? null,
    createdAt: overrides.createdAt ?? new Date('2024-01-01'),
  });

  const createMockDelivery = (overrides: Partial<DeliveryEntity> = {}): Partial<DeliveryEntity> => ({
    id: overrides.id ?? 'delivery-123',
    businessId: overrides.businessId ?? 'business-123',
    status: overrides.status ?? DeliveryStatus.Delivered,
    assignedRiderId: overrides.assignedRiderId ?? 'rider-123',
    scheduledPickupTime: overrides.scheduledPickupTime ?? null,
    deliveredAt: overrides.deliveredAt ?? new Date('2024-01-15'),
    createdAt: overrides.createdAt ?? new Date('2024-01-01'),
  });

  const createMockInvoice = (overrides: Record<string, unknown> = {}): {
    id: string;
    status: string;
    subtotal: string;
    totalTax: string;
    grandTotal: string;
    currency: string;
    createdAt: Date;
  } => ({
    id: (overrides.id as string) ?? 'invoice-123',
    status: (overrides.status as string) ?? 'ISSUED',
    subtotal: (overrides.subtotal as string) ?? '100.00',
    totalTax: (overrides.totalTax as string) ?? '16.00',
    grandTotal: (overrides.grandTotal as string) ?? '116.00',
    currency: (overrides.currency as string) ?? 'KES',
    createdAt: (overrides.createdAt as Date) ?? new Date('2024-01-01'),
  });

  beforeEach(async () => {
    mockOrderRepository = { findAndCount: jest.fn() };
    mockDeliveryRepository = { findAndCount: jest.fn() };
    mockInvoiceRepository = { findAndCount: jest.fn(), find: jest.fn() };
    mockCapabilityAccessController = { hasCapability: jest.fn().mockResolvedValue(true) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BusinessDashboardController],
      providers: [
        Reflector,
        { provide: getRepositoryToken(OrderEntity), useValue: mockOrderRepository },
        { provide: getRepositoryToken(DeliveryEntity), useValue: mockDeliveryRepository },
        { provide: getRepositoryToken(InvoiceEntity), useValue: mockInvoiceRepository },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability(
            'test-actor',
            'dashboard.business.read'
          );
          if (!result) {
            throw new ForbiddenException('Missing required capability: dashboard.business.read');
          }
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /dashboards/business/:businessId/metrics', () => {
    it('should return 200 with business metrics', async () => {
      const mockOrders = [
        createMockOrder({ status: OrderStatus.Pending }),
        createMockOrder({ id: 'o2', status: OrderStatus.Fulfilled }),
      ];
      const mockDeliveries = [
        createMockDelivery({ status: DeliveryStatus.Delivered }),
        createMockDelivery({ id: 'd2', status: DeliveryStatus.InTransit }),
      ];
      const mockInvoices = [
        createMockInvoice({ status: 'PAID' as any, grandTotal: '100.00' }),
        createMockInvoice({ id: 'i2', status: 'ISSUED' as any, grandTotal: '50.00' }),
      ];

      mockOrderRepository.findAndCount.mockResolvedValue([mockOrders, 2]);
      mockDeliveryRepository.findAndCount.mockResolvedValue([mockDeliveries, 2]);
      mockInvoiceRepository.find.mockResolvedValue(mockInvoices);

      const response = await request(app.getHttpServer())
        .get('/dashboards/business/business-123/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        totalOrders: 2,
        pendingOrders: 1,
        fulfilledOrders: 1,
        totalDeliveries: 2,
        completedDeliveries: 1,
        paidInvoiceAmount: 100,
        pendingInvoiceAmount: 50,
        currency: 'KES',
      });
    });
  });

  describe('GET /dashboards/business/:businessId/orders', () => {
    it('should return 200 with paginated orders', async () => {
      const mockOrders = [createMockOrder({ id: 'o1' }), createMockOrder({ id: 'o2' })];
      mockOrderRepository.findAndCount.mockResolvedValue([mockOrders, 2]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/business/business-123/orders?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        totalItems: 2,
      });
    });
  });

  describe('GET /dashboards/business/:businessId/deliveries', () => {
    it('should return 200 with paginated deliveries', async () => {
      const mockDeliveries = [createMockDelivery({ id: 'd1' }), createMockDelivery({ id: 'd2' })];
      mockDeliveryRepository.findAndCount.mockResolvedValue([mockDeliveries, 2]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/business/business-123/deliveries?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        totalItems: 2,
      });
    });
  });

  describe('GET /dashboards/business/:businessId/invoices', () => {
    it('should return 200 with paginated invoices', async () => {
      const mockInvoices = [createMockInvoice({ id: 'i1' }), createMockInvoice({ id: 'i2' })];
      mockInvoiceRepository.findAndCount.mockResolvedValue([mockInvoices, 2]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/business/business-123/invoices?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        totalItems: 2,
      });
    });
  });

  describe('RBAC', () => {
    it('should return 403 when user lacks dashboard.business.read capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .get('/dashboards/business/business-123/metrics')
        .expect(403);
    });
  });
});
