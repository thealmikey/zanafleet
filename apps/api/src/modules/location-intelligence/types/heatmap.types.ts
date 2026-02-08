import { GeoPoint } from '../providers/geo-provider.interface';

import {
  H3_RESOLUTION_FINE,
  H3_RESOLUTION_MEDIUM,
  H3_RESOLUTION_COARSE,
} from './h3.types';

/**
 * Bounding box for geographic viewport filtering.
 */
export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Supported H3 resolutions for heatmap aggregation.
 * Maps to pre-computed H3 index columns in the database.
 */
export type H3Resolution =
  | typeof H3_RESOLUTION_FINE
  | typeof H3_RESOLUTION_MEDIUM
  | typeof H3_RESOLUTION_COARSE;

/**
 * Parameters for heatmap queries.
 */
export interface HeatmapParams {
  /** Geographic viewport to filter results */
  boundingBox: BoundingBox;
  /** H3 resolution for aggregation (5=coarse, 7=medium, 9=fine) */
  resolution: H3Resolution;
}

/**
 * Parameters for historical heatmap queries.
 */
export interface HistoricalHeatmapParams extends HeatmapParams {
  /** Start of time range (inclusive) */
  startTime: Date;
  /** End of time range (inclusive) */
  endTime: Date;
}

/**
 * A single cell in the heatmap with aggregated rider count.
 */
export interface HeatmapCell {
  /** H3 index string identifying the cell */
  h3Index: string;
  /** Center point of the H3 cell */
  center: GeoPoint;
  /** Number of riders in this cell */
  count: number;
  /** Polygon vertices for rendering the cell boundary */
  polygon: GeoPoint[];
}
