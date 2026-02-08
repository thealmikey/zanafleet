import { CommandBus } from '@nestjs/cqrs';
import { RiderTelemetryData, VehicleType } from '@zanafleet/contracts';
import { LocationIntelligenceService } from '../../services/location-intelligence.service';
import { RiderLocationRepository } from '../../repositories/rider-location.repository';
import { HeatmapService } from '../../services/heatmap.service';
import { Neo4jRiderCandidateRepository } from '../../repositories/neo4j-rider-candidate.repository';
import { UpdateRiderLocationCommand } from '../../commands/update-rider-location.command';
import { HeatmapParams, HeatmapCell } from '../../types/heatmap.types';
import { H3_RESOLUTION_MEDIUM } from '../../types/h3.types';
import { RiderCandidate } from '../../types/rider-candidate.types';
import { RiderLocationHistory } from '../../types/rider-location.types';

describe('LocationIntelligenceService', () => {
  let service: LocationIntelligenceService;
  let mockCommandBus: jest.Mocked<CommandBus>;
  let mockRiderLocationRepo: jest.Mocked<RiderLocationRepository>;
  let mockHeatmapService: jest.Mocked<HeatmapService>;
  let mockCandidateRepo: jest.Mocked<Neo4jRiderCandidateRepository>;

  beforeEach(() => {
    mockCommandBus = {
      execute: jest.fn().mockResolvedValue({ updated: true, riderId: 'rider-123' }),
    } as unknown as jest.Mocked<CommandBus>;

    mockRiderLocationRepo = {
      getRiderPath: jest.fn(),
      upsertSnapshot: jest.fn(),
      appendHistory: jest.fn(),
      findNearbyRiders: jest.fn(),
    } as unknown as jest.Mocked<RiderLocationRepository>;

    mockHeatmapService = {
      getActivityHeatmap: jest.fn(),
      getHistoricalHeatmap: jest.fn(),
    } as unknown as jest.Mocked<HeatmapService>;

    mockCandidateRepo = {
      findNearbyRiders: jest.fn(),
    } as unknown as jest.Mocked<Neo4jRiderCandidateRepository>;

    service = new LocationIntelligenceService(
      mockCommandBus,
      mockRiderLocationRepo,
      mockHeatmapService,
      mockCandidateRepo,
    );
  });

  describe('updateRiderLocation', () => {
    const telemetry: RiderTelemetryData = {
      riderId: 'rider-123',
      latitude: -1.2921,
      longitude: 36.8219,
      heading: 90,
      speed: 25,
      accuracy: 10,
      timestamp: new Date('2024-01-15T10:00:00Z'),
    };

    it('should dispatch UpdateRiderLocationCommand via command bus', async () => {
      await service.updateRiderLocation(telemetry);

      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      const command = mockCommandBus.execute.mock.calls[0][0] as UpdateRiderLocationCommand;
      expect(command).toBeInstanceOf(UpdateRiderLocationCommand);
      expect(command.telemetry).toEqual(telemetry);
    });

    it('should propagate errors from command bus', async () => {
      mockCommandBus.execute.mockRejectedValue(new Error('Command failed'));

      await expect(service.updateRiderLocation(telemetry)).rejects.toThrow('Command failed');
    });
  });

  describe('findNearbyRiders', () => {
    const mockCandidates: RiderCandidate[] = [
      {
        riderId: 'rider-1',
        lastKnownLocation: { latitude: -1.29, longitude: 36.82 },
        lastSeenAt: new Date(),
        vehicleType: VehicleType.Bike,
        busyWindows: [],
      },
      {
        riderId: 'rider-2',
        lastKnownLocation: { latitude: -1.30, longitude: 36.83 },
        lastSeenAt: new Date(),
        vehicleType: VehicleType.Car,
        busyWindows: [{ start: new Date(), end: new Date() }],
      },
    ];

    it('should delegate to Neo4jRiderCandidateRepository', async () => {
      mockCandidateRepo.findNearbyRiders.mockResolvedValue(mockCandidates);

      const result = await service.findNearbyRiders({
        latitude: -1.2921,
        longitude: 36.8219,
        radiusMeters: 5000,
      });

      expect(mockCandidateRepo.findNearbyRiders).toHaveBeenCalledWith(
        -1.2921,
        36.8219,
        5000,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockCandidates);
    });

    it('should pass optional parameters', async () => {
      mockCandidateRepo.findNearbyRiders.mockResolvedValue([]);
      const now = new Date();

      await service.findNearbyRiders({
        latitude: -1.2921,
        longitude: 36.8219,
        radiusMeters: 3000,
        now,
        limit: 10,
      });

      expect(mockCandidateRepo.findNearbyRiders).toHaveBeenCalledWith(
        -1.2921,
        36.8219,
        3000,
        now,
        10,
      );
    });

    it('should return empty array when no candidates found', async () => {
      mockCandidateRepo.findNearbyRiders.mockResolvedValue([]);

      const result = await service.findNearbyRiders({
        latitude: -1.2921,
        longitude: 36.8219,
        radiusMeters: 100,
      });

      expect(result).toEqual([]);
    });
  });

  describe('getHeatmap', () => {
    const mockHeatmap: HeatmapCell[] = [
      {
        h3Index: '8728342a9ffffff',
        center: { latitude: -1.29, longitude: 36.82 },
        count: 5,
        polygon: [],
      },
    ];

    const params: HeatmapParams = {
      boundingBox: {
        minLat: -1.35,
        maxLat: -1.20,
        minLng: 36.70,
        maxLng: 36.90,
      },
      resolution: H3_RESOLUTION_MEDIUM,
    };

    it('should delegate to HeatmapService', async () => {
      mockHeatmapService.getActivityHeatmap.mockResolvedValue(mockHeatmap);

      const result = await service.getHeatmap(params);

      expect(mockHeatmapService.getActivityHeatmap).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockHeatmap);
    });

    it('should return empty array when no data', async () => {
      mockHeatmapService.getActivityHeatmap.mockResolvedValue([]);

      const result = await service.getHeatmap(params);

      expect(result).toEqual([]);
    });
  });

  describe('getRiderPath', () => {
    const mockHistory: RiderLocationHistory[] = [
      {
        id: 'hist-1',
        riderId: 'rider-123',
        latitude: -1.29,
        longitude: 36.82,
        h3IndexFine: 'fine1',
        h3IndexMedium: 'med1',
        h3IndexCoarse: 'coarse1',
        heading: 90,
        speed: 20,
        accuracy: 5,
        recordedAt: new Date('2024-01-15T10:00:00Z'),
      },
      {
        id: 'hist-2',
        riderId: 'rider-123',
        latitude: -1.30,
        longitude: 36.83,
        h3IndexFine: 'fine2',
        h3IndexMedium: 'med2',
        h3IndexCoarse: 'coarse2',
        heading: 180,
        speed: 25,
        accuracy: 5,
        recordedAt: new Date('2024-01-15T10:05:00Z'),
      },
    ];

    it('should delegate to RiderLocationRepository and map to GeoPoints', async () => {
      mockRiderLocationRepo.getRiderPath.mockResolvedValue(mockHistory);

      const result = await service.getRiderPath('rider-123', {
        start: new Date('2024-01-15T10:00:00Z'),
        end: new Date('2024-01-15T11:00:00Z'),
      });

      expect(mockRiderLocationRepo.getRiderPath).toHaveBeenCalledWith(
        'rider-123',
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-15T11:00:00Z'),
      );
      expect(result).toEqual([
        { latitude: -1.29, longitude: 36.82 },
        { latitude: -1.30, longitude: 36.83 },
      ]);
    });

    it('should return empty array when no history', async () => {
      mockRiderLocationRepo.getRiderPath.mockResolvedValue([]);

      const result = await service.getRiderPath('rider-123', {
        start: new Date(),
        end: new Date(),
      });

      expect(result).toEqual([]);
    });
  });
});
