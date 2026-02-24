import { LocationData, VehicleType, BusinessType, DeliveryStatus } from '@zanafleet/contracts';

/**
 * Update DTOs for admin hierarchy endpoints.
 */

export class UpdateBusinessHierarchyDto {
  businessName?: string;
  phone?: string;
  location?: LocationData;
  businessType?: BusinessType;
  email?: string | null;
}

export class UpdateSaccoHierarchyDto {
  name?: string;
  location?: LocationData;
  contactPhone?: string;
}

export class UpdateRiderHierarchyDto {
  fullName?: string;
  nationalId?: string;
  phone?: string;
  location?: LocationData | null;
  vehicleType?: VehicleType;
  saccoId?: string | null;
  email?: string | null;
}

export class UpdateOrderHierarchyDto {
  businessId?: string;
  itemSummary?: string;
  itemMetadata?: Record<string, unknown>;
  customerName?: string;
  customerPhone?: string;
  scheduledTime?: Date;
}

export class UpdateDeliveryHierarchyDto {
  assignedRiderId?: string;
  status?: DeliveryStatus;
  scheduledPickupTime?: Date;
  scheduledDropoffTime?: Date;
}
