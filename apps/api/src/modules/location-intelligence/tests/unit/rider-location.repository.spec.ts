import { DataSource } from 'typeorm';

import { GeoPoint } from '../../providers/geo-provider.interface';
import {
  RiderLocationRepository,
  haversineDistanceMeters,
} from '../../repositories/rider-location.repository';
import { H3Service } from '../../services/h3.service';

describe('haversineDistanceMeters', () => {
  it('should return 0 for the same point', () => {
    const point: GeoPoint = { latitude: -1.2921, longitude: 36.8219 };
    const distance = haversineDistanceMeters(point, point);
    expect(distance).toBe(0);
  });

  it('should calculate distance between Nairobi CBD and Westlands (~4km)', () => {
    const nairobiCBD: GeoPoint = { latitude: -1.2864, longitude: 36.8172 };
    const westlands: GeoPoint = { latitude: -1.2673, longitude: 36.8114 };
    const distance = haversineDistanceMeters(nairobiCBD, westlands);
    expect(distance).toBeGreaterThan(2000);
    expect(distance).toBeLessThan(3000);
  });

  it('should calculate distance between Nairobi and Mombasa (~440km)', () => {
    const nairobi: GeoPoint = { latitude: -1.2921, longitude: 36.8219 };
    const mombasa: GeoPoint = { latitude: -4.0435, longitude: 39.6682 };
    const distance = haversineDistanceMeters(nairobi, mombasa);
    expect(distance).toBeGreaterThan(400000);
    expect(distance).toBeLessThan(500000);
  });

  it('should be symmetric', () => {
    const a: GeoPoint = { latitude: -1.2921, longitude: 36.8219 };
    const b: GeoPoint = { latitude: -1.3, longitude: 36.85 };
    const distanceAB = haversineDistanceMeters(a, b);
    const distanceBA = haversineDistanceMeters(b, a);
    expect(distanceAB).toBeCloseTo(distanceBA, 6);
  });

  it('should handle points across the equator', () => {
    const north: GeoPoint = { latitude: 1.0, longitude: 36.8 };
    const south: GeoPoint = { latitude: -1.0, longitude: 36.8 };
    const distance = haversineDistanceMeters(north, south);
    expect(distance).toBeGreaterThan(220000);
    expect(distance).toBeLessThan(225000);
  });
});

