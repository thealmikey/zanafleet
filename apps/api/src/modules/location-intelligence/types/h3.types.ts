/**
 * H3 resolution constants for different spatial granularity levels.
 * These define the hexagon sizes used throughout the location intelligence system.
 */

/** Fine resolution (~174m hexagons) - suitable for precise rider positioning */
export const H3_RESOLUTION_FINE = 9;

/** Medium resolution (~1.2km hexagons) - suitable for heatmaps and zone aggregation */
export const H3_RESOLUTION_MEDIUM = 7;

/** Coarse resolution (~8km hexagons) - suitable for regional views */
export const H3_RESOLUTION_COARSE = 5;

/**
 * Multi-resolution H3 index container.
 * Pre-computing indices at multiple resolutions enables fast queries at different zoom levels.
 */
export interface H3MultiIndex {
  /** H3 index at resolution 9 (~174m) */
  fine: string;
  /** H3 index at resolution 7 (~1.2km) */
  medium: string;
  /** H3 index at resolution 5 (~8km) */
  coarse: string;
}
