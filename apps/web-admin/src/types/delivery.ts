/**
 * Delivery Types - TypeScript definitions matching backend DTOs
 */

// Delivery Status Enum
export type DeliveryStatus =
  | 'Requested'
  | 'Assigned'
  | 'InTransit'
  | 'Delivered'
  | 'Failed'
  | 'Cancelled';

// Location Interface
export interface Location {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  postalCode?: string;
}

// Package Details Interface
export interface PackageDetails {
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  description?: string;
}

// Create Delivery DTO (POST /deliveries)
export interface CreateDeliveryDto {
  businessId: string;
  workspaceId: string;
  actorId: string;
  pickupLocationId?: string;
  dropoffLocationId?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  isScheduled?: boolean;
  scheduledPickupTime?: Date;
  scheduledDropoffTime?: Date;
  distanceKm?: number;
  packageDetails?: PackageDetails;
}

// Update Delivery DTO (PATCH /deliveries/:id)
export interface UpdateDeliveryDto {
  assignedRiderId?: string;
  assignedSaccoId?: string;
  status?: DeliveryStatus;
  scheduledPickupTime?: Date;
  scheduledDropoffTime?: Date;
}

// Delivery Response
export interface Delivery {
  id: string;
  businessId: string;
  workspaceId: string;
  actorId: string;
  pickupLocation?: Location;
  dropoffLocation?: Location;
  pickupAddress?: string;
  dropoffAddress?: string;
  assignedRiderId?: string;
  assignedSaccoId?: string;
  status: DeliveryStatus;
  isScheduled: boolean;
  scheduledPickupTime?: Date;
  scheduledDropoffTime?: Date;
  distanceKm?: number;
  packageDetails?: PackageDetails;
  createdAt: Date;
  updatedAt: Date;
}

// Pagination Params
export interface PaginationParams {
  page: number;
  limit: number;
}

// Delivery List Response
export interface DeliveryListResponse {
  data: Delivery[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Delivery Filters
export interface DeliveryFilters {
  status?: DeliveryStatus;
  startDate?: Date;
  endDate?: Date;
  assignedRiderId?: string;
  assignedSaccoId?: string;
}

// Rider Interface
export interface Rider {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  saccoId?: string;
  status: 'Available' | 'Busy' | 'Offline';
  rating?: number;
}

// Sacco Interface
export interface Sacco {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  memberCount: number;
  status: 'Active' | 'Inactive';
}

// Rider List Response
export interface RiderListResponse {
  data: Rider[];
  total: number;
}

// Sacco List Response
export interface SaccoListResponse {
  data: Sacco[];
  total: number;
}

// Assignment Request
export interface AssignmentRequest {
  deliveryId: string;
  riderId?: string;
  saccoId?: string;
}

// API Error Response
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
