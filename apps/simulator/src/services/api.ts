/**
 * API Service Layer
 * Connects simulator to real ZanaFleet API
 * Logs all requests/responses for debugging
 */

import { ApiRequest, ApiResponse, Role, User } from '../types';

// Default to localhost:9943 (sandbox mode)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9943';
const API_PREFIX = '/api';

// Request history for debug panel
export const requestHistory: ApiRequest[] = [];
const MAX_HISTORY = 50;

// Event listener for debug panel updates
type DebugListener = (requests: ApiRequest[]) => void;
const debugListeners: DebugListener[] = [];

export const addDebugListener = (listener: DebugListener) => {
  debugListeners.push(listener);
  return () => {
    const idx = debugListeners.indexOf(listener);
    if (idx >= 0) debugListeners.splice(idx, 1);
  };
};

const notifyListeners = () => {
  debugListeners.forEach(l => l([...requestHistory]));
};

/**
 * Make authenticated API request with workspace context
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
  options: { workspaceId?: string; token?: string } = {}
): Promise<ApiResponse<T>> {
  const { workspaceId = '00000000-0000-0000-0000-000000000000', token } = options;
  
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;
  const startTime = Date.now();
  
  const request: ApiRequest = {
    id: crypto.randomUUID(),
    method,
    url: endpoint,
    body: body as Record<string, unknown>,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'workspaceId': workspaceId,
    },
    timestamp: new Date().toISOString(),
    status: 'pending',
  };
  
  requestHistory.unshift(request);
  if (requestHistory.length > MAX_HISTORY) requestHistory.pop();
  notifyListeners();
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'workspaceId': workspaceId,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const duration = Date.now() - startTime;
    const responseData = await response.json().catch(() => ({}));
    
    request.status = response.ok ? 'success' : 'error';
    request.statusCode = response.status;
    request.duration = duration;
    request.response = responseData;
    notifyListeners();
    
    return {
      success: response.ok,
      data: response.ok ? responseData : undefined,
      error: response.ok ? undefined : responseData,
      status: response.status,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    request.status = 'error';
    request.statusCode = 0;
    request.duration = duration;
    request.response = { message: (error as Error).message };
    notifyListeners();
    
    return {
      success: false,
      error: { message: (error as Error).message },
      status: 0,
    };
  }
}

// API Methods - Business
export const BusinessApi = {
  create: (data: { businessName: string; phone: string; location: unknown; businessType: string; email?: string }, options: { workspaceId: string; token: string }) =>
    apiRequest<{ id: string }>('/businesses', 'POST', data, options),
  
  getAll: (options: { workspaceId: string; token: string; page?: number; limit?: number }) =>
    apiRequest<{ data: unknown[]; meta: unknown }>(`/businesses?page=${options.page || 1}&limit=${options.limit || 20}`, 'GET', undefined, options),
  
  getById: (id: string, options: { workspaceId: string; token: string }) =>
    apiRequest<unknown>(`/businesses/${id}`, 'GET', undefined, options),
  
  update: (id: string, data: Partial<{ businessName: string; phone: string; location: unknown; businessType: string; email: string }>, options: { workspaceId: string; token: string }) =>
    apiRequest<unknown>(`/businesses/${id}`, 'PATCH', data, options),
  
  delete: (id: string, options: { workspaceId: string; token: string }) =>
    apiRequest<{ deleted: boolean }>(`/businesses/${id}`, 'DELETE', undefined, options),
};

// API Methods - Rider
export const RiderApi = {
  create: (data: { fullName: string; nationalId: string; phone: string; vehicleType: string; saccoId?: string; email?: string; location?: unknown }, options: { workspaceId: string; token: string }) =>
    apiRequest<{ id: string }>('/riders', 'POST', data, options),
  
  getAll: (options: { workspaceId: string; token: string; page?: number; limit?: number }) =>
    apiRequest<{ data: unknown[]; meta: unknown }>(`/riders?page=${options.page || 1}&limit=${options.limit || 20}`, 'GET', undefined, options),
  
  getById: (id: string, options: { workspaceId: string; token: string }) =>
    apiRequest<unknown>(`/riders/${id}`, 'GET', undefined, options),
  
  update: (id: string, data: Partial<{ fullName: string; phone: string; vehicleType: string; location: unknown }>, options: { workspaceId: string; token: string }) =>
    apiRequest<unknown>(`/riders/${id}`, 'PATCH', data, options),
};

// API Methods - Order
export const OrderApi = {
  create: (data: { businessId: string; itemSummary?: string; itemMetadata?: unknown; customerName?: string; customerPhone?: string; scheduledTime?: string }, options: { workspaceId: string; token: string }) =>
    apiRequest<{ id: string }>('/orders', 'POST', data, options),
  
  getAll: (options: { workspaceId: string; token: string; page?: number; limit?: number; search?: string; filter?: string }) => {
    const params = new URLSearchParams({ page: String(options.page || 1), limit: String(options.limit || 20) });
    if (options.search) params.set('search', options.search);
    if (options.filter) params.set('filter', options.filter);
    return apiRequest<{ data: unknown[]; meta: unknown }>(`/orders?${params}`, 'GET', undefined, options);
  },
  
  getById: (id: string, options: { workspaceId: string; token: string }) =>
    apiRequest<unknown>(`/orders/${id}`, 'GET', undefined, options),
};

// API Methods - Delivery
export const DeliveryApi = {
  request: (data: { businessId: string; workspaceId: string; actorId: string; pickup: unknown; dropoff: unknown; recipientName: string; recipientPhone: string; distanceKm?: number }, options: { workspaceId: string; token: string }) =>
    apiRequest<{ deliveryId: string; orderId: string; estimatedCharges: number; assignedRiderId: string | null }>('/deliveries/request', 'POST', data, options),
  
  getAll: (options: { workspaceId: string; token: string; page?: number; limit?: number; filter?: string }) => {
    const params = new URLSearchParams({ page: String(options.page || 1), limit: String(options.limit || 20) });
    if (options.filter) params.set('filter', options.filter);
    return apiRequest<{ data: unknown[]; meta: unknown }>(`/deliveries?${params}`, 'GET', undefined, options);
  },
  
  getById: (id: string, options: { workspaceId: string; token: string }) =>
    apiRequest<unknown>(`/deliveries/${id}`, 'GET', undefined, options),
  
  assignRider: (id: string, options: { workspaceId: string; token: string }) =>
    apiRequest<unknown>(`/deliveries/${id}/assign`, 'POST', undefined, options),
  
  confirmPickup: (id: string, riderId: string, proofData?: unknown, options: { workspaceId: string; token: string }) =>
    apiRequest<unknown>(`/deliveries/${id}/pickup`, 'POST', { riderId, proofData }, options),
  
  confirmDropoff: (id: string, riderId: string, proofData?: unknown, options: { workspaceId: string; token: string }) =>
    apiRequest<unknown>(`/deliveries/${id}/dropoff`, 'POST', { riderId, proofData }, options),
  
  transition: (id: string, targetState: string, triggeredBy?: string, options: { workspaceId: string; token: string }) =>
    apiRequest<unknown>(`/deliveries/${id}/transition`, 'POST', { targetState, triggeredBy }, options),
};

// API Methods - Auth
export const AuthApi = {
  login: async (phone: string, password: string): Promise<ApiResponse<{ actorId: string; workspaceId: string; token: string; type: string; expiresAt: string }>> => {
    // For sandbox mode, return mock token
    // In real mode, would call: return apiRequest('/auth/login', 'POST', { phone, password }, {});
    return {
      success: true,
      data: {
        actorId: 'actor-001',
        workspaceId: '00000000-0000-0000-0000-000000000000',
        token: 'mock-jwt-token-' + Date.now(),
        type: 'ADMIN',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      status: 200,
    };
  },
};

// Clear request history
export const clearRequestHistory = () => {
  requestHistory.length = 0;
  notifyListeners();
};