describe('RiderLocationRepository', () => {
  let repository: RiderLocationRepository;
  let mockDataSource: Partial<DataSource>;
  let mockH3Service: Partial<H3Service>;

  const nairobiCenter: GeoPoint = { latitude: -1.2921, longitude: 36.8219 };

  beforeEach(() => {
    mockDataSource = {
      query: jest.fn(),
    };
    mockH3Service = {
      pointToH3: jest.fn(),
      pointToMultiResolution: jest.fn(),
      getNeighbors: jest.fn(),
    };

    repository = new RiderLocationRepository(
      mockDataSource as DataSource,
      mockH3Service as H3Service,
    );
  });

  describe('upsertSnapshot', () => {
    it('should call dataSource.query with correct SQL and parameters', async () => {
      const h3Indices = {
        fine: '89283082813ffff',
        medium: '872830828ffffff',
        coarse: '852830bffffffff',
      };
      (mockH3Service.pointToMultiResolution as jest.Mock).mockReturnValue(h3Indices);

      const data = {
        riderId: 'rider-123',
        latitude: -1.2921,
        longitude: 36.8219,
        heading: 90,
        speed: 5.5,
        accuracy: 10,
      };

      await repository.upsertSnapshot(data);

      expect(mockH3Service.pointToMultiResolution).toHaveBeenCalledWith({
        latitude: data.latitude,
        longitude: data.longitude,
      });
      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
      const [sql, params] = (mockDataSource.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('INSERT INTO rider_location_snapshots');
      expect(sql).toContain('ON CONFLICT (rider_id) DO UPDATE');
      expect(params).toEqual([
        'rider-123',
        -1.2921,
        36.8219,
        36.8219,
        -1.2921,
        h3Indices.fine,
        h3Indices.medium,
        h3Indices.coarse,
        90,
        5.5,
        10,
      ]);
    });

    it('should handle null optional fields', async () => {
      (mockH3Service.pointToMultiResolution as jest.Mock).mockReturnValue({
        fine: 'h3fine',
        medium: 'h3medium',
        coarse: 'h3coarse',
      });

      await repository.upsertSnapshot({
        riderId: 'rider-456',
        latitude: -1.3,
        longitude: 36.85,
      });

      const [, params] = (mockDataSource.query as jest.Mock).mock.calls[0];
      expect(params[8]).toBeNull();
      expect(params[9]).toBeNull();
      expect(params[10]).toBeNull();
    });
  });

  describe('appendHistory', () => {
    it('should call dataSource.query with correct SQL and parameters', async () => {
      const h3Indices = {
        fine: '89283082813ffff',
        medium: '872830828ffffff',
        coarse: '852830bffffffff',
      };
      (mockH3Service.pointToMultiResolution as jest.Mock).mockReturnValue(h3Indices);

      const recordedAt = new Date('2024-01-15T10:30:00Z');
      const data = {
        riderId: 'rider-789',
        latitude: -1.2921,
        longitude: 36.8219,
        heading: 180,
        speed: 10,
        accuracy: 5,
        recordedAt,
      };

      await repository.appendHistory(data);

      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
      const [sql, params] = (mockDataSource.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('INSERT INTO rider_location_history');
      expect(params[0]).toBe('rider-789');
      expect(params[11]).toBe(recordedAt);
    });
  });

  describe('findRidersInH3Cells', () => {
    it('should return empty array for empty h3Indexes', async () => {
      const result = await repository.findRidersInH3Cells([]);
      expect(result).toEqual([]);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should query database with H3 indexes array', async () => {
      const h3Indexes = ['cell1', 'cell2', 'cell3'];
      (mockDataSource.query as jest.Mock).mockResolvedValue([]);

      await repository.findRidersInH3Cells(h3Indexes);

      const [sql, params] = (mockDataSource.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('WHERE h3_index_fine = ANY($1)');
      expect(params).toEqual([h3Indexes]);
    });

    it('should map database rows to RiderLocationSnapshot', async () => {
      const dbRows = [
        {
          riderId: 'rider-1',
          latitude: -1.29,
          longitude: 36.82,
          h3IndexFine: 'fine1',
          h3IndexMedium: 'medium1',
          h3IndexCoarse: 'coarse1',
          heading: 90,
          speed: 5,
          accuracy: 10,
          updatedAt: new Date('2024-01-15T12:00:00Z'),
        },
      ];
      (mockDataSource.query as jest.Mock).mockResolvedValue(dbRows);

      const result = await repository.findRidersInH3Cells(['cell1']);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        riderId: 'rider-1',
        latitude: -1.29,
        longitude: 36.82,
        h3IndexFine: 'fine1',
        h3IndexMedium: 'medium1',
        h3IndexCoarse: 'coarse1',
        heading: 90,
        speed: 5,
        accuracy: 10,
        updatedAt: dbRows[0].updatedAt,
      });
    });
  });

  describe('findNearbyRiders', () => {
    it('should calculate k-ring size based on radius', async () => {
      (mockH3Service.pointToH3 as jest.Mock).mockReturnValue('centerCell');
      (mockH3Service.getNeighbors as jest.Mock).mockReturnValue(['centerCell']);
      (mockDataSource.query as jest.Mock).mockResolvedValue([]);

      await repository.findNearbyRiders({
        point: nairobiCenter,
        radiusMeters: 500,
      });

      expect(mockH3Service.pointToH3).toHaveBeenCalledWith(nairobiCenter, 9);
      expect(mockH3Service.getNeighbors).toHaveBeenCalledWith('centerCell', 2);
    });

    it('should use minimum k-ring size of 1', async () => {
      (mockH3Service.pointToH3 as jest.Mock).mockReturnValue('centerCell');
      (mockH3Service.getNeighbors as jest.Mock).mockReturnValue(['centerCell']);
      (mockDataSource.query as jest.Mock).mockResolvedValue([]);

      await repository.findNearbyRiders({
        point: nairobiCenter,
        radiusMeters: 50,
      });

      expect(mockH3Service.getNeighbors).toHaveBeenCalledWith('centerCell', 1);
    });

    it('should filter candidates by actual haversine distance', async () => {
      (mockH3Service.pointToH3 as jest.Mock).mockReturnValue('centerCell');
      (mockH3Service.getNeighbors as jest.Mock).mockReturnValue(['centerCell', 'neighbor1']);

      const closeRider = {
        riderId: 'close',
        latitude: -1.2925,
        longitude: 36.8220,
        h3IndexFine: 'fine1',
        h3IndexMedium: 'medium1',
        h3IndexCoarse: 'coarse1',
        heading: null,
        speed: null,
        accuracy: null,
        updatedAt: new Date(),
      };
      const farRider = {
        riderId: 'far',
        latitude: -1.32,
        longitude: 36.85,
        h3IndexFine: 'fine2',
        h3IndexMedium: 'medium2',
        h3IndexCoarse: 'coarse2',
        heading: null,
        speed: null,
        accuracy: null,
        updatedAt: new Date(),
      };

      (mockDataSource.query as jest.Mock).mockResolvedValue([closeRider, farRider]);

      const result = await repository.findNearbyRiders({
        point: nairobiCenter,
        radiusMeters: 500,
      });

      expect(result).toHaveLength(1);
      expect(result[0].riderId).toBe('close');
      expect(result[0].distanceMeters).toBeDefined();
      expect(result[0].distanceMeters).toBeLessThan(500);
    });

    it('should sort results by distance ascending', async () => {
      (mockH3Service.pointToH3 as jest.Mock).mockReturnValue('centerCell');
      (mockH3Service.getNeighbors as jest.Mock).mockReturnValue(['centerCell']);

      const riders = [
        {
          riderId: 'medium',
          latitude: -1.294,
          longitude: 36.823,
          h3IndexFine: 'fine1',
          h3IndexMedium: 'medium1',
          h3IndexCoarse: 'coarse1',
          heading: null,
          speed: null,
          accuracy: null,
          updatedAt: new Date(),
        },
        {
          riderId: 'closest',
          latitude: -1.2922,
          longitude: 36.8220,
          h3IndexFine: 'fine2',
          h3IndexMedium: 'medium2',
          h3IndexCoarse: 'coarse2',
          heading: null,
          speed: null,
          accuracy: null,
          updatedAt: new Date(),
        },
      ];
      (mockDataSource.query as jest.Mock).mockResolvedValue(riders);

      const result = await repository.findNearbyRiders({
        point: nairobiCenter,
        radiusMeters: 1000,
      });

      expect(result[0].riderId).toBe('closest');
      expect(result[1].riderId).toBe('medium');
      expect(result[0].distanceMeters!).toBeLessThan(result[1].distanceMeters!);
    });

    it('should respect limit parameter', async () => {
      (mockH3Service.pointToH3 as jest.Mock).mockReturnValue('centerCell');
      (mockH3Service.getNeighbors as jest.Mock).mockReturnValue(['centerCell']);

      const riders = Array.from({ length: 10 }, (_, i) => ({
        riderId: `rider-${i}`,
        latitude: -1.2921 + i * 0.0001,
        longitude: 36.8219,
        h3IndexFine: `fine${i}`,
        h3IndexMedium: `medium${i}`,
        h3IndexCoarse: `coarse${i}`,
        heading: null,
        speed: null,
        accuracy: null,
        updatedAt: new Date(),
      }));
      (mockDataSource.query as jest.Mock).mockResolvedValue(riders);

      const result = await repository.findNearbyRiders({
        point: nairobiCenter,
        radiusMeters: 5000,
        limit: 3,
      });

      expect(result).toHaveLength(3);
    });
  });

  describe('findRidersInPolygon', () => {
    it('should return empty array for polygon with fewer than 3 points', async () => {
      const result = await repository.findRidersInPolygon([
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 1 },
      ]);
      expect(result).toEqual([]);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should build correct WKT polygon and query', async () => {
      (mockDataSource.query as jest.Mock).mockResolvedValue([]);

      const polygon: GeoPoint[] = [
        { latitude: -1.29, longitude: 36.82 },
        { latitude: -1.29, longitude: 36.83 },
        { latitude: -1.30, longitude: 36.83 },
        { latitude: -1.30, longitude: 36.82 },
      ];

      await repository.findRidersInPolygon(polygon);

      const [sql, params] = (mockDataSource.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('ST_Contains');
      expect(sql).toContain('ST_GeomFromText($1)');
      expect(params[0]).toBe(
        'POLYGON((36.82 -1.29, 36.83 -1.29, 36.83 -1.3, 36.82 -1.3, 36.82 -1.29))',
      );
    });
  });

  describe('getRiderPath', () => {
    it('should query history with rider ID and time range', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z');
      const endTime = new Date('2024-01-15T11:00:00Z');
      (mockDataSource.query as jest.Mock).mockResolvedValue([]);

      await repository.getRiderPath('rider-123', startTime, endTime);

      const [sql, params] = (mockDataSource.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('FROM rider_location_history');
      expect(sql).toContain('WHERE rider_id = $1');
      expect(sql).toContain('recorded_at >= $2');
      expect(sql).toContain('recorded_at <= $3');
      expect(sql).toContain('ORDER BY recorded_at ASC');
      expect(params).toEqual(['rider-123', startTime, endTime]);
    });

    it('should map database rows to RiderLocationHistory', async () => {
      const recordedAt = new Date('2024-01-15T10:30:00Z');
      const dbRows = [
        {
          id: 'history-1',
          riderId: 'rider-123',
          latitude: -1.29,
          longitude: 36.82,
          h3IndexFine: 'fine1',
          h3IndexMedium: 'medium1',
          h3IndexCoarse: 'coarse1',
          heading: 90,
          speed: 5,
          accuracy: 10,
          recordedAt,
        },
      ];
      (mockDataSource.query as jest.Mock).mockResolvedValue(dbRows);

      const result = await repository.getRiderPath(
        'rider-123',
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-15T11:00:00Z'),
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'history-1',
        riderId: 'rider-123',
        latitude: -1.29,
        longitude: 36.82,
        h3IndexFine: 'fine1',
        h3IndexMedium: 'medium1',
        h3IndexCoarse: 'coarse1',
        heading: 90,
        speed: 5,
        accuracy: 10,
        recordedAt,
      });
    });
  });
});
