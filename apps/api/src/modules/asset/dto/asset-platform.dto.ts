/**
 * Asset Platform DTOs
 * Centralized data transfer objects for API requests and responses
 */

export enum BundleStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Asset DTOs
export class CreateAssetDto {
  name!: string;
  type!: string;
  ownerId!: string;
  ownerType!: string;
  homeBase?: {
    latitude: number;
    longitude: number;
    label?: string;
  };
  capacity?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  imageIds?: Array<{
    mediaId: string;
    purpose?: 'exterior' | 'interior' | 'cargo' | 'dashboard' | 'custom';
    isPrimary?: boolean;
  }>;
}

export class AssetResponseDto {
  assetId!: string;
  name!: string;
  type!: string;
  status!: string;
  ownerId!: string;
  ownerType!: string;
  homeBase?: {
    latitude: number;
    longitude: number;
    label?: string;
  };
  capacity?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
}

// Bundle DTOs
export class CreateBundleDto {
  name!: string;
  description?: string;
  ownerId!: string;
  startDate!: Date | string;
  endDate!: Date | string;
  budgetAmount?: number;
  metadata?: Record<string, unknown>;
}

export class BundleResponseDto {
  bundleId!: string;
  name!: string;
  description?: string;
  ownerId!: string;
  status!: BundleStatus;
  startDate!: Date;
  endDate!: Date;
  budgetAmount?: number;
  metadata?: Record<string, unknown>;
  tripCount?: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AddTripToBundleDto {
  assetId!: string;
  operatorId!: string;
  startTime!: Date | string;
}

export class UpdateBundleStatusDto {
  status!: BundleStatus;
}

// Trip DTOs
export class CreateTripDto {
  assetId!: string;
  operatorId!: string;
  bundleId?: string;
  startTime!: Date | string;
}

export class TripResponseDto {
  tripId!: string;
  assetId!: string;
  operatorId!: string;
  bundleId?: string;
  startTime!: Date;
  endTime?: Date;
  distanceMeters?: number;
  earnings?: number;
  rating?: number;
  incidents?: Record<string, unknown>[];
  createdAt!: Date;
  updatedAt!: Date;
}

// Matching DTOs
export class MatchAssetsDto {
  input!: string;
}

export class MatchingRequirementsDto {
  suggestedType!: string;
  estimatedVolumeCBM!: number;
  tags!: string[];
  requiredSkills?: string[];
  isBundle?: boolean;
}

export class MatchAssetsResponseDto {
  estimatedRequirements!: MatchingRequirementsDto;
  matches!: AssetResponseDto[];
  bundleSuggested?: boolean;
  message!: string;
}

// Invoice DTOs
export class BundleInvoiceDto {
  bundleId!: string;
  bundleName!: string;
  period!: {
    start: Date;
    end: Date;
  };
  budget?: number;
  actual!: number;
  variance?: number;
  trips!: Array<{
    tripId: string;
    assetName: string;
    operatorId: string;
    startTime: Date;
    endTime?: Date;
    earnings: number;
    status: string;
  }>;
  summary!: {
    totalTrips: number;
    completedTrips: number;
    inProgressTrips: number;
    totalCost: number;
  };
}

// Integration DTOs
export class BatchCreateAssetsDto {
  assets!: CreateAssetDto[];
}

export class BatchOperationResultDto {
  totalSubmitted!: number;
  successCount!: number;
  failureCount!: number;
  results!: Array<{
    index: number;
    assetId?: string;
    success: boolean;
  }>;
  errors!: Array<{
    index: number;
    error: string;
  }>;
}

export class OwnerAnalyticsDto {
  ownerId!: string;
  summary!: {
    totalAssets: number;
    totalBundles: number;
    totalTrips: number;
    assetsByType: Record<string, number>;
  };
  period!: {
    from: string;
    to: string;
  };
}

export class WebhookSubscriptionDto {
  url!: string;
  events!: string[];
  secret?: string;
}

export class AvailabilityRequestDto {
  assetId!: string;
  startDate!: Date | string;
  endDate!: Date | string;
}

export class AvailabilityResponseDto {
  assetId!: string;
  available!: boolean;
  conflicts!: Array<{
    tripId: string;
    startTime: Date;
    endTime?: Date;
  }>;
}

// Image Management DTOs
export class AddAssetImageDto {
  mediaId!: string;
  purpose?: 'exterior' | 'interior' | 'cargo' | 'dashboard' | 'custom';
  isPrimary?: boolean;
}

export class UpdateAssetImageDto {
  purpose?: 'exterior' | 'interior' | 'cargo' | 'dashboard' | 'custom';
  isPrimary?: boolean;
}
