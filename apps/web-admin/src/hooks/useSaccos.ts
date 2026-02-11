import { useState, useEffect, useCallback } from 'react';
import { saccoApi } from '../services';
import { Sacco, SaccoListResponse, PaginationParams } from '../types';

/**
 * Hook for managing saccos with pagination
 */
export function useSaccos(initialParams: PaginationParams = { page: 1, limit: 20 }) {
  const [saccos, setSaccos] = useState<Sacco[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<PaginationParams>(initialParams);
  const [total, setTotal] = useState<number>(0);

  const fetchSaccos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await saccoApi.getAll(params);
      setSaccos(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch saccos');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchSaccos();
  }, [fetchSaccos]);

  const searchSaccos = useCallback(
    async (query: string): Promise<Sacco[]> => {
      try {
        const response = await saccoApi.getAll({ ...params, page: 1, limit: 50 });
        return response.data.filter(
          (sacco) =>
            sacco.name.toLowerCase().includes(query.toLowerCase()) ||
            sacco.phone.includes(query)
        );
      } catch (err) {
        console.error('Failed to search saccos:', err);
        return [];
      }
    },
    [params]
  );

  const refresh = (): void => {
    fetchSaccos();
  };

  return {
    saccos,
    loading,
    error,
    params,
    total,
    setParams,
    searchSaccos,
    refresh,
  };
}

/**
 * Hook for single sacco operations
 */
export function useSacco(saccoId: string | null) {
  const [sacco, setSacco] = useState<Sacco | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSacco = useCallback(async () => {
    if (!saccoId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await saccoApi.getById(saccoId);
      setSacco(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sacco');
    } finally {
      setLoading(false);
    }
  }, [saccoId]);

  useEffect(() => {
    fetchSacco();
  }, [fetchSacco]);

  return {
    sacco,
    loading,
    error,
    refresh: fetchSacco,
  };
}
