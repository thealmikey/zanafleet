import { useState, useEffect, useCallback } from 'react';
import { riderApi } from '../services';
import { Rider, RiderListResponse, PaginationParams } from '../types';

/**
 * Hook for managing riders with pagination
 */
export function useRiders(initialParams: PaginationParams = { page: 1, limit: 20 }) {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<PaginationParams>(initialParams);
  const [total, setTotal] = useState<number>(0);

  const fetchRiders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await riderApi.getAll(params);
      setRiders(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch riders');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  const searchRiders = useCallback(
    async (query: string): Promise<Rider[]> => {
      try {
        const response = await riderApi.getAll({ ...params, page: 1, limit: 50 });
        return response.data.filter(
          (rider) =>
            rider.firstName.toLowerCase().includes(query.toLowerCase()) ||
            rider.lastName.toLowerCase().includes(query.toLowerCase()) ||
            rider.phone.includes(query)
        );
      } catch (err) {
        console.error('Failed to search riders:', err);
        return [];
      }
    },
    [params]
  );

  const refresh = (): void => {
    fetchRiders();
  };

  return {
    riders,
    loading,
    error,
    params,
    total,
    setParams,
    searchRiders,
    refresh,
  };
}

/**
 * Hook for single rider operations
 */
export function useRider(riderId: string | null) {
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRider = useCallback(async () => {
    if (!riderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await riderApi.getById(riderId);
      setRider(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rider');
    } finally {
      setLoading(false);
    }
  }, [riderId]);

  useEffect(() => {
    fetchRider();
  }, [fetchRider]);

  return {
    rider,
    loading,
    error,
    refresh: fetchRider,
  };
}
