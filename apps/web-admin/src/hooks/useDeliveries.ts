import { useState, useEffect, useCallback } from 'react';
import { deliveryApi } from '../services';
import {
  CreateDeliveryDto,
  UpdateDeliveryDto,
  Delivery,
  DeliveryListResponse,
  DeliveryFilters,
  PaginationParams,
} from '../types';

/**
 * Hook for managing deliveries with pagination and filters
 */
export function useDeliveries(
  initialParams: PaginationParams & DeliveryFilters = { page: 1, limit: 10 }
) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<PaginationParams & DeliveryFilters>(
    initialParams
  );
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await deliveryApi.getAll(params);
      setDeliveries(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const setPage = (page: number): void => {
    setParams((prev: PaginationParams & DeliveryFilters) => ({ ...prev, page }));
  };

  const setFilters = (filters: Partial<DeliveryFilters>): void => {
    setParams((prev: PaginationParams & DeliveryFilters) => ({ ...prev, ...filters, page: 1 }));
  };

  const refresh = () => {
    fetchDeliveries();
  };

  return {
    deliveries,
    loading,
    error,
    params,
    total,
    totalPages,
    setPage,
    setFilters,
    refresh,
  };
}

/**
 * Hook for single delivery operations
 */
export function useDelivery(deliveryId: string | null) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDelivery = useCallback(async () => {
    if (!deliveryId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await deliveryApi.getById(deliveryId);
      setDelivery(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch delivery');
    } finally {
      setLoading(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    fetchDelivery();
  }, [fetchDelivery]);

  const updateDelivery = async (data: UpdateDeliveryDto): Promise<Delivery> => {
    if (!deliveryId) throw new Error('Delivery ID is required');
    const updated = await deliveryApi.update(deliveryId, data);
    setDelivery(updated);
    return updated;
  };

  const assignDelivery = async (): Promise<Delivery> => {
    if (!deliveryId) throw new Error('Delivery ID is required');
    const assigned = await deliveryApi.assign(deliveryId);
    setDelivery(assigned);
    return assigned;
  };

  const manualAssign = async (
    riderId?: string,
    saccoId?: string
  ): Promise<Delivery> => {
    if (!deliveryId) throw new Error('Delivery ID is required');
    const assigned = await deliveryApi.manualAssign(deliveryId, riderId, saccoId);
    setDelivery(assigned);
    return assigned;
  };

  return {
    delivery,
    loading,
    error,
    refresh: fetchDelivery,
    updateDelivery,
    assignDelivery,
    manualAssign,
  };
}

/**
 * Hook for creating deliveries
 */
export function useCreateDelivery() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (data: CreateDeliveryDto): Promise<Delivery> => {
    setLoading(true);
    setError(null);
    try {
      const created = await deliveryApi.create(data);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create delivery';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    create,
    loading,
    error,
  };
}
