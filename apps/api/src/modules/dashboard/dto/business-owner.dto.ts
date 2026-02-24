import type { RawQueryParams } from '@api/core/api/utils';
import type { DeliveryStatus } from '@zanafleet/contracts';

export type PaymentStateFilter = 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED';

export interface BusinessOverviewDto {
  monthStart: Date;
  monthEnd: Date;
  totalDeliveries: number;
  activeDeliveries: number;
  successfulDeliveries: number;
  cancelledDeliveries: number;
  spendThisMonth: number;
  currency: string;
}

export interface DeliveryListItemDto {
  deliveryId: string;
  orderId: string | null;
  status: DeliveryStatus;
  customerName: string | null;
  customerPhone: string | null;
  pickupLocationId: string | null;
  dropoffLocationId: string | null;
  assignedRiderId: string | null;
  assignedRiderName: string | null;
  assignedRiderPhone: string | null;
  price: number | null;
  currency: string | null;
  scheduledPickupTime: Date | null;
  createdAt: Date;
  paymentStatus: string | null;
  itemSummary: string | null;
}

export interface DeliveryTimelineItemDto {
  type: string;
  title: string;
  timestamp: Date;
  payload?: Record<string, unknown>;
}

export interface DeliveryDetailDto {
  deliveryId: string;
  status: DeliveryStatus;
  riderId: string | null;
  riderName: string | null;
  riderPhone: string | null;
  scheduledPickupTime: Date | null;
  scheduledDropoffTime: Date | null;
  eta: Date | null;
  paymentStatus: string | null;
  timeline: DeliveryTimelineItemDto[];
}

export interface BillingInvoiceSummaryDto {
  invoiceId: string;
  status: string;
  grandTotal: number;
  currency: string;
  dueDate: Date | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface BillingSummaryDto {
  currency: string;
  totalSpend: number;
  pendingCharges: number;
  paidDeliveries: number;
  campaignSubsidyDiscounts: number;
  invoiceHistory: BillingInvoiceSummaryDto[];
}

export interface BusinessDeliveryRequestDto {
  pickupLocationId: string;
  dropoffLocationId: string;
  recipientName: string;
  recipientPhone: string;
  itemDescription: string;
  scheduledPickupTime?: string;
  declaredItemValue?: number;
  specialInstructions?: string;
  distanceKm?: number;
}

export interface DeliveryRequestResultDto {
  deliveryId: string;
  orderId: string;
  estimatedCharges: number;
  currency: string;
  matchingTriggered: boolean;
  assignedRiderId: string | null;
}

export interface BusinessDeliveriesQueryDto extends RawQueryParams {
  status?: string;
  from?: string;
  to?: string;
  locationId?: string;
  riderId?: string;
  paymentState?: PaymentStateFilter;
  activeOnly?: 'true' | 'false';
}
