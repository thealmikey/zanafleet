import { CapabilityGuard } from '@api/core/api/guards';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { VehicleType } from '@zanafleet/contracts';
import request from 'supertest';

import { GeoController } from '../../controllers/geo.controller';
import { GeoQueryCoordinator } from '../../coordinators/geo-query.coordinator';

describe('GeoController (e2e)', () => {
  let app: INestApplication;
  let mockGeoQueryCoordinator: {
    findNearbyRiders: jest.Mock;
    getDemandHeatmap: jest.Mock;
    getZoneClusters: jest.Mock;
    calculateETA: jest.Mock;
    calculateRouteDistance: jest.Mock;
    isWithinServiceArea: jest.Mock;
  };
  let mockCapabilityAccessController: { hasCapability: jest.Mock };

  beforeEach(async () => {
    mockGeoQueryCoordinator = {
      findNearbyRiders: jest.fn(),
      getDemandHeatmap: jest.fn(),
      getZoneClusters: jest.fn(),
      calculateETA: jest.fn(),
      calculateRouteDistance: jest.fn(),
      isWithinServiceArea: jest.fn(),
    };
    mockCapabilityAccessController = { hasCapability: jest.fn().mockResolvedValue(true) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [GeoController],
      providers: [Reflector, { provide: GeoQueryCoordinator, useValue: mockGeoQueryCoordinator }],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability(
            'test-actor',
            'geo.read'
          );
          if (!result) {
            throw new ForbiddenException('Missing required capability: geo.read');
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

  describe('GET /geo/nearby-riders', () => {
    it('should return 200 with riders array and Cache-Control header', async () => {
      const mockRiders = [
        {
          riderId: 'rider-1',
          lastKnownLocation: { latitude: -1.2921, longitude: 36.8219 },
          distanceMeters: 500,
          score: 100,
          vehicleType: VehicleType.Bike,
        },
        {
          riderId: 'rider-2',
          lastKnownLocation: { latitude: -1.2925, longitude: 36.8215 },
          distanceMeters: 800,
          score: 80,
          vehicleType: VehicleType.Car,
        },
      ];
      mockGeoQueryCoordinator.findNearbyRiders.mockResolvedValue(mockRiders);

      const response = await request(app.getHttpServer())
        .get('/geo/nearby-riders?lat=-1.2921&lng=36.8219&radius=2000&limit=10')
        .expect(200);

      expect(response.body).toEqual(mockRiders);
      expect(response.headers['cache-control']).toContain('max-age=30');
      expect(mockGeoQueryCoordinator.findNearbyRiders).toHaveBeenCalledWith({
        latitude: -1.2921,
        longitude: 36.8219,
        radiusMeters: 2000,
        limit: 10,
      });
    });

    it('should use default limit of 10 when not provided', async () => {
      mockGeoQueryCoordinator.findNearbyRiders.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/geo/nearby-riders?lat=-1.2921&lng=36.8219&radius=1000')
        .expect(200);

      expect(mockGeoQueryCoordinator.findNearbyRiders).toHaveBeenCalledWith({
        latitude: -1.2921,
        longitude: 36.8219,
        radiusMeters: 1000,
        limit: 10,
      });
    });
  });

  describe('GET /geo/heatmap', () => {
    it('should return 200 with heatmap cells and Cache-Control header', async () => {
      const mockHeatmap = [
        { h3Index: '8928308280fffff', value: 5, center: { latitude: -1.29, longitude: 36.82 } },
        { h3Index: '8928308281fffff', value: 3, center: { latitude: -1.3, longitude: 36.83 } },
      ];
      mockGeoQueryCoordinator.getDemandHeatmap.mockResolvedValue(mockHeatmap);

      const response = await request(app.getHttpServer())
        .get('/geo/heatmap?minLat=-1.35&maxLat=-1.25&minLng=36.75&maxLng=36.90&resolution=9')
        .expect(200);

      expect(response.body).toEqual(mockHeatmap);
      expect(response.headers['cache-control']).toContain('max-age=60');
      expect(mockGeoQueryCoordinator.getDemandHeatmap).toHaveBeenCalledWith({
        bounds: {
          minLat: -1.35,
          maxLat: -1.25,
          minLng: 36.75,
          maxLng: 36.9,
        },
        resolution: 9,
      });
    });

    it('should work without resolution parameter and default to 9', async () => {
      mockGeoQueryCoordinator.getDemandHeatmap.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/geo/heatmap?minLat=-1.35&maxLat=-1.25&minLng=36.75&maxLng=36.90')
        .expect(200);

      expect(mockGeoQueryCoordinator.getDemandHeatmap).toHaveBeenCalledWith({
        bounds: {
          minLat: -1.35,
          maxLat: -1.25,
          minLng: 36.75,
          maxLng: 36.9,
        },
        resolution: 9,
      });
    });
  });

  describe('GET /geo/zones', () => {
    it('should return 200 with zone clusters and Cache-Control header', async () => {
      const mockClusters = [
        {
          zoneId: 'zone-0-0',
          center: { latitude: -1.3, longitude: 36.8 },
          bounds: { minLat: -1.35, maxLat: -1.25, minLng: 36.75, maxLng: 36.85 },
          riderCount: 5,
          averageLoad: 0.6,
        },
      ];
      mockGeoQueryCoordinator.getZoneClusters.mockResolvedValue(mockClusters);

      const response = await request(app.getHttpServer())
        .get('/geo/zones?minLat=-1.35&maxLat=-1.25&minLng=36.75&maxLng=36.90')
        .expect(200);

      expect(response.body).toEqual(mockClusters);
      expect(response.headers['cache-control']).toContain('max-age=60');
      expect(mockGeoQueryCoordinator.getZoneClusters).toHaveBeenCalledWith({
        minLat: -1.35,
        maxLat: -1.25,
        minLng: 36.75,
        maxLng: 36.9,
      });
    });
  });

  describe('GET /geo/eta', () => {
    it('should return 200 with ETA result and Cache-Control header', async () => {
      const mockETA = {
        durationSeconds: 600,
        distanceMeters: 2500,
        confidence: 'HIGH' as const,
        calculatedAt: new Date('2024-01-15T10:00:00Z'),
      };
      mockGeoQueryCoordinator.calculateETA.mockResolvedValue(mockETA);

      const response = await request(app.getHttpServer())
        .get('/geo/eta?originLat=-1.2921&originLng=36.8219&destLat=-1.3000&destLng=36.8300')
        .expect(200);

      expect(response.body).toMatchObject({
        durationSeconds: 600,
        distanceMeters: 2500,
        confidence: 'HIGH',
      });
      expect(response.headers['cache-control']).toContain('max-age=15');
      expect(mockGeoQueryCoordinator.calculateETA).toHaveBeenCalledWith(
        { latitude: -1.2921, longitude: 36.8219 },
        { latitude: -1.3, longitude: 36.83 }
      );
    });
  });

  describe('GET /geo/distance', () => {
    it('should return 200 with distance result and Cache-Control header', async () => {
      const mockDistance = {
        distanceMeters: 2500,
        confidence: 'HIGH' as const,
        calculatedAt: new Date('2024-01-15T10:00:00Z'),
      };
      mockGeoQueryCoordinator.calculateRouteDistance.mockResolvedValue(mockDistance);

      const response = await request(app.getHttpServer())
        .get('/geo/distance?originLat=-1.2921&originLng=36.8219&destLat=-1.3000&destLng=36.8300')
        .expect(200);

      expect(response.body).toMatchObject({
        distanceMeters: 2500,
        confidence: 'HIGH',
      });
      expect(response.headers['cache-control']).toContain('max-age=60');
      expect(mockGeoQueryCoordinator.calculateRouteDistance).toHaveBeenCalledWith(
        { latitude: -1.2921, longitude: 36.8219 },
        { latitude: -1.3, longitude: 36.83 }
      );
    });
  });

  describe('GET /geo/service-area/:areaId/contains', () => {
    it('should return 200 with contains: true and Cache-Control header', async () => {
      mockGeoQueryCoordinator.isWithinServiceArea.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .get('/geo/service-area/nairobi-central/contains?lat=-1.2921&lng=36.8219')
        .expect(200);

      expect(response.body).toEqual({ contains: true });
      expect(response.headers['cache-control']).toContain('max-age=300');
      expect(mockGeoQueryCoordinator.isWithinServiceArea).toHaveBeenCalledWith(
        { latitude: -1.2921, longitude: 36.8219 },
        'nairobi-central'
      );
    });

    it('should return 200 with contains: false when outside service area', async () => {
      mockGeoQueryCoordinator.isWithinServiceArea.mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .get('/geo/service-area/nairobi-central/contains?lat=-2.0000&lng=37.0000')
        .expect(200);

      expect(response.body).toEqual({ contains: false });
    });
  });

  describe('RBAC', () => {
    it('should return 403 when user lacks geo.read capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .get('/geo/nearby-riders?lat=-1.2921&lng=36.8219&radius=1000')
        .expect(403);
    });

    it('should return 403 for heatmap when lacking capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .get('/geo/heatmap?minLat=-1.35&maxLat=-1.25&minLng=36.75&maxLng=36.90')
        .expect(403);
    });
  });

  describe('Bad Request Validations', () => {
    beforeEach(() => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(true);
    });

    it('should return 400 when lat is missing for nearby-riders', async () => {
      await request(app.getHttpServer())
        .get('/geo/nearby-riders?lng=36.8219&radius=1000')
        .expect(400);
    });

    it('should return 400 when lng is missing for nearby-riders', async () => {
      await request(app.getHttpServer())
        .get('/geo/nearby-riders?lat=-1.2921&radius=1000')
        .expect(400);
    });

    it('should return 400 when radius is missing for nearby-riders', async () => {
      await request(app.getHttpServer())
        .get('/geo/nearby-riders?lat=-1.2921&lng=36.8219')
        .expect(400);
    });

    it('should return 400 when lat is malformed for nearby-riders', async () => {
      await request(app.getHttpServer())
        .get('/geo/nearby-riders?lat=invalid&lng=36.8219&radius=1000')
        .expect(400);
    });

    it('should return 400 when radius is malformed for nearby-riders', async () => {
      await request(app.getHttpServer())
        .get('/geo/nearby-riders?lat=-1.2921&lng=36.8219&radius=abc')
        .expect(400);
    });

    it('should return 400 when minLat is missing for heatmap', async () => {
      await request(app.getHttpServer())
        .get('/geo/heatmap?maxLat=-1.25&minLng=36.75&maxLng=36.90')
        .expect(400);
    });

    it('should return 400 when bounds are malformed for zones', async () => {
      await request(app.getHttpServer())
        .get('/geo/zones?minLat=invalid&maxLat=-1.25&minLng=36.75&maxLng=36.90')
        .expect(400);
    });

    it('should return 400 when originLat is missing for eta', async () => {
      await request(app.getHttpServer())
        .get('/geo/eta?originLng=36.8219&destLat=-1.3000&destLng=36.8300')
        .expect(400);
    });

    it('should return 400 when destLng is missing for distance', async () => {
      await request(app.getHttpServer())
        .get('/geo/distance?originLat=-1.2921&originLng=36.8219&destLat=-1.3000')
        .expect(400);
    });

    it('should return 400 when lat is missing for service-area contains', async () => {
      await request(app.getHttpServer())
        .get('/geo/service-area/nairobi-central/contains?lng=36.8219')
        .expect(400);
    });

    it('should return 400 when lng is malformed for service-area contains', async () => {
      await request(app.getHttpServer())
        .get('/geo/service-area/nairobi-central/contains?lat=-1.2921&lng=notanumber')
        .expect(400);
    });
  });
});
