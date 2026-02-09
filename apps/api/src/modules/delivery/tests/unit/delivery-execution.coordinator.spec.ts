import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeliveryStatus } from '@zanafleet/contracts';
import { Repository } from 'typeorm';

import { EventBusService } from '@api/core/event-bus';
import { LocationIntelligenceService } from '../../../location-intelligence/services/location-intelligence.service';
import { PolicyEvaluationEngineService } from '../../../policy/services/policy-evaluation-engine.service';
import {
  DeliveryExecutionCoordinator,
  DeliveryNotFoundError,
  InvalidStatusError,
} from '../../coordinators/delivery-execution.coordinator';
import { DeliveryLifecycleCoordinator } from '../../coordinators/delivery-lifecycle.coordinator';
import { DeliveryEntity } from '../../entities/delivery.entity';

describe('DeliveryExecutionCoordinator', () => {
  let coordinator: DeliveryExecutionCoordinator;
  let deliveryRepository: jest.Mocked<Repository<DeliveryEntity>>;
  let lifecycleCoordinator: jest.Mocked<DeliveryLifecycleCoordinator>;
  let locationIntelligenceService: jest.Mocked<LocationIntelligenceService>;
  let eventBus: jest.Mocked<EventBusService>;

  const mockDeliveryId = 'delivery-123';
  const mockRiderId = 'rider-456';
  const mockBusinessId = 'business-789';

  const createMockDelivery = (overrides: Partial<DeliveryEntity> = {}): DeliveryEntity => {
    const delivery = new DeliveryEntity();
    delivery.id = mockDeliveryId;
    delivery.businessId = mockBusinessId;
    delivery.assignedRiderId = mockRiderId;
    delivery.status = DeliveryStatus.Assigned;
    delivery.pickupLocationId = null;
    delivery.dropoffLocationId = null;
    delivery.scheduledPickupTime = null;
    delivery.scheduledDropoffTime = null;
    delivery.isScheduled = false;
    delivery.assignedAt = new Date();
    delivery.assignmentNotifiedAt = null;
    delivery.pickedUpAt = null;
    delivery.deliveredAt = null;
    delivery.cancelledAt = null;
    delivery.firstAttemptAt = null;
    delivery.lastAttemptAt = null;
    delivery.attemptCount = 0;
    delivery.slaPickupBy = null;
    delivery.slaDropoffBy = null;
    delivery.slaBreachedAt = null;
    delivery.visibilityToken = null;
    delivery.trackingCode = null;
    delivery.trackingUrl = null;
    delivery.createdAt = new Date();
    delivery.updatedAt = new Date();
    Object.assign(delivery, overrides);
    return delivery;
  };

  beforeEach(async () => {
    const mockDeliveryRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockLifecycleCoordinator = {
      transitionState: jest.fn().mockResolvedValue({
        success: true,
        deliveryId: mockDeliveryId,
        previousState: DeliveryStatus.Assigned,
        newState: DeliveryStatus.PickedUp,
      }),
    };

    const mockLocationIntelligenceService = {
      getRiderPath: jest.fn().mockResolvedValue([]),
    };

    const mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const mockPolicyEngine = {
      evaluate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryExecutionCoordinator,
        {
          provide: getRepositoryToken(DeliveryEntity),
          useValue: mockDeliveryRepository,
        },
        {
          provide: DeliveryLifecycleCoordinator,
          useValue: mockLifecycleCoordinator,
        },
        {
          provide: LocationIntelligenceService,
          useValue: mockLocationIntelligenceService,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
        {
          provide: PolicyEvaluationEngineService,
          useValue: mockPolicyEngine,
        },
      ],
    }).compile();

    coordinator = module.get<DeliveryExecutionCoordinator>(DeliveryExecutionCoordinator);
    deliveryRepository = module.get(getRepositoryToken(DeliveryEntity));
    lifecycleCoordinator = module.get(DeliveryLifecycleCoordinator);
    locationIntelligenceService = module.get(LocationIntelligenceService);
    eventBus = module.get(EventBusService);
  });

  describe('confirmPickup', () => {
    it('should successfully confirm pickup for valid delivery and rider', async () => {
      const mockDelivery = createMockDelivery({ status: DeliveryStatus.Assigned });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const result = await coordinator.confirmPickup(mockDeliveryId, mockRiderId, {
        photoUrl: 'http://example.com/photo.jpg',
        notes: 'Package received',
      });

      expect(result.success).toBe(true);
      expect(result.deliveryId).toBe(mockDeliveryId);
      expect(result.error).toBeUndefined();

      expect(lifecycleCoordinator.transitionState).toHaveBeenCalledWith(
        mockDeliveryId,
        DeliveryStatus.PickedUp,
        mockRiderId,
      );
      expect(lifecycleCoordinator.transitionState).toHaveBeenCalledWith(
        mockDeliveryId,
        DeliveryStatus.InTransit,
        mockRiderId,
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        'delivery.events.pickup-confirmed-v1',
        expect.objectContaining({
          deliveryId: mockDeliveryId,
          riderId: mockRiderId,
        }),
      );
    });

    it('should return error when delivery not found', async () => {
      deliveryRepository.findOne.mockResolvedValue(null);

      const result = await coordinator.confirmPickup(mockDeliveryId, mockRiderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(lifecycleCoordinator.transitionState).not.toHaveBeenCalled();
    });

    it('should return error when rider does not match assigned rider', async () => {
      const mockDelivery = createMockDelivery({
        status: DeliveryStatus.Assigned,
        assignedRiderId: 'different-rider',
      });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const result = await coordinator.confirmPickup(mockDeliveryId, mockRiderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not assigned');
      expect(lifecycleCoordinator.transitionState).not.toHaveBeenCalled();
    });

    it('should return error when delivery status is not Assigned', async () => {
      const mockDelivery = createMockDelivery({ status: DeliveryStatus.InTransit });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const result = await coordinator.confirmPickup(mockDeliveryId, mockRiderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('status');
      expect(lifecycleCoordinator.transitionState).not.toHaveBeenCalled();
    });

    it('should confirm pickup without proof data', async () => {
      const mockDelivery = createMockDelivery({ status: DeliveryStatus.Assigned });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const result = await coordinator.confirmPickup(mockDeliveryId, mockRiderId);

      expect(result.success).toBe(true);
      expect(eventBus.publish).toHaveBeenCalledWith(
        'delivery.events.pickup-confirmed-v1',
        expect.objectContaining({
          proofData: null,
        }),
      );
    });
  });

  describe('confirmDropoff', () => {
    it('should successfully confirm dropoff for valid delivery', async () => {
      const mockDelivery = createMockDelivery({ status: DeliveryStatus.InTransit });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const result = await coordinator.confirmDropoff(mockDeliveryId, mockRiderId, {
        photoUrl: 'http://example.com/dropoff.jpg',
        recipientName: 'John Doe',
      });

      expect(result.success).toBe(true);
      expect(result.deliveryId).toBe(mockDeliveryId);

      expect(lifecycleCoordinator.transitionState).toHaveBeenCalledWith(
        mockDeliveryId,
        DeliveryStatus.Delivered,
        mockRiderId,
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        'delivery.events.dropoff-confirmed-v1',
        expect.objectContaining({
          deliveryId: mockDeliveryId,
          riderId: mockRiderId,
        }),
      );
    });

    it('should return error when delivery not found', async () => {
      deliveryRepository.findOne.mockResolvedValue(null);

      const result = await coordinator.confirmDropoff(mockDeliveryId, mockRiderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error when rider does not match', async () => {
      const mockDelivery = createMockDelivery({
        status: DeliveryStatus.InTransit,
        assignedRiderId: 'another-rider',
      });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const result = await coordinator.confirmDropoff(mockDeliveryId, mockRiderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not assigned');
    });

    it('should return error when status is not InTransit', async () => {
      const mockDelivery = createMockDelivery({ status: DeliveryStatus.Assigned });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const result = await coordinator.confirmDropoff(mockDeliveryId, mockRiderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('status');
    });
  });

  describe('updateProgress', () => {
    it('should update progress and emit event for InTransit delivery', async () => {
      const mockDelivery = createMockDelivery({ status: DeliveryStatus.InTransit });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const telemetryData = {
        latitude: -1.2921,
        longitude: 36.8219,
        timestamp: new Date(),
      };

      const result = await coordinator.updateProgress(mockDeliveryId, telemetryData);

      expect(result.deliveryId).toBe(mockDeliveryId);
      expect(result.isDelayed).toBe(false);
      expect(eventBus.publish).toHaveBeenCalledWith(
        'delivery.events.progress-updated-v1',
        expect.objectContaining({
          deliveryId: mockDeliveryId,
          currentLocation: {
            latitude: telemetryData.latitude,
            longitude: telemetryData.longitude,
          },
        }),
      );
    });

    it('should update progress for PickedUp status', async () => {
      const mockDelivery = createMockDelivery({ status: DeliveryStatus.PickedUp });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const telemetryData = {
        latitude: -1.2921,
        longitude: 36.8219,
        timestamp: new Date(),
      };

      const result = await coordinator.updateProgress(mockDeliveryId, telemetryData);

      expect(result.deliveryId).toBe(mockDeliveryId);
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should throw error when delivery not found', async () => {
      deliveryRepository.findOne.mockResolvedValue(null);

      await expect(
        coordinator.updateProgress(mockDeliveryId, {
          latitude: -1.2921,
          longitude: 36.8219,
          timestamp: new Date(),
        }),
      ).rejects.toThrow(DeliveryNotFoundError);
    });

    it('should throw error for invalid status', async () => {
      const mockDelivery = createMockDelivery({ status: DeliveryStatus.Delivered });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      await expect(
        coordinator.updateProgress(mockDeliveryId, {
          latitude: -1.2921,
          longitude: 36.8219,
          timestamp: new Date(),
        }),
      ).rejects.toThrow(InvalidStatusError);
    });

    it('should detect delay when past SLA', async () => {
      const pastSla = new Date(Date.now() - 30 * 60 * 1000);
      const mockDelivery = createMockDelivery({
        status: DeliveryStatus.InTransit,
        slaDropoffBy: pastSla,
      });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const telemetryData = {
        latitude: -1.2921,
        longitude: 36.8219,
        timestamp: new Date(),
      };

      const result = await coordinator.updateProgress(mockDeliveryId, telemetryData);

      expect(result.isDelayed).toBe(true);
      expect(deliveryRepository.update).toHaveBeenCalledWith(mockDeliveryId, {
        slaBreachedAt: expect.any(Date),
      });
    });

    it('should calculate ETA using rider path when available', async () => {
      const mockDelivery = createMockDelivery({ status: DeliveryStatus.InTransit });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);
      locationIntelligenceService.getRiderPath.mockResolvedValue([
        { latitude: -1.29, longitude: 36.82 },
        { latitude: -1.30, longitude: 36.83 },
      ]);

      const telemetryData = {
        latitude: -1.2921,
        longitude: 36.8219,
        timestamp: new Date(),
      };

      const result = await coordinator.updateProgress(mockDeliveryId, telemetryData);

      expect(result.estimatedArrival).toBeDefined();
      expect(locationIntelligenceService.getRiderPath).toHaveBeenCalledWith(
        mockRiderId,
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
      );
    });
  });

  describe('detectAbnormalDelay', () => {
    it('should return not delayed when no SLA set', async () => {
      const mockDelivery = createMockDelivery({ slaDropoffBy: null });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const result = await coordinator.detectAbnormalDelay(mockDeliveryId);

      expect(result.isDelayed).toBe(false);
      expect(result.delayMinutes).toBeUndefined();
    });

    it('should return not delayed when before SLA', async () => {
      const futureSla = new Date(Date.now() + 60 * 60 * 1000);
      const mockDelivery = createMockDelivery({ slaDropoffBy: futureSla });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const result = await coordinator.detectAbnormalDelay(mockDeliveryId);

      expect(result.isDelayed).toBe(false);
    });

    it('should detect delay and emit event when past SLA', async () => {
      const pastSla = new Date(Date.now() - 45 * 60 * 1000);
      const mockDelivery = createMockDelivery({
        slaDropoffBy: pastSla,
        slaBreachedAt: null,
      });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const result = await coordinator.detectAbnormalDelay(mockDeliveryId);

      expect(result.isDelayed).toBe(true);
      expect(result.delayMinutes).toBeGreaterThanOrEqual(44);
      expect(result.delayMinutes).toBeLessThanOrEqual(46);
      expect(deliveryRepository.update).toHaveBeenCalledWith(mockDeliveryId, {
        slaBreachedAt: expect.any(Date),
      });
      expect(eventBus.publish).toHaveBeenCalledWith(
        'delivery.events.delay-detected-v1',
        expect.objectContaining({
          deliveryId: mockDeliveryId,
          delayMinutes: expect.any(Number),
          reason: 'SLA dropoff time exceeded',
        }),
      );
    });

    it('should not emit event if slaBreachedAt already set', async () => {
      const pastSla = new Date(Date.now() - 30 * 60 * 1000);
      const mockDelivery = createMockDelivery({
        slaDropoffBy: pastSla,
        slaBreachedAt: new Date(Date.now() - 20 * 60 * 1000),
      });
      deliveryRepository.findOne.mockResolvedValue(mockDelivery);

      const result = await coordinator.detectAbnormalDelay(mockDeliveryId);

      expect(result.isDelayed).toBe(true);
      expect(deliveryRepository.update).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw error when delivery not found', async () => {
      deliveryRepository.findOne.mockResolvedValue(null);

      await expect(coordinator.detectAbnormalDelay(mockDeliveryId)).rejects.toThrow(
        DeliveryNotFoundError,
      );
    });
  });
});
