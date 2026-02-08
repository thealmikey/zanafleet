import { VehicleType } from '@zanafleet/contracts';
import { Neo4jRiderCandidateRepository } from '../../repositories/neo4j-rider-candidate.repository';
import { RiderLocationRepository } from '../../repositories/rider-location.repository';
import { Neo4jService } from '../../../../core/neo4j/neo4j.service';
import { RiderLocationSnapshot } from '../../types/rider-location.types';

describe('Neo4jRiderCandidateRepository', () => {
  let repository: Neo4jRiderCandidateRepository;
  let mockRiderLocationRepo: jest.Mocked<RiderLocationRepository>;
  let mockNeo4jService: jest.Mocked<Neo4jService>;
  let mockSession: {
    run: jest.Mock;
    close: jest.Mock;
  };

  const mockSnapshots: RiderLocationSnapshot[] = [
    {
      riderId: 'rider-1',
      latitude: -1.29,
      longitude: 36.82,
      h3IndexFine: 'fine1',
      h3IndexMedium: 'med1',
      h3IndexCoarse: 'coarse1',
      heading: 90,
      speed: 20,
      accuracy: 5,
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      distanceMeters: 100,
    },
    {
      riderId: 'rider-2',
      latitude: -1.30,
      longitude: 36.83,
      h3IndexFine: 'fine2',
      h3IndexMedium: 'med2',
      h3IndexCoarse: 'coarse2',
      heading: 180,
      speed: 25,
      accuracy: 10,
      updatedAt: new Date('2024-01-15T10:01:00Z'),
      distanceMeters: 500,
    },
  ];

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockRiderLocationRepo = {
      findNearbyRiders: jest.fn().mockResolvedValue(mockSnapshots),
      upsertSnapshot: jest.fn(),
      appendHistory: jest.fn(),
      findRidersInH3Cells: jest.fn(),
      findRidersInPolygon: jest.fn(),
      getRiderPath: jest.fn(),
    } as unknown as jest.Mocked<RiderLocationRepository>;

    mockNeo4jService = {
      getReadSession: jest.fn().mockReturnValue(mockSession),
      getWriteSession: jest.fn(),
      getSession: jest.fn(),
      getDriver: jest.fn(),
    } as unknown as jest.Mocked<Neo4jService>;

    repository = new Neo4jRiderCandidateRepository(
      mockRiderLocationRepo,
      mockNeo4jService,
    );
  });

  describe('findNearbyRiders', () => {
    it('should return empty array when no nearby riders found', async () => {
      mockRiderLocationRepo.findNearbyRiders.mockResolvedValue([]);

      const result = await repository.findNearbyRiders(-1.29, 36.82, 5000);

      expect(result).toEqual([]);
      expect(mockNeo4jService.getReadSession).not.toHaveBeenCalled();
    });

    it('should query spatial repository with correct parameters', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      await repository.findNearbyRiders(-1.29, 36.82, 5000, undefined, 10);

      expect(mockRiderLocationRepo.findNearbyRiders).toHaveBeenCalledWith({
        point: { latitude: -1.29, longitude: 36.82 },
        radiusMeters: 5000,
        limit: 10,
      });
    });

    it('should enrich candidates with Neo4j metadata', async () => {
      mockSession.run.mockResolvedValue({
        records: [
          {
            get: jest.fn((key: string) => {
              const data: Record<string, unknown> = {
                riderId: 'rider-1',
                vehicleType: 'Car',
                busyWindows: [],
              };
              return data[key];
            }),
          },
          {
            get: jest.fn((key: string) => {
              const data: Record<string, unknown> = {
                riderId: 'rider-2',
                vehicleType: 'Bike',
                busyWindows: [
                  {
                    start: '2024-01-15T10:00:00Z',
                    end: '2024-01-15T11:00:00Z',
                  },
                ],
              };
              return data[key];
            }),
          },
        ],
      });

      const result = await repository.findNearbyRiders(-1.29, 36.82, 5000);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        riderId: 'rider-1',
        lastKnownLocation: { latitude: -1.29, longitude: 36.82 },
        lastSeenAt: new Date('2024-01-15T10:00:00Z'),
        vehicleType: VehicleType.Car,
        busyWindows: [],
      });
      expect(result[1]).toEqual({
        riderId: 'rider-2',
        lastKnownLocation: { latitude: -1.30, longitude: 36.83 },
        lastSeenAt: new Date('2024-01-15T10:01:00Z'),
        vehicleType: VehicleType.Bike,
        busyWindows: [
          {
            start: new Date('2024-01-15T10:00:00Z'),
            end: new Date('2024-01-15T11:00:00Z'),
          },
        ],
      });
    });

    it('should default to Bike when vehicleType is null', async () => {
      mockRiderLocationRepo.findNearbyRiders.mockResolvedValue([mockSnapshots[0]]);
      mockSession.run.mockResolvedValue({
        records: [
          {
            get: jest.fn((key: string) => {
              const data: Record<string, unknown> = {
                riderId: 'rider-1',
                vehicleType: null,
                busyWindows: [],
              };
              return data[key];
            }),
          },
        ],
      });

      const result = await repository.findNearbyRiders(-1.29, 36.82, 5000);

      expect(result[0].vehicleType).toBe(VehicleType.Bike);
    });

    it('should default to Bike when vehicleType is unknown', async () => {
      mockRiderLocationRepo.findNearbyRiders.mockResolvedValue([mockSnapshots[0]]);
      mockSession.run.mockResolvedValue({
        records: [
          {
            get: jest.fn((key: string) => {
              const data: Record<string, unknown> = {
                riderId: 'rider-1',
                vehicleType: 'UnknownType',
                busyWindows: [],
              };
              return data[key];
            }),
          },
        ],
      });

      const result = await repository.findNearbyRiders(-1.29, 36.82, 5000);

      expect(result[0].vehicleType).toBe(VehicleType.Bike);
    });

    it('should filter out null busy windows', async () => {
      mockRiderLocationRepo.findNearbyRiders.mockResolvedValue([mockSnapshots[0]]);
      mockSession.run.mockResolvedValue({
        records: [
          {
            get: jest.fn((key: string) => {
              const data: Record<string, unknown> = {
                riderId: 'rider-1',
                vehicleType: 'Bike',
                busyWindows: [
                  null,
                  { start: '2024-01-15T10:00:00Z', end: '2024-01-15T11:00:00Z' },
                  { start: null, end: '2024-01-15T12:00:00Z' },
                ],
              };
              return data[key];
            }),
          },
        ],
      });

      const result = await repository.findNearbyRiders(-1.29, 36.82, 5000);

      expect(result[0].busyWindows).toHaveLength(1);
      expect(result[0].busyWindows[0]).toEqual({
        start: new Date('2024-01-15T10:00:00Z'),
        end: new Date('2024-01-15T11:00:00Z'),
      });
    });

    it('should use default values when rider not found in Neo4j', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      const result = await repository.findNearbyRiders(-1.29, 36.82, 5000);

      expect(result).toHaveLength(2);
      expect(result[0].vehicleType).toBe(VehicleType.Bike);
      expect(result[0].busyWindows).toEqual([]);
    });

    it('should close Neo4j session after query', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      await repository.findNearbyRiders(-1.29, 36.82, 5000);

      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should close session even when query fails', async () => {
      mockSession.run.mockRejectedValue(new Error('Neo4j error'));

      await repository.findNearbyRiders(-1.29, 36.82, 5000);

      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should use provided now parameter', async () => {
      const now = new Date('2024-01-15T12:00:00Z');
      mockSession.run.mockResolvedValue({ records: [] });

      await repository.findNearbyRiders(-1.29, 36.82, 5000, now);

      expect(mockRiderLocationRepo.findNearbyRiders).toHaveBeenCalled();
    });

    it('should pass rider IDs to Neo4j query', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      await repository.findNearbyRiders(-1.29, 36.82, 5000);

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (r:Rider)'),
        { riderIds: ['rider-1', 'rider-2'] },
      );
    });
  });
});
