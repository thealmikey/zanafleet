import { ApiError } from './signupApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export interface SearchDocument {
  entityId: string;
  entityType: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt: string;
}

export interface SearchResults {
  items: SearchDocument[];
  total: number;
  query: string;
  processingTimeMs: number;
}

export interface SearchParams {
  q?: string;
  type?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'distance' | 'newest';
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined
  );
  if (entries.length === 0) return '';
  return (
    '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  );
}

/**
 * Performs a unified search across the platform.
 */
export async function search(params: SearchParams, token?: string): Promise<SearchResults> {
  const qs = buildQueryString(params as any);
  const response = await fetch(`${API_BASE_URL}/search${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // Response body is not JSON
    }
    throw new ApiError(response.status, response.statusText, body);
  }

  return response.json();
}
