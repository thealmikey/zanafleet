import type { BusinessEntity } from '@api/modules/business/entities/business.entity';
import type { DeliveryEntity } from '@api/modules/delivery/entities/delivery.entity';
import type { OrderEntity } from '@api/modules/order/entities/order.entity';
import type { RiderEntity } from '@api/modules/rider/entities/rider.entity';
import type { SaccoEntity } from '@api/modules/sacco/entities/sacco.entity';

/**
 * Response DTOs for admin hierarchy endpoints.
 * These mirror the domain shapes returned by entity toDomain() methods.
 */

export type BusinessResponseDto = ReturnType<BusinessEntity['toDomain']>;

export type SaccoResponseDto = ReturnType<SaccoEntity['toDomain']>;

export type RiderResponseDto = ReturnType<RiderEntity['toDomain']>;

export type OrderResponseDto = ReturnType<OrderEntity['toDomain']>;

export type DeliveryResponseDto = ReturnType<DeliveryEntity['toDomain']>;

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
