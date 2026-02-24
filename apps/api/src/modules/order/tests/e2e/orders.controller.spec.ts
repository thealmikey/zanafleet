import { CapabilityGuard } from '@api/core/api/guards';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderStatus } from '@zanafleet/contracts';
import request from 'supertest';

import { OrdersController } from '../../controllers/orders.controller';
import { CustomerOrderOrchestrator } from '../../coordinators/customer-order.orchestrator';
import { OrderEntity } from '../../entities/order.entity';

describe('OrdersController (e2e)', () => {
  let app: INestApplication;
  let mockCommandBus: { execute: jest.Mock };
  let mockRepository: {
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockCapabilityAccessController: { hasCapability: jest.Mock };
  let mockCustomerOrderOrchestrator: { placeCustomerOrder: jest.Mock };

  const createMockOrderEntity = (overrides: Partial<OrderEntity> = {}): OrderEntity => {
    const entity = new OrderEntity();
    entity.id = overrides.id ?? 'order-123';
    entity.businessId = overrides.businessId ?? 'business-123';
    entity.deliveryId = overrides.deliveryId ?? null;
    entity.status = overrides.status ?? OrderStatus.Pending;
    entity.customerName = overrides.customerName ?? null;
    entity.customerPhone = overrides.customerPhone ?? null;
    entity.itemSummary = overrides.itemSummary ?? null;
    entity.itemMetadata = overrides.itemMetadata ?? null;
    entity.scheduledTime = overrides.scheduledTime ?? null;
    entity.createdAt = overrides.createdAt ?? new Date('2024-01-01');
    entity.updatedAt = overrides.updatedAt ?? new Date('2024-01-01');
    return entity;
  };

  beforeEach(async () => {
    mockCommandBus = { execute: jest.fn() };
    mockRepository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockCapabilityAccessController = { hasCapability: jest.fn().mockResolvedValue(true) };
    mockCustomerOrderOrchestrator = { placeCustomerOrder: jest.fn() };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        Reflector,
        { provide: getRepositoryToken(OrderEntity), useValue: mockRepository },
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: CustomerOrderOrchestrator, useValue: mockCustomerOrderOrchestrator },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability(
            'test-actor',
            'order.manage'
          );
          if (!result) {
            throw new ForbiddenException('Missing required capability: order.manage');
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

  describe('POST /orders', () => {
    it('should return 201 and id when creating an order', async () => {
      mockCommandBus.execute.mockResolvedValue('new-order-id');

      const response = await request(app.getHttpServer())
        .post('/orders')
        .send({
          businessId: '00000000-0000-0000-0000-000000000001',
          itemSummary: 'Test item',
          customerName: 'John Doe',
          customerPhone: '+254700000000',
        })
        .expect(201);

      expect(response.body).toEqual({ id: 'new-order-id' });
      expect(mockCommandBus.execute).toHaveBeenCalled();
    });
  });

  describe('GET /orders/:id', () => {
    it('should return 200 with domain payload when order exists', async () => {
      const mockEntity = createMockOrderEntity();
      mockRepository.findOne.mockResolvedValue(mockEntity);

      const response = await request(app.getHttpServer()).get('/orders/order-123').expect(200);

      expect(response.body).toMatchObject({
        orderId: 'order-123',
        businessId: 'business-123',
        status: OrderStatus.Pending,
      });
    });

    it('should return 404 when order not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/orders/non-existent').expect(404);
    });
  });

  describe('GET /orders', () => {
    it('should return 200 with data and meta respecting pagination', async () => {
      const mockEntities = [
        createMockOrderEntity({ id: 'order-1' }),
        createMockOrderEntity({ id: 'order-2' }),
      ];
      mockRepository.findAndCount.mockResolvedValue([mockEntities, 2]);

      const response = await request(app.getHttpServer())
        .get('/orders?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        totalItems: 2,
      });
    });
  });

  describe('PATCH /orders/:id', () => {
    it('should return 200 with updated domain payload', async () => {
      const mockEntity = createMockOrderEntity();
      const updatedEntity = createMockOrderEntity({ itemSummary: 'Updated item' });
      mockRepository.findOne.mockResolvedValueOnce(mockEntity).mockResolvedValueOnce(updatedEntity);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const response = await request(app.getHttpServer())
        .patch('/orders/order-123')
        .send({ itemSummary: 'Updated item' })
        .expect(200);

      expect(response.body).toMatchObject({
        orderId: 'order-123',
        itemSummary: 'Updated item',
      });
    });

    it('should return 404 when order not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/orders/non-existent')
        .send({ itemSummary: 'Updated item' })
        .expect(404);
    });
  });

  describe('DELETE /orders/:id', () => {
    it('should return 200 with deleted: true', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      const response = await request(app.getHttpServer()).delete('/orders/order-123').expect(200);

      expect(response.body).toEqual({ deleted: true });
    });

    it('should return 404 when order not found', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      await request(app.getHttpServer()).delete('/orders/non-existent').expect(404);
    });
  });

  describe('RBAC', () => {
    it('should return 403 when user lacks capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/orders')
        .send({
          businessId: 'business-123',
        })
        .expect(403);
    });
  });
});
