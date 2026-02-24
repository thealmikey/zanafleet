import { ApiError } from './signupApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // Response body is not JSON
    }
    throw new ApiError(response.status, response.statusText, body);
  }
  return response.json() as Promise<T>;
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

// ─────────────────────────────────────────────────────────────────────────────
// Geo Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Address {
  formattedAddress: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

export interface RiderCandidate {
  riderId: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  status: string;
}

export interface HeatmapCell {
  lat: number;
  lng: number;
  weight: number;
}

export interface ZoneCluster {
  zoneId: string;
  name: string;
  centerLat: number;
  centerLng: number;
  riderCount: number;
  demandLevel: string;
}

export interface ETAResult {
  durationSeconds: number;
  distanceMeters: number;
}

export interface DistanceResult {
  distanceMeters: number;
  straightLineMeters: number;
}

export interface ServiceAreaContainsResult {
  contains: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Geo API Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface NearbyRidersParams {
  lat: number;
  lng: number;
  radius: number;
  limit?: number;
}

export async function getNearbyRiders(params: NearbyRidersParams): Promise<RiderCandidate[]> {
  const qs = buildQueryString({
    lat: params.lat,
    lng: params.lng,
    radius: params.radius,
    limit: params.limit,
  });
  const response = await fetch(`${API_BASE_URL}/geo/nearby-riders${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse<RiderCandidate[]>(response);
}

export async function searchAddress(query: string): Promise<Address[]> {
  const qs = buildQueryString({ q: query });
  const response = await fetch(`${API_BASE_URL}/geo/search${qs}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<Address[]>(response);
}

export interface HeatmapParams {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  resolution?: number;
}

export async function getHeatmap(params: HeatmapParams): Promise<HeatmapCell[]> {
  const qs = buildQueryString({
    minLat: params.minLat,
    maxLat: params.maxLat,
    minLng: params.minLng,
    maxLng: params.maxLng,
    resolution: params.resolution,
  });
  const response = await fetch(`${API_BASE_URL}/geo/heatmap${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse<HeatmapCell[]>(response);
}

export interface ZonesParams {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export async function getZones(params: ZonesParams): Promise<ZoneCluster[]> {
  const qs = buildQueryString({
    minLat: params.minLat,
    maxLat: params.maxLat,
    minLng: params.minLng,
    maxLng: params.maxLng,
  });
  const response = await fetch(`${API_BASE_URL}/geo/zones${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse<ZoneCluster[]>(response);
}

export interface ETAParams {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

export async function getETA(params: ETAParams): Promise<ETAResult> {
  const qs = buildQueryString({
    originLat: params.originLat,
    originLng: params.originLng,
    destLat: params.destLat,
    destLng: params.destLng,
  });
  const response = await fetch(`${API_BASE_URL}/geo/eta${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse<ETAResult>(response);
}

export interface DistanceParams {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

export async function getDistance(params: DistanceParams): Promise<DistanceResult> {
  const qs = buildQueryString({
    originLat: params.originLat,
    originLng: params.originLng,
    destLat: params.destLat,
    destLng: params.destLng,
  });
  const response = await fetch(`${API_BASE_URL}/geo/distance${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse<DistanceResult>(response);
}

export interface ServiceAreaContainsParams {
  lat: number;
  lng: number;
}

export async function checkServiceAreaContains(
  areaId: string,
  params: ServiceAreaContainsParams
): Promise<ServiceAreaContainsResult> {
  const qs = buildQueryString({
    lat: params.lat,
    lng: params.lng,
  });
  const response = await fetch(
    `${API_BASE_URL}/geo/service-area/${encodeURIComponent(areaId)}/contains${qs}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return handleResponse<ServiceAreaContainsResult>(response);
}
