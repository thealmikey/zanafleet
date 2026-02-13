/**
 * MediaInsight Interface Definitions
 *
 * This module defines the core interfaces for media analysis results
 * in the ZanaFleet Move Intelligence system.
 *
 * @module media-insight
 */

/**
 * Item category enumeration for handling classification.
 * Used to categorize detected items for appropriate handling requirements.
 */
export type ItemCategory =
  | 'furniture' // Tables, chairs, beds, sofas
  | 'appliance' // Fridges, washers, stoves
  | 'fragile' // Glassware, artwork, mirrors
  | 'box' // Packed boxes, containers
  | 'vehicle' // Cars, motorcycles, bicycles
  | 'other'; // Items not fitting other categories

/**
 * Size classification for volume and handling estimation.
 * Used to estimate volume requirements and labor needs.
 */
export type SizeClass =
  | 'small' // Fits in standard box, < 0.5 m³
  | 'medium' // Requires two people, 0.5-2 m³
  | 'large' // Requires special handling, 2-5 m³
  | 'extra-large'; // Requires crane or special equipment, > 5 m³

/**
 * Detected item from media analysis.
 * Represents a single item identified in uploaded photos/videos.
 */
export interface DetectedItem {
  /** Human-readable label for the item, e.g., sofa, fridge, box */
  label: string;

  /** Category classification for handling requirements */
  category: ItemCategory;

  /** Size classification for volume estimation */
  sizeClass: SizeClass;

  /** Number of items of this type detected */
  quantity: number;

  /** Confidence score for this specific detection, 0-1 */
  confidence: number;
}

/**
 * MediaInsight V1 - First version of media analysis result.
 *
 * This structure is:
 * - Serializable to JSON for storage and transmission
 * - Versioned for schema evolution
 * - Storable in snapshot form
 * - NOT attached directly to Order entity
 */
export interface MediaInsightV1 {
  /** Schema version for deserialization and migration */
  readonly schemaVersion: '1.0.0';

  /** Items detected in the analyzed media */
  detectedItems: DetectedItem[];

  /** Total estimated volume in cubic meters */
  estimatedTotalVolumeM3: number;

  /** Labor intensity on 1-5 scale */
  estimatedLaborIntensity: number;

  /** Fragility score from 0-1, where 1 is extremely fragile */
  fragilityScore: number;

  /** Whether special handling is required */
  specialHandlingRequired: boolean;

  /** Overall confidence in the analysis, 0-1 */
  perceptionConfidence: number;

  /** AI model version used for analysis */
  modelVersion: string;

  /** Timestamp when analysis was performed (ISO 8601) */
  analyzedAt: string;

  /** URLs or asset IDs of media that were analyzed */
  mediaReferences: string[];
}

/**
 * Versioned wrapper for MediaInsight supporting schema evolution.
 *
 * The discriminator field 'schemaVersion' enables:
 * - Runtime version detection
 * - Database migration strategies
 * - Backward compatibility
 *
 * Currently points to MediaInsightV1. Will be updated as new versions
 * are introduced.
 */
export type MediaInsight = MediaInsightV1;
