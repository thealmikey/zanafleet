import { H3Service } from '../../services/h3.service';
import { GeoPoint } from '../../providers/geo-provider.interface';
import {
  H3_RESOLUTION_FINE,
  H3_RESOLUTION_MEDIUM,
  H3_RESOLUTION_COARSE,
} from '../../types/h3.types';
import * as h3 from 'h3-js';

describe('H3Service', () => {
  let service: H3Service;

  const nairobiPoint: GeoPoint = { latitude: -1.2921, longitude: 36.8219 };
  const sfPoint: GeoPoint = { latitude: 37.7749, longitude: -122.4194 };

  beforeEach(() => {
    service = new H3Service();
  });

  describe('pointToH3', () => {
    it('should convert a point to H3 index at resolution 9', () => {
      const h3Index = service.pointToH3(nairobiPoint, 9);

      expect(h3Index).toBeDefined();
      expect(typeof h3Index).toBe('string');
      expect(h3Index.length).toBeGreaterThan(0);
      expect(h3.isValidCell(h3Index)).toBe(true);
    });

    it('should convert a point to H3 index at resolution 7', () => {
      const h3Index = service.pointToH3(nairobiPoint, 7);

      expect(h3.isValidCell(h3Index)).toBe(true);
      expect(h3.getResolution(h3Index)).toBe(7);
    });

    it('should convert a point to H3 index at resolution 5', () => {
      const h3Index = service.pointToH3(sfPoint, 5);

      expect(h3.isValidCell(h3Index)).toBe(true);
      expect(h3.getResolution(h3Index)).toBe(5);
    });

    it('should produce different indices for different resolutions', () => {
      const fine = service.pointToH3(nairobiPoint, H3_RESOLUTION_FINE);
      const medium = service.pointToH3(nairobiPoint, H3_RESOLUTION_MEDIUM);
      const coarse = service.pointToH3(nairobiPoint, H3_RESOLUTION_COARSE);

      expect(fine).not.toBe(medium);
      expect(medium).not.toBe(coarse);
      expect(fine).not.toBe(coarse);
    });

    it('should produce consistent results for the same input', () => {
      const first = service.pointToH3(nairobiPoint, 9);
      const second = service.pointToH3(nairobiPoint, 9);

      expect(first).toBe(second);
    });
  });

  describe('h3ToPoint', () => {
    it('should convert H3 index back to center point', () => {
      const h3Index = service.pointToH3(nairobiPoint, 9);
      const centerPoint = service.h3ToPoint(h3Index);

      expect(centerPoint).toHaveProperty('latitude');
      expect(centerPoint).toHaveProperty('longitude');
      expect(typeof centerPoint.latitude).toBe('number');
      expect(typeof centerPoint.longitude).toBe('number');
    });

    it('should return a point close to the original point', () => {
      const h3Index = service.pointToH3(nairobiPoint, 9);
      const centerPoint = service.h3ToPoint(h3Index);

      expect(Math.abs(centerPoint.latitude - nairobiPoint.latitude)).toBeLessThan(0.01);
      expect(Math.abs(centerPoint.longitude - nairobiPoint.longitude)).toBeLessThan(0.01);
    });

    it('should handle valid H3 index strings', () => {
      const h3Index = service.pointToH3(sfPoint, 7);
      const point = service.h3ToPoint(h3Index);

      expect(point.latitude).toBeCloseTo(sfPoint.latitude, 1);
      expect(point.longitude).toBeCloseTo(sfPoint.longitude, 1);
    });
  });

  describe('getNeighbors', () => {
    it('should return the origin cell for ring size 0', () => {
      const h3Index = service.pointToH3(nairobiPoint, 9);
      const neighbors = service.getNeighbors(h3Index, 0);

      expect(neighbors).toHaveLength(1);
      expect(neighbors[0]).toBe(h3Index);
    });

    it('should return 7 cells for ring size 1 (origin + 6 neighbors)', () => {
      const h3Index = service.pointToH3(nairobiPoint, 9);
      const neighbors = service.getNeighbors(h3Index, 1);

      expect(neighbors).toHaveLength(7);
      expect(neighbors).toContain(h3Index);
    });

    it('should return 19 cells for ring size 2', () => {
      const h3Index = service.pointToH3(nairobiPoint, 9);
      const neighbors = service.getNeighbors(h3Index, 2);

      expect(neighbors).toHaveLength(19);
    });

    it('should return all valid H3 indices', () => {
      const h3Index = service.pointToH3(nairobiPoint, 9);
      const neighbors = service.getNeighbors(h3Index, 1);

      neighbors.forEach((neighbor) => {
        expect(h3.isValidCell(neighbor)).toBe(true);
      });
    });

    it('should return unique cells (no duplicates)', () => {
      const h3Index = service.pointToH3(nairobiPoint, 9);
      const neighbors = service.getNeighbors(h3Index, 2);
      const uniqueNeighbors = [...new Set(neighbors)];

      expect(uniqueNeighbors.length).toBe(neighbors.length);
    });
  });

  describe('pointToMultiResolution', () => {
    it('should return indices at all three resolutions', () => {
      const multiIndex = service.pointToMultiResolution(nairobiPoint);

      expect(multiIndex).toHaveProperty('fine');
      expect(multiIndex).toHaveProperty('medium');
      expect(multiIndex).toHaveProperty('coarse');
    });

    it('should return valid H3 strings at each level', () => {
      const multiIndex = service.pointToMultiResolution(nairobiPoint);

      expect(h3.isValidCell(multiIndex.fine)).toBe(true);
      expect(h3.isValidCell(multiIndex.medium)).toBe(true);
      expect(h3.isValidCell(multiIndex.coarse)).toBe(true);
    });

    it('should return indices at correct resolutions', () => {
      const multiIndex = service.pointToMultiResolution(nairobiPoint);

      expect(h3.getResolution(multiIndex.fine)).toBe(H3_RESOLUTION_FINE);
      expect(h3.getResolution(multiIndex.medium)).toBe(H3_RESOLUTION_MEDIUM);
      expect(h3.getResolution(multiIndex.coarse)).toBe(H3_RESOLUTION_COARSE);
    });

    it('should produce consistent results for the same point', () => {
      const first = service.pointToMultiResolution(nairobiPoint);
      const second = service.pointToMultiResolution(nairobiPoint);

      expect(first.fine).toBe(second.fine);
      expect(first.medium).toBe(second.medium);
      expect(first.coarse).toBe(second.coarse);
    });

    it('should produce different indices for different points', () => {
      const nairobi = service.pointToMultiResolution(nairobiPoint);
      const sf = service.pointToMultiResolution(sfPoint);

      expect(nairobi.fine).not.toBe(sf.fine);
      expect(nairobi.medium).not.toBe(sf.medium);
      expect(nairobi.coarse).not.toBe(sf.coarse);
    });
  });

  describe('h3ToPolygon', () => {
    it('should return an array of GeoPoints for cell boundary', () => {
      const h3Index = service.pointToH3(nairobiPoint, 9);
      const polygon = service.h3ToPolygon(h3Index);

      expect(Array.isArray(polygon)).toBe(true);
      expect(polygon.length).toBeGreaterThan(0);
    });

    it('should return 6 vertices for a hexagon', () => {
      const h3Index = service.pointToH3(nairobiPoint, 9);
      const polygon = service.h3ToPolygon(h3Index);

      expect(polygon.length).toBeGreaterThanOrEqual(5);
      expect(polygon.length).toBeLessThanOrEqual(6);
    });

    it('should return GeoPoints with valid coordinates', () => {
      const h3Index = service.pointToH3(nairobiPoint, 9);
      const polygon = service.h3ToPolygon(h3Index);

      polygon.forEach((point) => {
        expect(point).toHaveProperty('latitude');
        expect(point).toHaveProperty('longitude');
        expect(typeof point.latitude).toBe('number');
        expect(typeof point.longitude).toBe('number');
        expect(point.latitude).toBeGreaterThanOrEqual(-90);
        expect(point.latitude).toBeLessThanOrEqual(90);
        expect(point.longitude).toBeGreaterThanOrEqual(-180);
        expect(point.longitude).toBeLessThanOrEqual(180);
      });
    });

    it('should return boundary vertices near the cell center', () => {
      const h3Index = service.pointToH3(nairobiPoint, 9);
      const center = service.h3ToPoint(h3Index);
      const polygon = service.h3ToPolygon(h3Index);

      polygon.forEach((vertex) => {
        const latDiff = Math.abs(vertex.latitude - center.latitude);
        const lngDiff = Math.abs(vertex.longitude - center.longitude);
        expect(latDiff).toBeLessThan(0.01);
        expect(lngDiff).toBeLessThan(0.01);
      });
    });
  });

  describe('resolution constants', () => {
    it('should have correct resolution values', () => {
      expect(H3_RESOLUTION_FINE).toBe(9);
      expect(H3_RESOLUTION_MEDIUM).toBe(7);
      expect(H3_RESOLUTION_COARSE).toBe(5);
    });
  });
});
