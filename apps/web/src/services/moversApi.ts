import { ApiError } from './signupApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {}
    throw new ApiError(response.status, response.statusText, body);
  }
  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type HouseSize = 'studio' | '1br' | '2br' | '3br' | '4br+';

export interface LocationSuggestion {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  locality?: string;
  region?: string;
  country?: string;
  placeType?: 'address' | 'city' | 'region' | 'country';
}

export interface MovingQuoteRequest {
  movingFrom: LocationSuggestion;
  movingTo: LocationSuggestion;
  currentHouseSize: HouseSize;
  destinationHouseSize: HouseSize;
  preferredDate?: Date;
  accessRestrictions?: string[];
  specialItems?: string[];
  requireElevator?: boolean;
  requirePackingService?: boolean;
}

export interface VehicleRecommendation {
  vehicleType: string;
  vehicleName: string;
  capacity: string;
  recommendedFor: string[];
  estimatedCapacityCubicMeters: number;
  imageUrl?: string;
  features?: string[];
}

export interface AvailableSlot {
  date: Date;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface PricingFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

export interface DurationEstimate {
  minMinutes: number;
  maxMinutes: number;
}

export interface MovingQuote {
  quoteId: string;
  vehicles: VehicleRecommendation[];
  estimatedPrice: PriceRange;
  estimatedDuration: DurationEstimate;
  distanceKilometers: number;
  availableSlots: AvailableSlot[];
  pricingFactors: PricingFactor[];
  validUntil: Date;
  notes?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface LocationSuggestionsParams {
  query: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
}

export async function getLocationSuggestions(
  params: LocationSuggestionsParams
): Promise<LocationSuggestion[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', params.query);
  if (params.latitude) searchParams.set('lat', params.latitude.toString());
  if (params.longitude) searchParams.set('lng', params.longitude.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const response = await fetch(`${API_BASE_URL}/mover/locations/suggestions?${searchParams}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<LocationSuggestion[]>(response);
}

export async function calculateQuote(request: MovingQuoteRequest): Promise<MovingQuote> {
  const response = await fetch(`${API_BASE_URL}/mover/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse<MovingQuote>(response);
}

export async function preAuthorizeQuote(
  quoteId: string,
  estimatedAmount: number
): Promise<{ preAuthId: string; status: string; expiresAt: Date }> {
  const response = await fetch(`${API_BASE_URL}/mover/quote/pre-authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteId, estimatedAmount }),
  });
  return handleResponse(response);
}

// Export all types and functions
export const moversApi = {
  getLocationSuggestions,
  calculateQuote,
  preAuthorizeQuote,
};

export default moversApi;
