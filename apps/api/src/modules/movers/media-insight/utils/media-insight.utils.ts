/**
 * MediaInsight Utility Functions
 *
 * Utility functions for working with MediaInsight structures,
 * including type guards, serialization, validation, and factory functions.
 *
 * @module media-insight
 */

import type {
  DetectedItem,
  ItemCategory,
  MediaInsight,
  MediaInsightV1,
  SizeClass,
} from '../interfaces';

/**
 * Valid item category values for validation.
 */
const VALID_ITEM_CATEGORIES: readonly ItemCategory[] = [
  'furniture',
  'appliance',
  'fragile',
  'box',
  'vehicle',
  'other',
];

/**
 * Valid size class values for validation.
 */
const VALID_SIZE_CLASSES: readonly SizeClass[] = [
  'small',
  'medium',
  'large',
  'extra-large',
];

/**
 * Type guard for MediaInsightV1.
 * Checks if an unknown value conforms to the MediaInsightV1 interface.
 *
 * @param value - The value to check
 * @returns True if the value is a valid MediaInsightV1
 *
 * @example
 * ```typescript
 * const data = JSON.parse(jsonString);
 * if (isMediaInsightV1(data)) {
 *   // data is now typed as MediaInsightV1
 *   console.log(data.detectedItems);
 * }
 * ```
 */
export function isMediaInsightV1(value: unknown): value is MediaInsightV1 {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as MediaInsightV1).schemaVersion === '1.0.0'
  );
}

/**
 * Serialize MediaInsight to JSON string for storage.
 *
 * @param insight - The MediaInsight object to serialize
 * @returns JSON string representation
 *
 * @example
 * ```typescript
 * const insight: MediaInsight = { ... };
 * const json = serializeMediaInsight(insight);
 * // Store in database or send over network
 * ```
 */
export function serializeMediaInsight(insight: MediaInsight): string {
  return JSON.stringify(insight);
}

/**
 * Deserialize JSON string to MediaInsight.
 * Validates schema version and returns null for invalid data.
 *
 * @param json - The JSON string to deserialize
 * @returns MediaInsight object if valid, null otherwise
 *
 * @example
 * ```typescript
 * const insight = deserializeMediaInsight(storedJson);
 * if (insight) {
 *   // Use the deserialized insight
 * }
 * ```
 */
