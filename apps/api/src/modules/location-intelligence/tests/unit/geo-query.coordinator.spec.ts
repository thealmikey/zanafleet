import { Test, TestingModule } from '@nestjs/testing';
import { VehicleType } from '@zanafleet/contracts';

import { EventBusService } from '../../../../core/event-bus/event-bus.service';
import { GeoQueryCoordinator } from '../../coordinators/geo-query.coordinator';
import { GeoProviderRegistry } from '../../providers/geo-provider-registry.service';
import { HeatmapService } from '../../services/heatmap.service';
import { LocationIntelligenceService } from '../../services/location-intelligence.service';
import { HeatmapCell } from '../../types/heatmap.types';
import { RiderCandidate } from '../../types/rider-candidate.types';

describe('GeoQueryCoordinator', () => {
  let coordinator: GeoQueryCoordinator;
  let locationIntelligenceService: jest.Mocked<LocationIntelligenceService>;
  let heatmapService: jest.Mocked<HeatmapService>;
  let eventBusService: jest.Mocked<EventBusService>;

  const createMockRiderCandidate = (
    overrides: Partial<RiderCandidate> = {},
  ): RiderCandidate => ({
    riderId: 'rider-123',
    lastKnownLocation: { latitude: -1.2921, longitude: 36.8219 },
    lastSeenAt: new Date(),
    vehicleType: VehicleType.Bike,
    busyWindows: [],
    ...overrides,
  });

  const createMockHeatmapCell = (
    overrides: Partial<HeatmapCell> = {},
  ): HeatmapCell => ({
    h3Index: '8928308280fffff',
    center: { latitude: -1.2921, longitude: 36.8219 },
    count: 5,
    polygon: [],
    ...overrides,
  });

  beforeEach(async () => {
    const mockLocationIntelligenceService = {
      findNearbyRiders: jest.fn(),
      updateRiderLocation: jest.fn(),
      getHeatmap: jest.fn(),
      getRiderPath: jest.fn(),
    };

    const mockHeatmapService = {
      getActivityHeatmap: jest.fn(),
      getHistoricalHeatmap: jest.fn(),
      getH3ColumnForResolution: jest.fn(),
      isPointInBoundingBox: jest.fn(),
    };

    const mockEventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
      publishEvent: jest.fn().mockResolvedValue(undefined),
    };

    const mockGeoProviderRegistry = {
      getDefaultId: jest.fn().mockReturnValue('noop'),
      getProvider: jest.fn().mockReturnValue({
        geocode: jest.fn(),
        reverseGeocode: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoQueryCoordinator,
        { provide: LocationIntelligenceService, useValue: mockLocationIntelligenceService },
        { provide: HeatmapService, useValue: mockHeatmapService },
        { provide: GeoProviderRegistry, useValue: mockGeoProviderRegistry },
        { provide: EventBusService, useValue: mockEventBusService },
      ],
    }).compile();

    coordinator = module.get<GeoQueryCoordinator>(GeoQueryCoordinator);
    locationIntelligenceService = module.get(LocationIntelligenceService);
    heatmapService = module.get(HeatmapService);
    eventBusService = module.get(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    coordinator.clearCache();
  });

  describe('findNearbyRiders', () => {
    it('should delegate to LocationIntelligenceService', async () => {
      const mockRiders = [createMockRiderCandidate()];
      locationIntelligenceService.findNearbyRiders.mockResolvedValue(mockRiders);

      const params = {
        latitude: -1.2921,
        longitude: 36.8219,
        radiusMeters: 1000,
      };

      const result = await coordinator.findNearbyRiders(params);

      expect(result).toEqual(mockRiders);
      expect(locationIntelligenceService.findNearbyRiders).toHaveBeenCalledWith({
        latitude: params.latitude,
        longitude: params.longitude,
        radiusMeters: params.radiusMeters,
        limit: undefined,
        now: undefined,
      });
    });

    it('should cache results and return cached value on second call', async () => {
      const mockRiders = [createMockRiderCandidate()];
      locationIntelligenceService.findNearbyRiders.mockResolvedValue(mockRiders);

      const params = {
        latitude: -1.2921,
        longitude: 36.8219,
        radiusMeters: 1000,
      };

      const result1 = await coordinator.findNearbyRiders(params);
      const result2 = await coordinator.findNearbyRiders(params);

      expect(result1).toEqual(mockRiders);
      expect(result2).toEqual(mockRiders);
      expect(locationIntelligenceService.findNearbyRiders).toHaveBeenCalledTimes(1);
    });

    it('should emit Location.Query.ExecutedV1 event', async () => {
      locationIntelligenceService.findNearbyRiders.mockResolvedValue([]);

      const params = {
        latitude: -1.2921,
        longitude: 36.8219,
        radiusMeters: 1000,
      };

      await coordinator.findNearbyRiders(params);

      expect(eventBusService.publish).toHaveBeenCalledWith(
        'location.events.query-executed-v1',
        expect.objectContaining({
          eventType: 'Location.Query.ExecutedV1',
          payload: expect.objectContaining({
            queryType: 'findNearbyRiders',
          }),
        }),
      );
    });

    it('should pass limit and now parameters', async () => {
      locationIntelligenceService.findNearbyRiders.mockResolvedValue([]);

      const now = new Date();
      const params = {
        latitude: -1.2921,
        longitude: 36.8219,
        radiusMeters: 1000,
        limit: 10,
        now,
      };

      await coordinator.findNearbyRiders(params);

      expect(locationIntelligenceService.findNearbyRiders).toHaveBeenCalledWith({
        latitude: params.latitude,
        longitude: params.longitude,
        radiusMeters: params.radiusMeters,
        limit: 10,
        now,
      });
    });
  });

  describe('getDemandHeatmap', () => {
    it('should delegate to HeatmapService', async () => {
      const mockCells = [createMockHeatmapCell()];
      heatmapService.getActivityHeatmap.mockResolvedValue(mockCells);

      const params = {
        boundingBox: {
          minLat: -1.3,
          maxLat: -1.2,
          minLng: 36.8,
          maxLng: 36.9,
        },
        resolution: 7 as const,
      };

      const result = await coordinator.getDemandHeatmap(params);

      expect(result).toEqual(mockCells);
      expect(heatmapService.getActivityHeatmap).toHaveBeenCalledWith(params);
    });

    it('should cache heatmap results', async () => {
      const mockCells = [createMockHeatmapCell()];
      heatmapService.getActivityHeatmap.mockResolvedValue(mockCells);

      const params = {
        boundingBox: {
          minLat: -1.3,
          maxLat: -1.2,
          minLng: 36.8,
          maxLng: 36.9,
        },
        resolution: 7 as const,
      };

      await coordinator.getDemandHeatmap(params);
      await coordinator.getDemandHeatmap(params);

      expect(heatmapService.getActivityHeatmap).toHaveBeenCalledTimes(1);
    });
  });

  describe('calculateETA', () => {
    it('should calculate ETA using Haversine formula', async () => {
      const origin = { latitude: -1.2921, longitude: 36.8219 };
      const destination = { latitude: -1.2821, longitude: 36.8319 };

      const result = await coordinator.calculateETA(origin, destination);

      expect(result.durationSeconds).toBeGreaterThan(0);
      expect(result.distanceMeters).toBeGreaterThan(0);
      expect(result.confidence).toBeDefined();
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it('should return HIGH confidence for short distances', async () => {
      const origin = { latitude: -1.2921, longitude: 36.8219 };
      const destination = { latitude: -1.2925, longitude: 36.8223 };

      const result = await coordinator.calculateETA(origin, destination);

      expect(result.confidence).toBe('HIGH');
    });

    it('should return MEDIUM confidence for medium distances', async () => {
      const origin = { latitude: -1.2921, longitude: 36.8219 };
      const destination = { latitude: -1.3321, longitude: 36.8619 };

      const result = await coordinator.calculateETA(origin, destination);

      expect(result.confidence).toBe('MEDIUM');
    });

    it('should return LOW confidence for long distances', async () => {
      const origin = { latitude: -1.2921, longitude: 36.8219 };
      const destination = { latitude: -1.5921, longitude: 37.1219 };

      const result = await coordinator.calculateETA(origin, destination);

      expect(result.confidence).toBe('LOW');
    });

    it('should emit query executed event', async () => {
      const origin = { latitude: -1.2921, longitude: 36.8219 };
      const destination = { latitude: -1.2821, longitude: 36.8319 };

      await coordinator.calculateETA(origin, destination);

      expect(eventBusService.publish).toHaveBeenCalledWith(
        'location.events.query-executed-v1',
        expect.objectContaining({
          payload: expect.objectContaining({
            queryType: 'calculateETA',
          }),
        }),
      );
    });
  });

  describe('calculateRouteDistance', () => {
    it('should calculate distance using Haversine formula', async () => {
      const origin = { latitude: -1.2921, longitude: 36.8219 };
      const destination = { latitude: -1.2821, longitude: 36.8319 };

      const result = await coordinator.calculateRouteDistance(origin, destination);

      expect(result.distanceMeters).toBeGreaterThan(0);
      expect(result.confidence).toBeDefined();
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it('should return correct distance for known coordinates', async () => {
      const origin = { latitude: 0, longitude: 0 };
      const destination = { latitude: 0, longitude: 1 };

      const result = await coordinator.calculateRouteDistance(origin, destination);

      expect(result.distanceMeters).toBeCloseTo(111195, -2);
    });

    it('should return zero distance for same point', async () => {
      const point = { latitude: -1.2921, longitude: 36.8219 };

      const result = await coordinator.calculateRouteDistance(point, point);

      expect(result.distanceMeters).toBe(0);
      expect(result.confidence).toBe('HIGH');
    });
  });

  describe('getZoneClusters', () => {
    it('should create zone clusters from riders', async () => {
      const mockRiders = [
        createMockRiderCandidate({
          riderId: 'rider-1',
          lastKnownLocation: { latitude: -1.25, longitude: 36.85 },
        }),
        createMockRiderCandidate({
          riderId: 'rider-2',
          lastKnownLocation: { latitude: -1.27, longitude: 36.87 },
        }),
      ];
      locationIntelligenceService.findNearbyRiders.mockResolvedValue(mockRiders);

      const bounds = {
        minLat: -1.3,
        maxLat: -1.2,
        minLng: 36.8,
        maxLng: 36.9,
      };

      const result = await coordinator.getZoneClusters(bounds);

      expect(result.length).toBe(25);
      expect(result.some((z) => z.riderCount > 0)).toBe(true);

      for (const cluster of result) {
        expect(cluster.zoneId).toBeDefined();
        expect(cluster.center).toBeDefined();
        expect(cluster.bounds).toBeDefined();
        expect(typeof cluster.riderCount).toBe('number');
        expect(typeof cluster.averageLoad).toBe('number');
      }
    });

    it('should cache zone cluster results', async () => {
      locationIntelligenceService.findNearbyRiders.mockResolvedValue([]);

      const bounds = {
        minLat: -1.3,
        maxLat: -1.2,
        minLng: 36.8,
        maxLng: 36.9,
      };

      await coordinator.getZoneClusters(bounds);
      await coordinator.getZoneClusters(bounds);

      expect(locationIntelligenceService.findNearbyRiders).toHaveBeenCalledTimes(1);
    });

    it('should calculate average load based on busy windows', async () => {
      const now = new Date();
      const mockRiders = [
        createMockRiderCandidate({
          riderId: 'rider-1',
          lastKnownLocation: { latitude: -1.25, longitude: 36.85 },
          busyWindows: [{ start: now, end: new Date(now.getTime() + 3600000) }],
        }),
        createMockRiderCandidate({
          riderId: 'rider-2',
          lastKnownLocation: { latitude: -1.25, longitude: 36.85 },
          busyWindows: [],
        }),
      ];
      locationIntelligenceService.findNearbyRiders.mockResolvedValue(mockRiders);

      const bounds = {
        minLat: -1.3,
        maxLat: -1.2,
        minLng: 36.8,
        maxLng: 36.9,
      };

      const result = await coordinator.getZoneClusters(bounds);

      const clusterWithRiders = result.find((z) => z.riderCount === 2);
      expect(clusterWithRiders).toBeDefined();
      expect(clusterWithRiders!.averageLoad).toBe(0.5);
    });

    it('should exclude riders outside bounds', async () => {
      const mockRiders = [
        createMockRiderCandidate({
          riderId: 'rider-inside',
          lastKnownLocation: { latitude: -1.25, longitude: 36.85 },
        }),
        createMockRiderCandidate({
          riderId: 'rider-outside',
          lastKnownLocation: { latitude: -2.0, longitude: 37.0 },
        }),
      ];
      locationIntelligenceService.findNearbyRiders.mockResolvedValue(mockRiders);

      const bounds = {
        minLat: -1.3,
        maxLat: -1.2,
        minLng: 36.8,
        maxLng: 36.9,
      };

      const result = await coordinator.getZoneClusters(bounds);

      const totalRiders = result.reduce((sum, z) => sum + z.riderCount, 0);
      expect(totalRiders).toBe(1);
    });
  });

  describe('isWithinServiceArea', () => {
    it('should return true for any point (placeholder implementation)', async () => {
      const point = { latitude: -1.2921, longitude: 36.8219 };

      const result = await coordinator.isWithinServiceArea(point, 'area-123');

      expect(result).toBe(true);
    });

    it('should emit query executed event', async () => {
      const point = { latitude: -1.2921, longitude: 36.8219 };

      await coordinator.isWithinServiceArea(point, 'area-123');

      expect(eventBusService.publish).toHaveBeenCalledWith(
        'location.events.query-executed-v1',
        expect.objectContaining({
          payload: expect.objectContaining({
            queryType: 'isWithinServiceArea',
          }),
        }),
      );
    });
  });

  describe('calculateHaversineDistance', () => {
    it('should calculate correct distance for known coordinates', () => {
      const point1 = { latitude: 0, longitude: 0 };
      const point2 = { latitude: 0, longitude: 1 };

      const distance = coordinator.calculateHaversineDistance(point1, point2);

      expect(distance).toBeCloseTo(111195, -2);
    });

    it('should return zero for same coordinates', () => {
      const point = { latitude: -1.2921, longitude: 36.8219 };

      const distance = coordinator.calculateHaversineDistance(point, point);

      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const point1 = { latitude: -1.2921, longitude: 36.8219 };
      const point2 = { latitude: -1.2821, longitude: 36.8319 };

      const distance = coordinator.calculateHaversineDistance(point1, point2);

      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('caching behavior', () => {
    it('should expire cache entries after TTL', async () => {
      const mockRiders = [createMockRiderCandidate()];
      locationIntelligenceService.findNearbyRiders.mockResolvedValue(mockRiders);

      coordinator.updateConfig({ cacheTtlMs: 1 });

      const params = {
        latitude: -1.2921,
        longitude: 36.8219,
        radiusMeters: 1000,
      };

      await coordinator.findNearbyRiders(params);

      await new Promise((resolve) => setTimeout(resolve, 10));

      await coordinator.findNearbyRiders(params);

      expect(locationIntelligenceService.findNearbyRiders).toHaveBeenCalledTimes(2);
    });

    it('should clear cache when requested', async () => {
      const mockRiders = [createMockRiderCandidate()];
      locationIntelligenceService.findNearbyRiders.mockResolvedValue(mockRiders);

      const params = {
        latitude: -1.2921,
        longitude: 36.8219,
        radiusMeters: 1000,
      };

      await coordinator.findNearbyRiders(params);

      coordinator.clearCache();

      await coordinator.findNearbyRiders(params);

      expect(locationIntelligenceService.findNearbyRiders).toHaveBeenCalledTimes(2);
    });

    it('should report cache statistics', async () => {
      const mockRiders = [createMockRiderCandidate()];
      locationIntelligenceService.findNearbyRiders.mockResolvedValue(mockRiders);

      const params = {
        latitude: -1.2921,
        longitude: 36.8219,
        radiusMeters: 1000,
      };

      await coordinator.findNearbyRiders(params);

      const stats = coordinator.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.keys.length).toBe(1);
      expect(stats.keys[0]).toContain('nearby-riders');
    });
  });

  describe('configuration', () => {
    it('should allow updating configuration', () => {
      coordinator.updateConfig({
        cacheTtlMs: 10000,
        defaultGridSize: 10,
        averageSpeedMps: 2.0,
      });

      const config = coordinator.getConfig();

      expect(config.cacheTtlMs).toBe(10000);
      expect(config.defaultGridSize).toBe(10);
      expect(config.averageSpeedMps).toBe(2.0);
    });

    it('should use updated speed for ETA calculations', async () => {
      coordinator.updateConfig({ averageSpeedMps: 10.0 });

      const origin = { latitude: -1.2921, longitude: 36.8219 };
      const destination = { latitude: -1.2821, longitude: 36.8319 };

      const result = await coordinator.calculateETA(origin, destination);

      const distanceMeters = coordinator.calculateHaversineDistance(origin, destination);
      const expectedDuration = Math.round(distanceMeters / 10.0);

      expect(result.durationSeconds).toBe(expectedDuration);
    });
  });

  describe('event emission', () => {
    it('should handle event bus errors gracefully', async () => {
      eventBusService.publish.mockRejectedValue(new Error('Event bus unavailable'));
      locationIntelligenceService.findNearbyRiders.mockResolvedValue([]);

      const params = {
        latitude: -1.2921,
        longitude: 36.8219,
        radiusMeters: 1000,
      };

      await expect(coordinator.findNearbyRiders(params)).resolves.toEqual([]);
    });
  });
});
