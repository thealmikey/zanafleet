import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  CreateDeliveryDto,
  UpdateDeliveryDto,
  Delivery,
  DeliveryListResponse,
  DeliveryFilters,
  PaginationParams,
  Rider,
  RiderListResponse,
  Sacco,
  SaccoListResponse,
  ApiError,
} from '../types';

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const message = error.response?.data?.message || error.message;
    return Promise.reject(new Error(message));
  }
);

// Delivery API
export const deliveryApi = {
  // Create a new delivery order
  async create(data: CreateDeliveryDto): Promise<Delivery> {
    const response = await api.post<Delivery>('/deliveries', data);
    return response.data;
  },

  // Get all deliveries with pagination and filters
  async getAll(
    params: PaginationParams & DeliveryFilters
  ): Promise<DeliveryListResponse> {
    const response = await api.get<DeliveryListResponse>('/deliveries', {
      params,
    });
    return response.data;
  },

  // Get single delivery by ID
  async getById(id: string): Promise<Delivery> {
    const response = await api.get<Delivery>(`/deliveries/${id}`);
    return response.data;
  },

  // Update delivery
  async update(id: string, data: UpdateDeliveryDto): Promise<Delivery> {
    const response = await api.patch<Delivery>(`/deliveries/${id}`, data);
    return response.data;
  },

  // Trigger auto-assignment
  async assign(id: string): Promise<Delivery> {
    const response = await api.post<Delivery>(`/deliveries/${id}/assign`);
    return response.data;
  },

  // Manual assignment (rider or sacco)
  async manualAssign(
    id: string,
    riderId?: string,
    saccoId?: string
  ): Promise<Delivery> {
    const response = await api.post<Delivery>(`/deliveries/${id}/assign`, {
      riderId,
      saccoId,
    });
    return response.data;
  },
};

// Rider API
export const riderApi = {
  // Get all riders
  async getAll(
    params?: PaginationParams & { status?: string }
  ): Promise<RiderListResponse> {
    const response = await api.get<RiderListResponse>('/riders', { params });
    return response.data;
  },

  // Get single rider by ID
  async getById(id: string): Promise<Rider> {
    const response = await api.get<Rider>(`/riders/${id}`);
    return response.data;
  },
};

// Sacco API
export const saccoApi = {
  // Get all saccos
  async getAll(params?: PaginationParams): Promise<SaccoListResponse> {
    const response = await api.get<SaccoListResponse>('/saccos', { params });
    return response.data;
  },

  // Get single sacco by ID
  async getById(id: string): Promise<Sacco> {
    const response = await api.get<Sacco>(`/saccos/${id}`);
    return response.data;
  },
};

// Export individual methods for convenience
export const {
  create: createDelivery,
  getAll: getDeliveries,
  getById: getDelivery,
  update: updateDelivery,
  assign: assignDelivery,
  manualAssign: manualAssignDelivery,
} = deliveryApi;

export const { getAll: getRiders, getById: getRider } = riderApi;
export const { getAll: getSaccos, getById: getSacco } = saccoApi;
