import { RawQueryParams } from '@api/core/api/utils';
import { OrderStatus, DeliveryStatus } from '@zanafleet/contracts';

/**
 * Query parameter DTOs for admin hierarchy endpoints.
 * These extend RawQueryParams with entity-specific filter parameters.
 */

/**
 * Base query params for hierarchy endpoints
 */
export interface HierarchyQueryDto extends RawQueryParams {
  /** Filter by sacco ID */
  saccoId?: string;
  /** Filter by business ID */
  businessId?: string;
  /** Filter by rider ID */
  riderId?: string;
}

/**
 * Query params for orders endpoint with status filter
 */
export interface OrdersQueryDto extends HierarchyQueryDto {
  /** Filter by order status */
  status?: OrderStatus;
}

/**
 * Query params for deliveries endpoint with status filter
 */
export interface DeliveriesQueryDto extends HierarchyQueryDto {
  /** Filter by delivery status */
  status?: DeliveryStatus;
}
