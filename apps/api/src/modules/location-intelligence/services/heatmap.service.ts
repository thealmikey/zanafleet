import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { H3Service } from './h3.service';
import { GeoPoint } from '../providers/geo-provider.interface';
import {
  HeatmapParams,
  HistoricalHeatmapParams,
  HeatmapCell,
  BoundingBox,
  H3Resolution,
} from '../types/heatmap.types';
import {
  H3_RESOLUTION_FINE,
  H3_RESOLUTION_MEDIUM,
  H3_RESOLUTION_COARSE,
} from '../types/h3.types';

/**
 * Service for generating heatmaps from rider location data.
 * Aggregates location data by H3 cells for demand/supply density visualization.
 */
@Injectable()
export class HeatmapService {
  private readonly logger = new Logger(HeatmapService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly h3Service: H3Service,
  ) {}

  /**
   * Get a heatmap of current rider activity aggregated by H3 cells.
   * Queries the snapshot table for the latest rider positions.
   * @param params - Bounding box and resolution for the query
   * @returns Array of heatmap cells with rider counts
   */
  async getActivityHeatmap(params: HeatmapParams): Promise<HeatmapCell[]> {
    const { boundingBox, resolution } = params;
    const h3Column = this.getH3ColumnForResolution(resolution);

    this.logger.debug(
      `Generating activity heatmap: resolution=${resolution}, column=${h3Column}`,
    );

    const rows = await this.dataSource.query<AggregatedCellRow[]>(
      `
      SELECT 
        ${h3Column} as "h3Index",
        COUNT(*)::int as count
      FROM rider_location_snapshots
      WHERE latitude >= $1 AND latitude <= $2
        AND longitude >= $3 AND longitude <= $4
      GROUP BY ${h3Column}
      `,
      [boundingBox.minLat, boundingBox.maxLat, boundingBox.minLng, boundingBox.maxLng],
    );

    return this.enrichCells(rows, boundingBox);
  }

  /**
   * Get a historical heatmap of rider activity within a time range.
   * Queries the history table and aggregates unique rider positions per cell.
   * @param params - Bounding box, resolution, and time range for the query
   * @returns Array of heatmap cells with unique rider counts
   */
  async getHistoricalHeatmap(params: HistoricalHeatmapParams): Promise<HeatmapCell[]> {
    const { boundingBox, resolution, startTime, endTime } = params;
    const h3Column = this.getH3ColumnForResolution(resolution);

    this.logger.debug(
      `Generating historical heatmap: resolution=${resolution}, range=${startTime.toISOString()}-${endTime.toISOString()}`,
    );

    const rows = await this.dataSource.query<AggregatedCellRow[]>(
      `
      SELECT 
        ${h3Column} as "h3Index",
        COUNT(DISTINCT rider_id)::int as count
      FROM rider_location_history
      WHERE latitude >= $1 AND latitude <= $2
        AND longitude >= $3 AND longitude <= $4
        AND recorded_at >= $5 AND recorded_at <= $6
      GROUP BY ${h3Column}
      `,
      [
        boundingBox.minLat,
        boundingBox.maxLat,
        boundingBox.minLng,
        boundingBox.maxLng,
        startTime,
        endTime,
      ],
    );

    return this.enrichCells(rows, boundingBox);
  }

  /**
   * Map H3 resolution to the corresponding pre-computed column name.
   * @param resolution - H3 resolution (5, 7, or 9)
   * @returns Database column name for that resolution
   */
  getH3ColumnForResolution(resolution: H3Resolution): string {
    switch (resolution) {
      case H3_RESOLUTION_FINE:
        return 'h3_index_fine';
      case H3_RESOLUTION_MEDIUM:
        return 'h3_index_medium';
      case H3_RESOLUTION_COARSE:
        return 'h3_index_coarse';
      default:
        throw new Error(`Unsupported H3 resolution: ${resolution}`);
    }
  }

  /**
   * Enrich raw aggregation results with center points and polygons.
   * Filters out cells whose center falls outside the bounding box.
   * @param rows - Raw aggregation query results
   * @param boundingBox - Bounding box for filtering
   * @returns Enriched heatmap cells
   */
  private enrichCells(
    rows: AggregatedCellRow[],
    boundingBox: BoundingBox,
  ): HeatmapCell[] {
    const cells: HeatmapCell[] = [];

    for (const row of rows) {
      const center = this.h3Service.h3ToPoint(row.h3Index);

      if (!this.isPointInBoundingBox(center, boundingBox)) {
        continue;
      }

      const polygon = this.h3Service.h3ToPolygon(row.h3Index);

      cells.push({
        h3Index: row.h3Index,
        center,
        count: row.count,
        polygon,
      });
    }

    return cells;
  }

  /**
   * Check if a point falls within a bounding box.
   * @param point - Geographic point to check
   * @param bbox - Bounding box boundaries
   * @returns True if point is inside the bounding box
   */
  isPointInBoundingBox(point: GeoPoint, bbox: BoundingBox): boolean {
    return (
      point.latitude >= bbox.minLat &&
      point.latitude <= bbox.maxLat &&
      point.longitude >= bbox.minLng &&
      point.longitude <= bbox.maxLng
    );
  }
}

interface AggregatedCellRow {
  h3Index: string;
  count: number;
}
