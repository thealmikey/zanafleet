import { Injectable } from '@nestjs/common';
import * as h3 from 'h3-js';

import { GeoPoint } from '../providers/geo-provider.interface';
import {
  H3MultiIndex,
  H3_RESOLUTION_FINE,
  H3_RESOLUTION_MEDIUM,
  H3_RESOLUTION_COARSE,
} from '../types/h3.types';

/**
 * Service for H3 hexagonal spatial indexing operations.
 * Wraps the h3-js library to provide efficient spatial queries and heatmap generation.
 */
@Injectable()
export class H3Service {
  /**
   * Convert a geographic point to an H3 index at the specified resolution.
   * @param point - The geographic point with latitude and longitude
   * @param resolution - H3 resolution (0-15), higher = smaller hexagons
   * @returns The H3 index string
   */
  pointToH3(point: GeoPoint, resolution: number): string {
    return h3.latLngToCell(point.latitude, point.longitude, resolution);
  }

  /**
   * Get the center point of an H3 cell.
   * @param h3Index - The H3 index string
   * @returns The center point as a GeoPoint
   */
  h3ToPoint(h3Index: string): GeoPoint {
    const [latitude, longitude] = h3.cellToLatLng(h3Index);
    return { latitude, longitude };
  }

  /**
   * Get all H3 cells within a k-ring distance from the origin cell.
   * @param h3Index - The origin H3 index
   * @param ringSize - The number of rings (k) to include
   * @returns Array of H3 index strings including the origin
   */
  getNeighbors(h3Index: string, ringSize: number): string[] {
    return h3.gridDisk(h3Index, ringSize);
  }

  /**
   * Convert a geographic point to H3 indices at multiple resolutions.
   * Pre-computing multi-resolution indices on write enables fast queries at different zoom levels.
   * @param point - The geographic point
   * @returns H3 indices at fine (9), medium (7), and coarse (5) resolutions
   */
  pointToMultiResolution(point: GeoPoint): H3MultiIndex {
    return {
      fine: this.pointToH3(point, H3_RESOLUTION_FINE),
      medium: this.pointToH3(point, H3_RESOLUTION_MEDIUM),
      coarse: this.pointToH3(point, H3_RESOLUTION_COARSE),
    };
  }

  /**
   * Get the boundary polygon of an H3 cell for visualization.
   * @param h3Index - The H3 index string
   * @returns Array of GeoPoints representing the cell boundary vertices
   */
  h3ToPolygon(h3Index: string): GeoPoint[] {
    const boundary = h3.cellToBoundary(h3Index);
    return boundary.map(([latitude, longitude]: [number, number]) => ({
      latitude,
      longitude,
    }));
  }
}
