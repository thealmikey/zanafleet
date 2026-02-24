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
// Common Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Dashboard Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemMetrics {
  totalOrders: number;
  totalDeliveries: number;
  totalRevenue: number;
  activeRiders: number;
  periodDays: number;
}

export interface SettlementSummary {
  batchId: string;
  status: string;
  totalAmount: number;
  recipientCount: number;
  createdAt: Date;
  processedAt: Date | null;
}

export interface PolicySummary {
  policyId: string;
  name: string;
  scope: string;
  status: string;
  trigger: string;
  priority: number;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Business Dashboard Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BusinessMetrics {
  totalOrders: number;
  totalDeliveries: number;
  totalSpent: number;
  averageDeliveryTime: number;
  periodDays: number;
}

export interface BusinessOverview {
  monthStart: string;
  monthEnd: string;
  totalDeliveries: number;
  activeDeliveries: number;
  successfulDeliveries: number;
  cancelledDeliveries: number;
  spendThisMonth: number;
  currency: string;
}

export interface BusinessDeliveryRequest {
  pickupLocationId: string;
  dropoffLocationId: string;
  recipientName: string;
  recipientPhone: string;
  itemDescription: string;
  scheduledPickupTime?: string;
  declaredItemValue?: number;
  specialInstructions?: string;
  distanceKm?: number;
}

export interface DeliveryRequestResult {
  deliveryId: string;
  orderId: string;
  estimatedCharges: number;
  currency: string;
  matchingTriggered: boolean;
  assignedRiderId: string | null;
}

export interface OrderSummary {
  orderId: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  createdAt: Date;
}

export interface DeliveryHistorySummary {
  deliveryId: string;
  status: string;
  orderId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  pickupLocationId: string | null;
  dropoffLocationId: string | null;
  assignedRiderId: string | null;
  assignedRiderName: string | null;
  assignedRiderPhone: string | null;
  price: number | null;
  currency: string | null;
  scheduledPickupTime: string | null;
  paymentStatus: string | null;
  itemSummary: string | null;
  createdAt: Date;
}

export interface DeliveryTimelineItem {
  type: string;
  title: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export interface DeliveryDetail {
  deliveryId: string;
  status: string;
  riderId: string | null;
  riderName: string | null;
  riderPhone: string | null;
  scheduledPickupTime: string | null;
  scheduledDropoffTime: string | null;
  eta: string | null;
  paymentStatus: string | null;
  timeline: DeliveryTimelineItem[];
}

export interface InvoiceSummary {
  invoiceId: string;
  status: string;
  grandTotal: number;
  currency: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface BillingSummary {
  currency: string;
  totalSpend: number;
  pendingCharges: number;
  paidDeliveries: number;
  campaignSubsidyDiscounts: number;
  invoiceHistory: InvoiceSummary[];
}

export interface BusinessIdentity {
  businessId: string;
  businessName: string;
}

export interface BusinessDeliveriesQuery extends PaginationParams {
  status?: string;
  from?: string;
  to?: string;
  locationId?: string;
  riderId?: string;
  paymentState?: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED';
  activeOnly?: boolean;
  search?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rider Dashboard Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ActiveDeliverySummary {
  deliveryId: string;
  status: string;
  recipientName: string | null;
  recipientPhone: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedEarnings: number;
  createdAt: Date;
  pickedUpAt: Date | null;
}

export interface EarningsSummary {
  totalEarnings: number;
  pendingPayout: number;
  completedDeliveries: number;
  averagePerDelivery: number;
  periodDays: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Operator Dashboard Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OperatorMetrics {
  activeDeliveries: number;
  pendingAssignments: number;
  availableRiders: number;
  avgAssignmentTime: number;
}

export interface AssignmentQueueItem {
  deliveryId: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  customerName?: string;
  customerPhone?: string;
  priority: number;
  createdAt: Date;
  attempts: number;
}

export interface CandidateInfo {
  riderId: string;
  name: string;
  distance: number;
  eta: number;
  rating: number;
  activeDeliveries: number;
}

export interface RouteHint {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Support Dashboard Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SupportMetrics {
  openDisputes: number;
  escalatedDisputes: number;
  pendingRefunds: number;
  resolvedToday: number;
  periodDays: number;
}

export interface DisputeSummary {
  disputeId: string;
  status: string;
  reason: string;
  amount: number;
  createdAt: Date;
  escalatedAt: Date | null;
}

export interface RefundSummary {
  refundId: string;
  status: string;
  amount: number;
  reason: string;
  createdAt: Date;
  processedAt: Date | null;
}

export interface PaymentActivitySummary {
  paymentIntentId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Dashboard API
// ─────────────────────────────────────────────────────────────────────────────

export async function getAdminMetrics(token: string, periodDays?: number): Promise<SystemMetrics> {
  const qs = buildQueryString({ periodDays });
  const response = await fetch(`${API_BASE_URL}/dashboard/admin/metrics${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<SystemMetrics>(response);
}

export async function getAdminSettlements(
  token: string,
  params?: PaginationParams
): Promise<PaginatedResponse<SettlementSummary>> {
  const qs = buildQueryString({ page: params?.page, limit: params?.limit });
  const response = await fetch(`${API_BASE_URL}/dashboard/admin/settlements${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<PaginatedResponse<SettlementSummary>>(response);
}

export async function getAdminPolicies(
  token: string,
  params?: PaginationParams
): Promise<PaginatedResponse<PolicySummary>> {
  const qs = buildQueryString({ page: params?.page, limit: params?.limit });
  const response = await fetch(`${API_BASE_URL}/dashboard/admin/policies${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<PaginatedResponse<PolicySummary>>(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// Business Dashboard API
// ─────────────────────────────────────────────────────────────────────────────

export async function getBusinessMetrics(
  token: string,
  businessId: string,
  periodDays?: number
): Promise<BusinessMetrics> {
  const qs = buildQueryString({ periodDays });
  const response = await fetch(`${API_BASE_URL}/dashboard/business/${businessId}/metrics${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<BusinessMetrics>(response);
}

export async function getBusinessOrders(
  token: string,
  businessId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<OrderSummary>> {
  const qs = buildQueryString({ page: params?.page, limit: params?.limit });
  const response = await fetch(`${API_BASE_URL}/dashboard/business/${businessId}/orders${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<PaginatedResponse<OrderSummary>>(response);
}

function normalizeMeta(meta: Record<string, unknown>): PaginationMeta {
  return {
    page: Number(meta.page ?? 1),
    limit: Number(meta.limit ?? 10),
    total: Number(meta.total ?? meta.totalItems ?? 0),
    totalPages: Number(meta.totalPages ?? 0),
  };
}

export async function getMyBusinesses(token: string): Promise<BusinessIdentity[]> {
  const response = await fetch(`${API_BASE_URL}/businesses/mine`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await handleResponse<{ data: BusinessIdentity[] }>(response);
  return payload.data;
}

export async function getBusinessOverview(
  token: string,
  businessId: string
): Promise<BusinessOverview> {
  const response = await fetch(`${API_BASE_URL}/businesses/${businessId}/stats/overview`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<BusinessOverview>(response);
}

export async function getBusinessDeliveries(
  token: string,
  businessId: string,
  params?: BusinessDeliveriesQuery
): Promise<PaginatedResponse<DeliveryHistorySummary>> {
  const qs = buildQueryString({
    page: params?.page,
    limit: params?.limit,
    status: params?.status,
    from: params?.from,
    to: params?.to,
    locationId: params?.locationId,
    riderId: params?.riderId,
    paymentState: params?.paymentState,
    activeOnly: params?.activeOnly ? 'true' : undefined,
    search: params?.search,
  });
  const response = await fetch(`${API_BASE_URL}/businesses/${businessId}/deliveries${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await handleResponse<{
    data: DeliveryHistorySummary[];
    meta: Record<string, unknown>;
  }>(response);
  return { data: payload.data, meta: normalizeMeta(payload.meta) };
}

export async function requestBusinessDelivery(
  token: string,
  businessId: string,
  request: BusinessDeliveryRequest
): Promise<DeliveryRequestResult> {
  const response = await fetch(`${API_BASE_URL}/businesses/${businessId}/deliveries/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });
  return handleResponse<DeliveryRequestResult>(response);
}

export async function getBusinessDeliveryDetail(
  token: string,
  businessId: string,
  deliveryId: string
): Promise<DeliveryDetail> {
  const response = await fetch(
    `${API_BASE_URL}/businesses/${businessId}/deliveries/${deliveryId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return handleResponse<DeliveryDetail>(response);
}

export async function getDeliveryTimeline(
  token: string,
  deliveryId: string
): Promise<DeliveryTimelineItem[]> {
  const response = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}/timeline`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await handleResponse<{ data: DeliveryTimelineItem[] }>(response);
  return payload.data;
}

export async function getBusinessBillingSummary(
  token: string,
  businessId: string
): Promise<BillingSummary> {
  const response = await fetch(`${API_BASE_URL}/businesses/${businessId}/billing/summary`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<BillingSummary>(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rider Dashboard API
// ─────────────────────────────────────────────────────────────────────────────

export async function getRiderActiveDeliveries(
  token: string,
  riderId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<ActiveDeliverySummary>> {
  const qs = buildQueryString({ page: params?.page, limit: params?.limit });
  const response = await fetch(
    `${API_BASE_URL}/dashboard/rider/${riderId}/deliveries/active${qs}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return handleResponse<PaginatedResponse<ActiveDeliverySummary>>(response);
}

export async function getRiderDeliveryHistory(
  token: string,
  riderId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<ActiveDeliverySummary>> {
  const qs = buildQueryString({ page: params?.page, limit: params?.limit });
  const response = await fetch(
    `${API_BASE_URL}/dashboard/rider/${riderId}/deliveries/history${qs}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return handleResponse<PaginatedResponse<ActiveDeliverySummary>>(response);
}

export async function getRiderEarnings(
  token: string,
  riderId: string,
  periodDays?: number
): Promise<EarningsSummary> {
  const qs = buildQueryString({ periodDays });
  const response = await fetch(`${API_BASE_URL}/dashboard/rider/${riderId}/earnings${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<EarningsSummary>(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// Operator Dashboard API
// ─────────────────────────────────────────────────────────────────────────────

export async function getOperatorMetrics(token: string): Promise<OperatorMetrics> {
  const response = await fetch(`${API_BASE_URL}/dashboard/operator/metrics`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<OperatorMetrics>(response);
}

export async function getOperatorAssignmentQueue(
  token: string,
  params?: PaginationParams
): Promise<PaginatedResponse<AssignmentQueueItem>> {
  const qs = buildQueryString({ page: params?.page, limit: params?.limit });
  const response = await fetch(`${API_BASE_URL}/dashboard/operator/assignment-queue${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<PaginatedResponse<AssignmentQueueItem>>(response);
}

export interface CandidatesByAreaParams {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
}

export async function getOperatorCandidatesByArea(
  token: string,
  params: CandidatesByAreaParams
): Promise<CandidateInfo[]> {
  const qs = buildQueryString({
    lat: params.lat,
    lng: params.lng,
    radius: params.radius,
    limit: params.limit,
  });
  const response = await fetch(`${API_BASE_URL}/dashboard/operator/candidates${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<CandidateInfo[]>(response);
}

export interface DeliveryCandidatesParams {
  radius?: number;
  limit?: number;
}

export async function getOperatorDeliveryCandidates(
  token: string,
  deliveryId: string,
  params?: DeliveryCandidatesParams
): Promise<CandidateInfo[]> {
  const qs = buildQueryString({ radius: params?.radius, limit: params?.limit });
  const response = await fetch(
    `${API_BASE_URL}/dashboard/operator/deliveries/${deliveryId}/candidates${qs}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return handleResponse<CandidateInfo[]>(response);
}

export interface RouteHintParams {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

export async function getOperatorRouteHint(
  token: string,
  params: RouteHintParams
): Promise<RouteHint> {
  const qs = buildQueryString({
    originLat: params.originLat,
    originLng: params.originLng,
    destLat: params.destLat,
    destLng: params.destLng,
  });
  const response = await fetch(`${API_BASE_URL}/dashboard/operator/route-hint${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<RouteHint>(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// Support Dashboard API
// ─────────────────────────────────────────────────────────────────────────────

export async function getSupportMetrics(
  token: string,
  periodDays?: number
): Promise<SupportMetrics> {
  const qs = buildQueryString({ periodDays });
  const response = await fetch(`${API_BASE_URL}/dashboard/support/metrics${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<SupportMetrics>(response);
}

export async function getSupportDisputes(
  token: string,
  params?: PaginationParams
): Promise<PaginatedResponse<DisputeSummary>> {
  const qs = buildQueryString({ page: params?.page, limit: params?.limit });
  const response = await fetch(`${API_BASE_URL}/dashboard/support/disputes${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<PaginatedResponse<DisputeSummary>>(response);
}

export async function getSupportEscalatedDisputes(
  token: string,
  params?: PaginationParams
): Promise<PaginatedResponse<DisputeSummary>> {
  const qs = buildQueryString({ page: params?.page, limit: params?.limit });
  const response = await fetch(`${API_BASE_URL}/dashboard/support/disputes/escalated${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<PaginatedResponse<DisputeSummary>>(response);
}

export async function getSupportRefunds(
  token: string,
  params?: PaginationParams
): Promise<PaginatedResponse<RefundSummary>> {
  const qs = buildQueryString({ page: params?.page, limit: params?.limit });
  const response = await fetch(`${API_BASE_URL}/dashboard/support/refunds${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<PaginatedResponse<RefundSummary>>(response);
}

export async function getSupportRecentPayments(
  token: string,
  params?: PaginationParams
): Promise<PaginatedResponse<PaymentActivitySummary>> {
  const qs = buildQueryString({ page: params?.page, limit: params?.limit });
  const response = await fetch(`${API_BASE_URL}/dashboard/support/payments/recent${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<PaginatedResponse<PaymentActivitySummary>>(response);
}
