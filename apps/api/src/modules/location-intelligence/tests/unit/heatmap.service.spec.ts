import { DataSource } from 'typeorm';

import { GeoPoint } from '../../providers/geo-provider.interface';
import { H3Service } from '../../services/h3.service';
import { HeatmapService } from '../../services/heatmap.service';
import {
  H3_RESOLUTION_FINE,
  H3_RESOLUTION_MEDIUM,
  H3_RESOLUTION_COARSE,
} from '../../types/h3.types';
import {
  BoundingBox,
  HeatmapParams,
  HistoricalHeatmapParams,
} from '../../types/heatmap.types';

describe('HeatmapService', () => {
  let service: HeatmapService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockH3Service: jest.Mocked<H3Service>;

  const nairobiBoundingBox: BoundingBox = {
    minLat: -1.35,
    maxLat: -1.20,
    minLng: 36.70,
    maxLng: 36.90,
  };

  const mockCenterPoint: GeoPoint = { latitude: -1.2921, longitude: 36.8219 };
  const mockPolygon: GeoPoint[] = [
    { latitude: -1.290, longitude: 36.820 },
    { latitude: -1.291, longitude: 36.822 },
    { latitude: -1.293, longitude: 36.823 },
    { latitude: -1.294, longitude: 36.822 },
    { latitude: -1.293, longitude: 36.820 },
    { latitude: -1.291, longitude: 36.819 },
  ];

  beforeEach(() => {
    mockDataSource = {
      query: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    mockH3Service = {
      h3ToPoint: jest.fn().mockReturnValue(mockCenterPoint),
      h3ToPolygon: jest.fn().mockReturnValue(mockPolygon),
      pointToH3: jest.fn(),
      getNeighbors: jest.fn(),
      pointToMultiResolution: jest.fn(),
    } as unknown as jest.Mocked<H3Service>;

    service = new HeatmapService(mockDataSource, mockH3Service);
  });

  describe('getH3ColumnForResolution', () => {
    it('should return h3_index_fine for resolution 9', () => {
      expect(service.getH3ColumnForResolution(H3_RESOLUTION_FINE)).toBe('h3_index_fine');
    });

    it('should return h3_index_medium for resolution 7', () => {
      expect(service.getH3ColumnForResolution(H3_RESOLUTION_MEDIUM)).toBe('h3_index_medium');
    });

    it('should return h3_index_coarse for resolution 5', () => {
      expect(service.getH3ColumnForResolution(H3_RESOLUTION_COARSE)).toBe('h3_index_coarse');
    });

    it('should throw error for unsupported resolution', () => {
      expect(() => service.getH3ColumnForResolution(3 as never)).toThrow(
        'Unsupported H3 resolution: 3',
      );
    });
  });

  describe('isPointInBoundingBox', () => {
    it('should return true for point inside bounding box', () => {
      const point: GeoPoint = { latitude: -1.28, longitude: 36.80 };
      expect(service.isPointInBoundingBox(point, nairobiBoundingBox)).toBe(true);
    });

    it('should return true for point on bounding box boundary', () => {
      const point: GeoPoint = { latitude: -1.35, longitude: 36.70 };
      expect(service.isPointInBoundingBox(point, nairobiBoundingBox)).toBe(true);
    });

    it('should return false for point outside bounding box (south)', () => {
      const point: GeoPoint = { latitude: -1.40, longitude: 36.80 };
      expect(service.isPointInBoundingBox(point, nairobiBoundingBox)).toBe(false);
    });

    it('should return false for point outside bounding box (north)', () => {
      const point: GeoPoint = { latitude: -1.10, longitude: 36.80 };
      expect(service.isPointInBoundingBox(point, nairobiBoundingBox)).toBe(false);
    });

    it('should return false for point outside bounding box (west)', () => {
      const point: GeoPoint = { latitude: -1.28, longitude: 36.60 };
      expect(service.isPointInBoundingBox(point, nairobiBoundingBox)).toBe(false);
    });

    it('should return false for point outside bounding box (east)', () => {
      const point: GeoPoint = { latitude: -1.28, longitude: 37.00 };
      expect(service.isPointInBoundingBox(point, nairobiBoundingBox)).toBe(false);
    });
  });

  describe('getActivityHeatmap', () => {
    it('should query snapshot table with correct parameters', async () => {
      mockDataSource.query.mockResolvedValue([]);
      const params: HeatmapParams = {
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_MEDIUM,
      };

      await service.getActivityHeatmap(params);

      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
      const [query, queryParams] = mockDataSource.query.mock.calls[0];
      expect(query).toContain('rider_location_snapshots');
      expect(query).toContain('h3_index_medium');
      expect(query).toContain('GROUP BY');
      expect(queryParams).toEqual([
        nairobiBoundingBox.minLat,
        nairobiBoundingBox.maxLat,
        nairobiBoundingBox.minLng,
        nairobiBoundingBox.maxLng,
      ]);
    });

    it('should use correct H3 column for each resolution', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.getActivityHeatmap({
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_FINE,
      });
      expect(mockDataSource.query.mock.calls[0][0]).toContain('h3_index_fine');

      await service.getActivityHeatmap({
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_COARSE,
      });
      expect(mockDataSource.query.mock.calls[1][0]).toContain('h3_index_coarse');
    });

    it('should enrich cells with center and polygon', async () => {
      mockDataSource.query.mockResolvedValue([
        { h3Index: '8728342a9ffffff', count: 5 },
      ]);

      const params: HeatmapParams = {
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_MEDIUM,
      };

      const result = await service.getActivityHeatmap(params);

      expect(mockH3Service.h3ToPoint).toHaveBeenCalledWith('8728342a9ffffff');
      expect(mockH3Service.h3ToPolygon).toHaveBeenCalledWith('8728342a9ffffff');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        h3Index: '8728342a9ffffff',
        center: mockCenterPoint,
        count: 5,
        polygon: mockPolygon,
      });
    });

    it('should filter out cells outside bounding box', async () => {
      const outsidePoint: GeoPoint = { latitude: -2.0, longitude: 37.5 };
      mockH3Service.h3ToPoint
        .mockReturnValueOnce(mockCenterPoint)
        .mockReturnValueOnce(outsidePoint);

      mockDataSource.query.mockResolvedValue([
        { h3Index: '8728342a9ffffff', count: 5 },
        { h3Index: '872834outside', count: 3 },
      ]);

      const params: HeatmapParams = {
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_MEDIUM,
      };

      const result = await service.getActivityHeatmap(params);

      expect(result).toHaveLength(1);
      expect(result[0].h3Index).toBe('8728342a9ffffff');
    });

    it('should return empty array when no data', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getActivityHeatmap({
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_MEDIUM,
      });

      expect(result).toEqual([]);
    });

    it('should aggregate multiple cells correctly', async () => {
      mockDataSource.query.mockResolvedValue([
        { h3Index: 'cell1', count: 10 },
        { h3Index: 'cell2', count: 25 },
        { h3Index: 'cell3', count: 3 },
      ]);

      const result = await service.getActivityHeatmap({
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_MEDIUM,
      });

      expect(result).toHaveLength(3);
      expect(result.map((c) => c.count)).toEqual([10, 25, 3]);
    });
  });

  describe('getHistoricalHeatmap', () => {
    const startTime = new Date('2024-01-15T00:00:00Z');
    const endTime = new Date('2024-01-15T23:59:59Z');

    it('should query history table with time range', async () => {
      mockDataSource.query.mockResolvedValue([]);
      const params: HistoricalHeatmapParams = {
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_MEDIUM,
        startTime,
        endTime,
      };

      await service.getHistoricalHeatmap(params);

      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
      const [query, queryParams] = mockDataSource.query.mock.calls[0];
      expect(query).toContain('rider_location_history');
      expect(query).toContain('h3_index_medium');
      expect(query).toContain('recorded_at');
      expect(query).toContain('COUNT(DISTINCT rider_id)');
      expect(queryParams).toEqual([
        nairobiBoundingBox.minLat,
        nairobiBoundingBox.maxLat,
        nairobiBoundingBox.minLng,
        nairobiBoundingBox.maxLng,
        startTime,
        endTime,
      ]);
    });

    it('should use correct H3 column for resolution', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.getHistoricalHeatmap({
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_COARSE,
        startTime,
        endTime,
      });

      expect(mockDataSource.query.mock.calls[0][0]).toContain('h3_index_coarse');
    });

    it('should enrich historical cells with geometry', async () => {
      mockDataSource.query.mockResolvedValue([
        { h3Index: '8528342bfffffff', count: 15 },
      ]);

      const result = await service.getHistoricalHeatmap({
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_COARSE,
        startTime,
        endTime,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        h3Index: '8528342bfffffff',
        center: mockCenterPoint,
        count: 15,
        polygon: mockPolygon,
      });
    });

    it('should filter out cells outside bounding box', async () => {
      const outsidePoint: GeoPoint = { latitude: 0, longitude: 0 };
      mockH3Service.h3ToPoint.mockReturnValueOnce(outsidePoint);

      mockDataSource.query.mockResolvedValue([
        { h3Index: 'outside', count: 100 },
      ]);

      const result = await service.getHistoricalHeatmap({
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_MEDIUM,
        startTime,
        endTime,
      });

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no historical data', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getHistoricalHeatmap({
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_FINE,
        startTime,
        endTime,
      });

      expect(result).toEqual([]);
    });
  });

  describe('resolution column mapping', () => {
    it('should use fine resolution for detailed city views', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.getActivityHeatmap({
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_FINE,
      });

      const query = mockDataSource.query.mock.calls[0][0] as string;
      expect(query).toContain('h3_index_fine');
      expect(query).not.toContain('h3_index_medium');
      expect(query).not.toContain('h3_index_coarse');
    });

    it('should use medium resolution for city-level heatmaps', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.getActivityHeatmap({
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_MEDIUM,
      });

      const query = mockDataSource.query.mock.calls[0][0] as string;
      expect(query).toContain('h3_index_medium');
    });

    it('should use coarse resolution for regional views', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.getActivityHeatmap({
        boundingBox: nairobiBoundingBox,
        resolution: H3_RESOLUTION_COARSE,
      });

      const query = mockDataSource.query.mock.calls[0][0] as string;
      expect(query).toContain('h3_index_coarse');
    });
  });
});
