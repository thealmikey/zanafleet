/**
 * JobType Response DTOs
 *
 * Defines the API response shapes for JobType endpoints
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { JobTypeMode, JobTypeStatus, MetadataFieldType, Vertical } from './job-type.enums';

/**
 * Assignment Strategy Configuration
 */
export class AssignmentStrategyConfig {
  @ApiProperty({ enum: ['manual', 'auto', 'bidding', 'hybrid'] })
  type!: 'manual' | 'auto' | 'bidding' | 'hybrid';

  @ApiPropertyOptional()
  autoAssignmentRules?: {
    maxDistanceKm?: number;
    maxLoadFactor?: number;
    preferredWorkerTypes?: string[];
    fallbackToBidding?: boolean;
  };

  @ApiPropertyOptional()
  biddingConfig?: {
    biddingWindowMinutes: number;
    minBidders: number;
    visibility: 'all' | 'nearby' | 'preferred';
  };

  @ApiPropertyOptional()
  hybridConfig?: {
    autoThresholdMinutes: number;
    escalateOnThresholdBreach: boolean;
  };
}

/**
 * Pricing Strategy Configuration
 */
export class PricingStrategyConfig {
  @ApiProperty({ enum: ['fixed', 'dynamic', 'hourly', 'distance', 'hybrid'] })
  type!: 'fixed' | 'dynamic' | 'hourly' | 'distance' | 'hybrid';

  @ApiPropertyOptional()
  basePrice?: number;

  @ApiPropertyOptional()
  currency?: string;

  @ApiPropertyOptional()
  distanceRate?: number;

  @ApiPropertyOptional()
  hourlyRate?: number;

  @ApiPropertyOptional()
  surgeMultiplierRules?: {
    timeBased?: { peakHours: string[]; multiplier: number }[];
    demandBased?: { threshold: number; multiplier: number }[];
  };

  @ApiPropertyOptional()
  calculationFormula?: string;
}

/**
 * UI Field Definition
 */
export class UIFieldDefinition {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  required!: boolean;

  @ApiPropertyOptional()
  placeholder?: string;

  @ApiPropertyOptional()
  options?: { value: string; label: string }[];

  @ApiPropertyOptional()
  validation?: Record<string, unknown>;
}

/**
 * UI Layout Section
 */
export class UILayoutSection {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  order!: number;

  @ApiProperty({ type: [UIFieldDefinition] })
  fields!: UIFieldDefinition[];
}

/**
 * UI Layout Configuration
 */
export class UILayoutConfig {
  @ApiPropertyOptional({ type: [UILayoutSection] })
  formSections?: UILayoutSection[];

  @ApiPropertyOptional()
  detailView?: {
    showMap?: boolean;
    showTimeline?: boolean;
    showWorkerList?: boolean;
    showPricingBreakdown?: boolean;
  };

  @ApiPropertyOptional()
  consumerBooking?: {
    enabled: boolean;
    publicUrl?: string;
    requireAuthentication?: boolean;
    allowScheduleFuture?: boolean;
    maxAdvanceBookingDays?: number;
  };
}

/**
 * SLA Rules Configuration
 */
export class SLARulesConfig {
  @ApiPropertyOptional()
  acceptanceDeadlineMinutes?: number;

  @ApiPropertyOptional()
  completionDeadlineMinutes?: number;

  @ApiPropertyOptional()
  arrivalDeadlineMinutes?: number;

  @ApiPropertyOptional()
  escalationRules?: {
    afterMinutes: number;
    notifyRoles: string[];
    action: 'reassign' | 'notify' | 'escalate';
  }[];

  @ApiPropertyOptional()
  penaltyConfig?: {
    latePenaltyAmount?: number;
    latePenaltyType?: 'flat' | 'percentage';
    gracePeriodMinutes?: number;
  };
}

/**
 * Worker Configuration Response
 */
export class JobTypeWorkerConfigResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workerType!: string;

  @ApiProperty()
  minWorkers!: number;

  @ApiPropertyOptional()
  maxWorkers?: number;

  @ApiProperty()
  required!: boolean;

  @ApiPropertyOptional()
  qualifications?: Record<string, unknown>;
}

/**
 * Metadata Field Response
 */
export class JobTypeMetadataFieldResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fieldKey!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: MetadataFieldType })
  fieldType!: MetadataFieldType;

  @ApiProperty()
  required!: boolean;

  @ApiProperty()
  isCustomerEditable!: boolean;

  @ApiPropertyOptional()
  validationRules?: Record<string, unknown>;

  @ApiPropertyOptional()
  displayOrder?: number;

  @ApiPropertyOptional()
  uiConfig?: Record<string, unknown>;
}

/**
 * JobType Response DTO
 */
export class JobTypeResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  workspaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: Vertical })
  vertical!: Vertical;

  @ApiProperty({ enum: JobTypeMode })
  mode!: JobTypeMode;

  @ApiProperty({ enum: JobTypeStatus })
  status!: JobTypeStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  workflowDefinitionId?: string;

  @ApiProperty({ type: AssignmentStrategyConfig })
  assignmentStrategy!: AssignmentStrategyConfig;

  @ApiProperty({ type: PricingStrategyConfig })
  pricingStrategy!: PricingStrategyConfig;

  @ApiProperty({ type: UILayoutConfig })
  uiLayoutConfig!: UILayoutConfig;

  @ApiProperty({ type: SLARulesConfig })
  slaRules!: SLARulesConfig;

  @ApiProperty()
  supportsMultipleWorkers!: boolean;

  @ApiProperty()
  supportsMultipleDestinations!: boolean;

  @ApiPropertyOptional()
  verticalSpecificSettings?: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [JobTypeWorkerConfigResponse] })
  workerConfigs!: JobTypeWorkerConfigResponse[];

  @ApiProperty({ type: [JobTypeMetadataFieldResponse] })
  metadataFields!: JobTypeMetadataFieldResponse[];
}

/**
 * JobType UI Config Response
 * Simplified response for frontend consumption
 */
export class JobTypeUIConfigResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: Vertical })
  vertical!: Vertical;

  @ApiProperty({ enum: JobTypeMode })
  mode!: JobTypeMode;

  @ApiProperty({ type: [JobTypeMetadataFieldResponse] })
  metadataFields!: JobTypeMetadataFieldResponse[];

  @ApiProperty({ type: UILayoutConfig })
  uiLayout!: UILayoutConfig;

  @ApiProperty({ type: [JobTypeWorkerConfigResponse] })
  workerTypes!: JobTypeWorkerConfigResponse[];

  @ApiProperty()
  supportsMultiWorker!: boolean;

  @ApiProperty()
  supportsMultiDestination!: boolean;
}

/**
 * JobType List Response
 */
export class JobTypeListResponse {
  @ApiProperty({ type: [JobTypeResponse] })
  data!: JobTypeResponse[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
