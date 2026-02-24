/**
 * JobType Enums
 *
 * Defines all enumerations used by the JobType Registry system:
 * - Vertical: Business domain/vertical
 * - JobTypeMode: Operational mode of the job type
 * - JobTypeStatus: Lifecycle status
 * - MetadataFieldType: Types for metadata fields
 */

/**
 * Vertical Enum
 * Defines the business vertical/domain for job types
 */
export enum Vertical {
  DELIVERY = 'delivery',
  MOVING = 'moving',
  WHOLESALE = 'wholesale',
  FLEET = 'fleet',
  MARKETPLACE = 'marketplace',
}

/**
 * JobType Mode Enum
 * Defines the operational mode of the job type
 */
export enum JobTypeMode {
  INTERNAL = 'internal',
  MARKETPLACE = 'marketplace',
  CONSUMER = 'consumer',
}

/**
 * JobType Status Enum
 * Defines the lifecycle status of a job type
 */
export enum JobTypeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
}

/**
 * Metadata Field Type Enum
 * Defines the available types for metadata fields
 */
export enum MetadataFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  FILE = 'file',
  LOCATION = 'location',
  ADDRESS = 'address',
  PHONE = 'phone',
  EMAIL = 'email',
}

/**
 * Assignment Strategy Types
 */
export enum AssignmentStrategyType {
  MANUAL = 'manual',
  AUTO = 'auto',
  BIDDING = 'bidding',
  HYBRID = 'hybrid',
}

/**
 * Pricing Strategy Types
 */
export enum PricingStrategyType {
  FIXED = 'fixed',
  DYNAMIC = 'dynamic',
  HOURLY = 'hourly',
  DISTANCE = 'distance',
  HYBRID = 'hybrid',
}