export function deserializeMediaInsight(json: string): MediaInsight | null {
  try {
    const parsed: unknown = JSON.parse(json);

    if (!isMediaInsightV1(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Create an empty/default MediaInsight structure.
 * Useful for initializing or resetting insight data.
 *
 * @param modelVersion - The model version to use (defaults to 'unknown')
 * @param mediaReferences - Optional array of media references
 * @returns A default MediaInsight with empty detected items
 *
 * @example
 * ```typescript
 * const emptyInsight = createEmptyMediaInsight('gpt-4-vision-preview', ['img1.jpg']);
 * ```
 */
export function createEmptyMediaInsight(
  modelVersion = 'unknown',
  mediaReferences: string[] = []
): MediaInsight {
  return {
    schemaVersion: '1.0.0',
    detectedItems: [],
    estimatedTotalVolumeM3: 0,
    estimatedLaborIntensity: 1,
    fragilityScore: 0,
    specialHandlingRequired: false,
    perceptionConfidence: 0,
    modelVersion,
    analyzedAt: new Date().toISOString(),
    mediaReferences,
  };
}

/**
 * Validate a DetectedItem structure.
 *
 * @param item - The item to validate
 * @returns Object with valid flag and array of error messages
 */
function validateDetectedItem(item: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof item !== 'object' || item === null) {
    return { valid: false, errors: ['DetectedItem must be an object'] };
  }

  const detectedItem = item as Partial<DetectedItem>;

  if (typeof detectedItem.label !== 'string' || detectedItem.label.trim() === '') {
    errors.push('DetectedItem.label must be a non-empty string');
  }

  if (!VALID_ITEM_CATEGORIES.includes(detectedItem.category as ItemCategory)) {
    errors.push(
      `DetectedItem.category must be one of: ${VALID_ITEM_CATEGORIES.join(', ')}`
    );
  }

  if (!VALID_SIZE_CLASSES.includes(detectedItem.sizeClass as SizeClass)) {
    errors.push(
      `DetectedItem.sizeClass must be one of: ${VALID_SIZE_CLASSES.join(', ')}`
    );
  }

  if (typeof detectedItem.quantity !== 'number' || detectedItem.quantity < 1) {
    errors.push('DetectedItem.quantity must be a number >= 1');
  }

  if (
    typeof detectedItem.confidence !== 'number' ||
    detectedItem.confidence < 0 ||
    detectedItem.confidence > 1
  ) {
    errors.push('DetectedItem.confidence must be a number between 0 and 1');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate MediaInsight structure.
 * Performs comprehensive validation of all fields.
 *
 * @param insight - The insight object to validate
 * @returns Object with valid flag and array of error messages
 *
 * @example
 * ```typescript
 * const result = validateMediaInsight(parsedData);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateMediaInsight(insight: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof insight !== 'object' || insight === null) {
    return { valid: false, errors: ['MediaInsight must be an object'] };
  }

  const mediaInsight = insight as Partial<MediaInsight>;

  // Check schema version
  if (mediaInsight.schemaVersion !== '1.0.0') {
    errors.push('MediaInsight.schemaVersion must be "1.0.0"');
  }

  // Validate detectedItems array
  if (!Array.isArray(mediaInsight.detectedItems)) {
    errors.push('MediaInsight.detectedItems must be an array');
  } else {
    mediaInsight.detectedItems.forEach((item, index) => {
      const itemResult = validateDetectedItem(item);
      itemResult.errors.forEach((err) => {
        errors.push(`detectedItems[${index}]: ${err}`);
      });
    });
  }

  // Validate numeric ranges
  if (
    typeof mediaInsight.estimatedTotalVolumeM3 !== 'number' ||
    mediaInsight.estimatedTotalVolumeM3 < 0
  ) {
    errors.push('MediaInsight.estimatedTotalVolumeM3 must be a non-negative number');
  }

  if (
    typeof mediaInsight.estimatedLaborIntensity !== 'number' ||
    mediaInsight.estimatedLaborIntensity < 1 ||
    mediaInsight.estimatedLaborIntensity > 5
  ) {
    errors.push('MediaInsight.estimatedLaborIntensity must be a number between 1 and 5');
  }

  if (
    typeof mediaInsight.fragilityScore !== 'number' ||
    mediaInsight.fragilityScore < 0 ||
    mediaInsight.fragilityScore > 1
  ) {
    errors.push('MediaInsight.fragilityScore must be a number between 0 and 1');
  }

  if (typeof mediaInsight.specialHandlingRequired !== 'boolean') {
    errors.push('MediaInsight.specialHandlingRequired must be a boolean');
  }

  if (
    typeof mediaInsight.perceptionConfidence !== 'number' ||
    mediaInsight.perceptionConfidence < 0 ||
    mediaInsight.perceptionConfidence > 1
  ) {
    errors.push('MediaInsight.perceptionConfidence must be a number between 0 and 1');
  }

  // Validate string fields
  if (typeof mediaInsight.modelVersion !== 'string' || mediaInsight.modelVersion.trim() === '') {
    errors.push('MediaInsight.modelVersion must be a non-empty string');
  }

  if (typeof mediaInsight.analyzedAt !== 'string') {
    errors.push('MediaInsight.analyzedAt must be a string');
  } else if (isNaN(Date.parse(mediaInsight.analyzedAt))) {
    errors.push('MediaInsight.analyzedAt must be a valid ISO 8601 timestamp');
  }

  // Validate mediaReferences
  if (!Array.isArray(mediaInsight.mediaReferences)) {
    errors.push('MediaInsight.mediaReferences must be an array');
  } else {
    mediaInsight.mediaReferences.forEach((ref, index) => {
      if (typeof ref !== 'string') {
        errors.push(`MediaInsight.mediaReferences[${index}] must be a string`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}
