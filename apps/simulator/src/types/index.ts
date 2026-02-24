/**
 * ZanaFleet Simulator Types
 * Type definitions for API entities and UI state
 */

// User Roles (matching MembershipRole enum)
export type Role = 'ADMIN' | 'OPS' | 'BUSINESS_OWNER' | 'RIDER' | 'CUSTOMER';

// User entity
export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  workspaceId: string;
  avatar?: string;
  token?: string;
  totalEarnings?: number;
}

// Auth context
export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  workspaceId: string;
  token: string | null;
}

// Business entity
export interface Business {
  id: string;
  businessName: string;
  phone: string;
  email?: string;
  businessType: 'RETAIL' | 'RESTAURANT' | 'PHARMACY' | 'GROCERY' | 'ELECTRONICS' | 'OTHER';
  location?: {
    type: string;
    coordinates: [number, number];
    address?: string;
  };
  createdAt?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
}

// Rider entity
export interface Rider {
  id: string;
  fullName: string;
  phone: string;
  nationalId: string;
  email?: string;
  vehicleType: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'BICYCLE' | 'TRUCK';
  saccoId?: string;
  location?: {
    type: string;
    coordinates: [number, number];
    address?: string;
  };
  status?: 'ACTIVE' | 'INACTIVE' | 'BUSY';
  rating?: number;
}

// Order entity
export interface Order {
  id: string;
  businessId: string;
  customerName?: string;
  customerPhone?: string;
  itemSummary?: string;
  itemMetadata?: Record<string, unknown>;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  scheduledTime?: string;
  createdAt?: string;
  totalAmount?: number;
}

// Delivery Status (matching DeliveryStatus enum)
export type DeliveryStatus = 
  | 'Requested' 
  | 'Assigned' 
  | 'PickedUp' 
  | 'InTransit' 
  | 'Delivered' 
  | 'Cancelled';

// Delivery entity
export interface Delivery {
  id: string;
  orderId: string;
  businessId: string;
  riderId?: string;
  status: DeliveryStatus;
  pickupLocation?: Location;
  dropoffLocation?: Location;
  recipientName?: string;
  recipientPhone?: string;
  estimatedCharges?: number;
  actualCharges?: number;
  distanceKm?: number;
  createdAt?: string;
  scheduledPickupTime?: string;
  scheduledDropoffTime?: string;
  actualPickupTime?: string;
  actualDropoffTime?: string;
}

// Location
export interface Location {
  type: string;
  coordinates: [number, number];
  address?: string;
  name?: string;
}

// Customer entity
export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  businessId: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderAt?: string;
}

// Workspace
export interface Workspace {
  id: string;
  name: string;
  type: 'BUSINESS' | 'SACCO' | 'MARKET' | 'OPS';
  status: 'ACTIVE' | 'SUSPENDED';
  roleTemplates?: string[];
}

// API Request/Response for Debug Panel
export interface ApiRequest {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  body?: Record<string, unknown>;
  headers: Record<string, string>;
  timestamp: string;
  status: 'pending' | 'success' | 'error';
  statusCode?: number;
  duration?: number;
  response?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: unknown;
  status: number;
}

// Dashboard Stats
export interface DashboardStats {
  totalActiveJobs: number;
  completedJobs: number;
  totalRiders: number;
  activeRiders: number;
  totalBusinesses: number;
  totalEarnings: number;
  slaBreachRate: number;
}

// Seed data
export interface SeedData {
  users: User[];
  workspaces: Workspace[];
  businesses: Business[];
  riders: Rider[];
  customers: Customer[];
  orders: Order[];
  deliveries: Delivery[];
}
