import {
  BusinessType,
  LocationData,
  VehicleType,
  OrderStatus,
  DeliveryStatus,
} from '@zanafleet/contracts';

/**
 * Response DTOs for admin hierarchy endpoints.
 * These mirror the domain shapes returned by entity toDomain() methods.
 */

/**
 * Business response DTO
 */
export interface BusinessResponseDto {
  businessId: string;
  businessName: string;
  phone: string;
  location: LocationData;
  businessType: BusinessType;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sacco response DTO
 */
export interface SaccoResponseDto {
  saccoId: string;
  name: string;
  location: LocationData;
  contactPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rider response DTO
 */
export interface RiderResponseDto {
  riderId: string;
  fullName: string;
  nationalId: string;
  phone: string;
  location: LocationData;
  vehicleType: VehicleType;
  saccoId: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Order response DTO
 */
export interface OrderResponseDto {
  orderId: string;
  businessId: string;
  deliveryId: string | null;
  itemSummary: string | null;
  itemMetadata: Record<string, unknown> | null;
  customerName: string | null;
  customerPhone: string | null;
  scheduledTime: Date | null;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Delivery response DTO
 */
export interface DeliveryResponseDto {
  deliveryId: string;
  businessId: string;
  pickupLocationId: string | null;
  dropoffLocationId: string | null;
  assignedRiderId: string | null;
  status: DeliveryStatus;
  scheduledPickupTime: Date | null;
  scheduledDropoffTime: Date | null;
  isScheduled: boolean;
  assignedAt: Date | null;
  assignmentNotifiedAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  firstAttemptAt: Date | null;
  lastAttemptAt: Date | null;
  attemptCount: number;
  slaPickupBy: Date | null;
  slaDropoffBy: Date | null;
  slaBreachedAt: Date | null;
  visibilityToken: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pagination metadata
 */
export interface PaginationMetaDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMetaDto;
}
