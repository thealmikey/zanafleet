import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommandBus } from '@nestjs/cqrs';
import request from 'supertest';
import { DeliveryStatus, PolicyEffect } from '@zanafleet/contracts';

import { CapabilityGuard } from '@api/core/api/guards';
import { PolicyEvaluationEngineService } from '@api/modules/policy/services/policy-evaluation-engine.service';
import { DeliveriesController } from '../../controllers/deliveries.controller';
import { DeliveryEntity } from '../../entities/delivery.entity';
import { DeliveryLifecycleCoordinator } from '../../coordinators/delivery-lifecycle.coordinator';
import { DeliveryMatchingCoordinator } from '../../coordinators/delivery-matching.coordinator';
import { DeliveryExecutionCoordinator } from '../../coordinators/delivery-execution.coordinator';

describe('DeliveriesController (e2e)', () => {
  let app: INestApplication;
  let mockCommandBus: { execute: jest.Mock };
  let mockRepository: {
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockLifecycleCoordinator: {
    createDelivery: jest.Mock;
    transitionState: jest.Mock;
  };
  let mockMatchingCoordinator: {
    findAndAssignRider: jest.Mock;
  };
  let mockExecutionCoordinator: {
    confirmPickup: jest.Mock;
    confirmDropoff: jest.Mock;
  };
  let mockCapabilityAccessController: { hasCapability: jest.Mock };
  let mockPolicyEngine: { evaluate: jest.Mock };

  const createMockDeliveryEntity = (overrides: Partial<DeliveryEntity> = {}): DeliveryEntity => {
    const entity = new DeliveryEntity();
    entity.id = overrides.id ?? 'delivery-123';
    entity.businessId = overrides.businessId ?? 'business-123';
    entity.pickupLocationId = overrides.pickupLocationId ?? null;
    entity.dropoffLocationId = overrides.dropoffLocationId ?? null;
    entity.assignedRiderId = overrides.assignedRiderId ?? null;
    entity.status = overrides.status ?? DeliveryStatus.Requested;
    entity.scheduledPickupTime = overrides.scheduledPickupTime ?? null;
    entity.scheduledDropoffTime = overrides.scheduledDropoffTime ?? null;
    entity.isScheduled = overrides.isScheduled ?? false;
    entity.assignedAt = overrides.assignedAt ?? null;
    entity.assignmentNotifiedAt = overrides.assignmentNotifiedAt ?? null;
    entity.pickedUpAt = overrides.pickedUpAt ?? null;
    entity.deliveredAt = overrides.deliveredAt ?? null;
    entity.cancelledAt = overrides.cancelledAt ?? null;
    entity.firstAttemptAt = overrides.firstAttemptAt ?? null;
    entity.lastAttemptAt = overrides.lastAttemptAt ?? null;
    entity.attemptCount = overrides.attemptCount ?? 0;
    entity.slaPickupBy = overrides.slaPickupBy ?? null;
    entity.slaDropoffBy = overrides.slaDropoffBy ?? null;
    entity.slaBreachedAt = overrides.slaBreachedAt ?? null;
    entity.visibilityToken = overrides.visibilityToken ?? null;
    entity.trackingCode = overrides.trackingCode ?? null;
    entity.trackingUrl = overrides.trackingUrl ?? null;
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
    mockLifecycleCoordinator = {
      createDelivery: jest.fn(),
      transitionState: jest.fn(),
    };
    mockMatchingCoordinator = {
      findAndAssignRider: jest.fn(),
    };
    mockExecutionCoordinator = {
      confirmPickup: jest.fn(),
      confirmDropoff: jest.fn(),
    };
    mockCapabilityAccessController = { hasCapability: jest.fn().mockResolvedValue(true) };
    mockPolicyEngine = {
      evaluate: jest.fn().mockResolvedValue({
        finalDecision: {
          effect: PolicyEffect.ALLOW,
          policyId: 'test-policy',
          policyName: 'Test Policy',
          reason: 'Allowed by test',
        },
        evaluatedPolicies: [],
        processingTimeMs: 1,
        evaluationFailed: false,
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DeliveriesController],
      providers: [
        Reflector,
        { provide: getRepositoryToken(DeliveryEntity), useValue: mockRepository },
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: DeliveryLifecycleCoordinator, useValue: mockLifecycleCoordinator },
        { provide: DeliveryMatchingCoordinator, useValue: mockMatchingCoordinator },
        { provide: DeliveryExecutionCoordinator, useValue: mockExecutionCoordinator },
        { provide: PolicyEvaluationEngineService, useValue: mockPolicyEngine },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability(
            'test-actor',
            'delivery.manage'
          );
          if (!result) {
            throw new ForbiddenException('Missing required capability: delivery.manage');
          }
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use((req: any, _res: any, next: () => void) => {
      req.user = { actorId: 'actor-123', workspaceId: 'workspace-456' };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /deliveries', () => {
    it('should return 201 and call lifecycleCoordinator.createDelivery', async () => {
      mockLifecycleCoordinator.createDelivery.mockResolvedValue({
        deliveryId: 'new-delivery-id',
        estimatedCharges: 150.5,
      });

      const response = await request(app.getHttpServer())
        .post('/deliveries')
        .send({
          businessId: 'business-123',
          workspaceId: 'workspace-123',
          actorId: 'actor-123',
        })
        .expect(201);

      expect(response.body).toEqual({ id: 'new-delivery-id', estimatedCharges: 150.5 });
      expect(mockLifecycleCoordinator.createDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'business-123',
          workspaceId: 'workspace-123',
          actorId: 'actor-123',
        })
      );
    });
  });

  describe('GET /deliveries', () => {
    it('should return 200 with data and meta respecting pagination', async () => {
      const mockEntities = [
        createMockDeliveryEntity({ id: 'delivery-1' }),
        createMockDeliveryEntity({ id: 'delivery-2' }),
      ];
      mockRepository.findAndCount.mockResolvedValue([mockEntities, 2]);

      const response = await request(app.getHttpServer())
        .get('/deliveries?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        totalItems: 2,
      });
    });
  });

  describe('GET /deliveries/:id', () => {
    it('should return 200 with domain payload when delivery exists', async () => {
      const mockEntity = createMockDeliveryEntity();
      mockRepository.findOne.mockResolvedValue(mockEntity);

      const response = await request(app.getHttpServer())
        .get('/deliveries/delivery-123')
        .expect(200);

      expect(response.body).toMatchObject({
        deliveryId: 'delivery-123',
        businessId: 'business-123',
        status: DeliveryStatus.Requested,
      });
    });

    it('should return 404 when delivery not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/deliveries/non-existent').expect(404);
    });
  });

  describe('POST /deliveries/:id/assign', () => {
    it('should return 200 and call matchingCoordinator.findAndAssignRider', async () => {
      mockMatchingCoordinator.findAndAssignRider.mockResolvedValue({
        success: true,
        deliveryId: 'delivery-123',
        assignedRiderId: 'rider-456',
      });

      const response = await request(app.getHttpServer())
        .post('/deliveries/delivery-123/assign')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        deliveryId: 'delivery-123',
        assignedRiderId: 'rider-456',
      });
      expect(mockMatchingCoordinator.findAndAssignRider).toHaveBeenCalledWith('delivery-123');
    });
  });

  describe('POST /deliveries/:id/pickup', () => {
    it('should return 200 and call executionCoordinator.confirmPickup', async () => {
      mockExecutionCoordinator.confirmPickup.mockResolvedValue({
        success: true,
        deliveryId: 'delivery-123',
      });

      const response = await request(app.getHttpServer())
        .post('/deliveries/delivery-123/pickup')
        .send({ riderId: 'rider-456' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        deliveryId: 'delivery-123',
      });
      expect(mockExecutionCoordinator.confirmPickup).toHaveBeenCalledWith(
        'delivery-123',
        'rider-456',
        undefined
      );
    });
  });

  describe('POST /deliveries/:id/dropoff', () => {
    it('should return 200 and call executionCoordinator.confirmDropoff', async () => {
      mockExecutionCoordinator.confirmDropoff.mockResolvedValue({
        success: true,
        deliveryId: 'delivery-123',
      });

      const response = await request(app.getHttpServer())
        .post('/deliveries/delivery-123/dropoff')
        .send({ riderId: 'rider-456' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        deliveryId: 'delivery-123',
      });
      expect(mockExecutionCoordinator.confirmDropoff).toHaveBeenCalledWith(
        'delivery-123',
        'rider-456',
        undefined
      );
    });
  });

  describe('POST /deliveries/:id/transition', () => {
    it('should return 200 and call lifecycleCoordinator.transitionState', async () => {
      mockLifecycleCoordinator.transitionState.mockResolvedValue({
        success: true,
        deliveryId: 'delivery-123',
        previousState: DeliveryStatus.Requested,
        newState: DeliveryStatus.Assigned,
      });

      const response = await request(app.getHttpServer())
        .post('/deliveries/delivery-123/transition')
        .send({ targetState: DeliveryStatus.Assigned, triggeredBy: 'system' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        deliveryId: 'delivery-123',
        newState: DeliveryStatus.Assigned,
      });
      expect(mockLifecycleCoordinator.transitionState).toHaveBeenCalledWith(
        'delivery-123',
        DeliveryStatus.Assigned,
        'system'
      );
    });

    it('should return 403 when PolicyGuard denies', async () => {
      mockPolicyEngine.evaluate.mockResolvedValueOnce({
        finalDecision: {
          effect: PolicyEffect.BLOCK,
          policyId: 'test-policy',
          policyName: 'Test Policy',
          reason: 'Blocked by policy',
        },
        evaluatedPolicies: [],
        processingTimeMs: 1,
        evaluationFailed: false,
      });

      await request(app.getHttpServer())
        .post('/deliveries/delivery-123/transition')
        .send({ targetState: DeliveryStatus.Assigned })
        .expect(403);
    });
  });

  describe('RBAC', () => {
    it('should return 403 when user lacks capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/deliveries')
        .send({
          businessId: 'business-123',
          workspaceId: 'workspace-123',
          actorId: 'actor-123',
        })
        .expect(403);
    });
  });
});
