import { http, HttpResponse } from 'msw';
import type { HttpHandler } from 'msw';
import { TEST_ACCOUNTS, TEST_PASSWORD } from '@zanafleet/contracts';

import {
  ActorType,
  SignUpSessionStatus,
  type SignupSession,
  type UpdateStepRequest,
  type UpdateStepResponse,
  type FinalizeSignupResponse,
  type LoginResponse,
  type User,
} from '../types';
import type { PaginationMeta } from '../services/dashboardApi';
import * as adminFixtures from './fixtures/admin';
import * as businessFixtures from './fixtures/business';
import * as riderFixtures from './fixtures/rider';
import * as operatorFixtures from './fixtures/operator';
import * as supportFixtures from './fixtures/support';
import * as geoFixtures from './fixtures/geo';

function nowIso(): string {
  return new Date().toISOString();
}

function futureIso(minutesFromNow: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutesFromNow);
  return d.toISOString();
}

function createId(prefix: string): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}_${id}`;
}

const SESSION_TTL_MINUTES = 60 * 24;

// In-memory session store
const sessions = new Map<string, SignupSession>();

// Lookup helper for test accounts
export function getTestAccountByEmail(email: string): (typeof TEST_ACCOUNTS)[number] | null {
  const search = email?.trim().toLowerCase() ?? '';
  const acc = TEST_ACCOUNTS.find((a) => a.email.toLowerCase() === search);
  return acc ?? null;
}

export function getTestAccounts(): typeof TEST_ACCOUNTS {
  return TEST_ACCOUNTS;
}

export function createMockToken(prefix = 'token'): string {
  return createId(prefix);
}

// Simple in-memory auth token and user
let currentToken: string | null = null;
let currentUser: User = {
  id: 'user_1',
  email: 'test@example.com',
  name: 'Test User',
  roles: ['user'],
};

// In-memory user settings store
interface MockUserSettings {
  availability: boolean;
  workingHours: {
    start: string;
    end: string;
  };
  businessLocations?: string[];
  riderVehicleInfo?: {
    type: string;
    licensePlate: string;
  };
}

function createDefaultSettings(): MockUserSettings {
  return {
    availability: true,
    workingHours: {
      start: '09:00',
      end: '17:00',
    },
    businessLocations: ['Main Office'],
    riderVehicleInfo: {
      type: 'Motorcycle',
      licensePlate: 'KAA 123B',
    },
  };
}

let userSettings: MockUserSettings = createDefaultSettings();

// In-memory notifications store
interface MockNotification {
  id: string;
  title: string;
  message?: string;
  createdAt: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
}

function createSeededNotifications(): MockNotification[] {
  const now = Date.now();
  return [
    {
      id: 'notif_1',
      title: 'Welcome to ZanaFleet',
      message: 'Your account has been successfully created.',
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
      type: 'success',
      read: true,
    },
    {
      id: 'notif_2',
      title: 'New delivery assigned',
      message: 'You have a new delivery request waiting for pickup.',
      createdAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
      type: 'info',
      read: false,
    },
    {
      id: 'notif_3',
      title: 'Payment received',
      message: 'KES 1,500 has been credited to your wallet.',
      createdAt: new Date(now - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      type: 'success',
      read: false,
    },
    {
      id: 'notif_4',
      title: 'Document expiring soon',
      message: 'Your vehicle insurance expires in 7 days. Please renew.',
      createdAt: new Date(now - 1000 * 60 * 15).toISOString(), // 15 minutes ago
      type: 'warning',
      read: false,
    },
    {
      id: 'notif_5',
      title: 'Delivery cancelled',
      message: 'Order #12345 was cancelled by the customer.',
      createdAt: new Date(now - 1000 * 60 * 5).toISOString(), // 5 minutes ago
      type: 'error',
      read: false,
    },
  ];
}

let notifications: MockNotification[] = createSeededNotifications();

// Pagination helper
function createPaginationMeta<T>(
  data: T[],
  page: number,
  limit: number
): { paginatedData: T[]; meta: PaginationMeta } {
  const total = data.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginatedData = data.slice(start, start + limit);
  return {
    paginatedData,
    meta: { page, limit, total, totalPages },
  };
}

function parseQueryParams(url: URL): { page: number; limit: number; periodDays: number } {
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') ?? '20', 10)));
  const periodDays = parseInt(url.searchParams.get('periodDays') ?? '30', 10);
  return { page, limit, periodDays };
}

function createEmptySession(sessionId: string, actorType: ActorType): SignupSession {
  const now = nowIso();
  return {
    sessionId,
    status: SignUpSessionStatus.INITIATED,
    actorType,
    completedSteps: [],
    expiresAt: futureIso(SESSION_TTL_MINUTES),
    createdAt: now,
    updatedAt: now,
    fullName: null,
    nationalId: null,
    location: null,
    saccoName: null,
    businessName: null,
    email: null,
    phone: null,
  };
}

function applyUpdate(session: SignupSession, data: UpdateStepRequest): void {
  if (typeof data.fullName !== 'undefined') session.fullName = data.fullName ?? null;
  if (typeof data.nationalId !== 'undefined') session.nationalId = data.nationalId ?? null;
  if (typeof data.location !== 'undefined') session.location = data.location ?? null;
  if (typeof data.saccoName !== 'undefined') session.saccoName = data.saccoName ?? null;
  if (typeof data.businessName !== 'undefined') session.businessName = data.businessName ?? null;
  if (typeof data.email !== 'undefined') session.email = data.email ?? null;
  if (typeof data.phone !== 'undefined') session.phone = data.phone ?? null;

  if (data.stepName) {
    const set = new Set(session.completedSteps);
    set.add(data.stepName);
    session.completedSteps = Array.from(set);
    // If moving to review step, mark pending finalization, else partial
    session.status =
      data.stepName === 'review' ? SignUpSessionStatus.PENDING_FINALIZATION : SignUpSessionStatus.PARTIAL;
  } else if (session.status === SignUpSessionStatus.INITIATED) {
    // Any update without step marks partial progress
    session.status = SignUpSessionStatus.PARTIAL;
  }

  session.updatedAt = nowIso();
}

export function resetMockSessions(): void {
  sessions.clear();
  currentToken = null;
  currentUser = {
    id: 'user_1',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
  };
  notifications = createSeededNotifications();
  userSettings = createDefaultSettings();
}

export function resetMockNotifications(): void {
  notifications = createSeededNotifications();
}

// ─────────────────────────────────────────────────────────────────────────
// In-memory Messages Store
// ─────────────────────────────────────────────────────────────────────────

interface MockThreadMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

interface MockMessageThread {
  id: string;
  subject: string;
  participants: { id: string; name: string }[];
  messages: MockThreadMessage[];
  createdAt: string;
  updatedAt: string;
  read: boolean;
}

function createSeededMessages(): MockMessageThread[] {
  const now = Date.now();
  return [
    {
      id: 'thread_1',
      subject: 'Welcome to ZanaFleet!',
      participants: [
        { id: 'system', name: 'ZanaFleet Support' },
        { id: 'user_1', name: 'Test User' },
      ],
      messages: [
        {
          id: 'msg_1_1',
          threadId: 'thread_1',
          senderId: 'system',
          senderName: 'ZanaFleet Support',
          body: 'Welcome to ZanaFleet! We are excited to have you on board. If you have any questions, feel free to reach out.',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
        },
        {
          id: 'msg_1_2',
          threadId: 'thread_1',
          senderId: 'user_1',
          senderName: 'Test User',
          body: 'Thank you! Looking forward to using the platform.',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
        },
      ],
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
      read: true,
    },
    {
      id: 'thread_2',
      subject: 'Delivery Assignment Update',
      participants: [
        { id: 'operator_1', name: 'Fleet Operator' },
        { id: 'user_1', name: 'Test User' },
      ],
      messages: [
        {
          id: 'msg_2_1',
          threadId: 'thread_2',
          senderId: 'operator_1',
          senderName: 'Fleet Operator',
          body: 'You have been assigned a new delivery route for tomorrow. Please check your dashboard for details.',
          createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
        },
      ],
      createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      read: false,
    },
    {
      id: 'thread_3',
      subject: 'Payment Confirmation',
      participants: [
        { id: 'billing', name: 'Billing Department' },
        { id: 'user_1', name: 'Test User' },
      ],
      messages: [
        {
          id: 'msg_3_1',
          threadId: 'thread_3',
          senderId: 'billing',
          senderName: 'Billing Department',
          body: 'Your payment of KES 5,000 has been processed successfully. Thank you for your business!',
          createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
        },
      ],
      createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 30).toISOString(),
      read: false,
    },
  ];
}

let messageThreads: MockMessageThread[] = createSeededMessages();

export function resetMockMessages(): void {
  messageThreads = createSeededMessages();
}

// Optional: helper to seed a session for debugging
export function seedMockSession(partial?: Partial<SignupSession>): SignupSession {
  const id = partial?.sessionId ?? createId('sess');
  const base = createEmptySession(id, partial?.actorType ?? ActorType.Business);
  const seeded: SignupSession = {
    ...base,
    ...partial,
    sessionId: id,
  };
  sessions.set(id, seeded);
  return seeded;
}

export const handlers: HttpHandler[] = [
  // POST /api/signup
  http.post('/api/signup', async ({ request }) => {
    const body = (await request.json()) as { actorType?: ActorType | null; idempotencyKey?: string };
    const actorType = body.actorType ?? null;

    if (!actorType) {
      return HttpResponse.json(
        { message: 'actorType is required' },
        { status: 400 }
      );
    }

    const sessionId = createId('sess');
    const session = createEmptySession(sessionId, actorType);
    sessions.set(sessionId, session);

    return HttpResponse.json(
      {
        sessionId,
        expiresAt: session.expiresAt,
      },
      { status: 200 }
    );
  }),

  // PATCH /api/signup/:id
  http.patch('/api/signup/:id', async ({ request, params }) => {
    const sessionId = String(params.id ?? '');
    const session = sessions.get(sessionId);

    if (!session) {
      return HttpResponse.json({ message: 'Session not found' }, { status: 404 });
    }

    const data = (await request.json()) as UpdateStepRequest;
    applyUpdate(session, data);

    const response: UpdateStepResponse = {
      sessionId: session.sessionId,
      status: session.status,
      completedSteps: session.completedSteps,
    };

    return HttpResponse.json(response, { status: 200 });
  }),

  // GET /api/signup/:id
  http.get('/api/signup/:id', ({ params }) => {
    const sessionId = String(params.id ?? '');
    const session = sessions.get(sessionId);

    if (!session) {
      return HttpResponse.json({ message: 'Session not found' }, { status: 404 });
    }

    return HttpResponse.json(session, { status: 200 });
  }),

  // POST /api/signup/:id/finalize
  http.post('/api/signup/:id/finalize', ({ params }) => {
    const sessionId = String(params.id ?? '');
    const session = sessions.get(sessionId);

    if (!session) {
      return HttpResponse.json({ message: 'Session not found' }, { status: 404 });
    }

    session.status = SignUpSessionStatus.COMPLETED;
    session.updatedAt = nowIso();

    const result: FinalizeSignupResponse = {
      actorId: createId('actor'),
      workspaceId: createId('ws'),
    };

    return HttpResponse.json(result, { status: 200 });
  }),

  // POST /api/auth/login
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() ?? '';
    const password = body.password ?? '';
    const shouldValidatePassword = typeof body.password !== 'undefined';

    const account = getTestAccountByEmail(email);
    if (!account) {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    if (shouldValidatePassword && password !== TEST_PASSWORD) {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    currentUser = {
      id: account.id,
      email: account.email,
      name: account.username,
      roles: [...account.roles],
    };
    currentToken = createId('token');

    const resp: LoginResponse = {
      user: currentUser,
      token: currentToken,
      expiresAt: futureIso(60 * 4), // 4 hours
    };

    return HttpResponse.json(resp, { status: 200 });
  }),

  // POST /api/auth/logout
  http.post('/api/auth/logout', () => {
    currentToken = null;
    return HttpResponse.json({}, { status: 200 });
  }),

  // GET /api/auth/me
  http.get('/api/auth/me', () => {
    return HttpResponse.json(currentUser, { status: 200 });
  }),

  // GET /api/user/profile
  http.get('/api/user/profile', () => {
    return HttpResponse.json(currentUser, { status: 200 });
  }),

  // PUT /api/user/profile
  http.put('/api/user/profile', async ({ request }) => {
    const body = (await request.json()) as Partial<User>;
    if (typeof body.name === 'string') {
      currentUser.name = body.name;
    }
    if (typeof body.email === 'string') {
      currentUser.email = body.email;
    }
    return HttpResponse.json(currentUser, { status: 200 });
  }),

  // GET /api/user/settings
  http.get('/api/user/settings', () => {
    return HttpResponse.json(userSettings, { status: 200 });
  }),

  // PUT /api/user/settings
  http.put('/api/user/settings', async ({ request }) => {
    const body = (await request.json()) as Partial<MockUserSettings>;
    if (typeof body.availability === 'boolean') {
      userSettings.availability = body.availability;
    }
    if (body.workingHours) {
      userSettings.workingHours = { ...userSettings.workingHours, ...body.workingHours };
    }
    if (body.businessLocations) {
      userSettings.businessLocations = body.businessLocations;
    }
    if (body.riderVehicleInfo) {
      userSettings.riderVehicleInfo = { ...userSettings.riderVehicleInfo, ...body.riderVehicleInfo };
    }
    return HttpResponse.json(userSettings, { status: 200 });
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────────────────────────────────

  // GET /api/notifications
  http.get('/api/notifications', ({ request }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const { paginatedData, meta } = createPaginationMeta(notifications, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  // PATCH /api/notifications/:id/read
  http.patch('/api/notifications/:id/read', ({ params }) => {
    const notificationId = String(params.id ?? '');
    const notification = notifications.find((n) => n.id === notificationId);

    if (!notification) {
      return HttpResponse.json({ message: 'Notification not found' }, { status: 404 });
    }

    notification.read = true;
    return HttpResponse.json(notification, { status: 200 });
  }),

  // PATCH /api/notifications/read-all
  http.patch('/api/notifications/read-all', () => {
    notifications.forEach((n) => {
      n.read = true;
    });
    return HttpResponse.json({ message: 'All notifications marked as read' }, { status: 200 });
  }),

  // POST /api/auth/keycloak/token
  http.post('/api/auth/keycloak/token', () => {
    currentToken = createId('token');

    const resp: LoginResponse = {
      user: currentUser,
      token: currentToken,
      expiresAt: futureIso(60 * 4),
    };

    return HttpResponse.json(resp, { status: 200 });
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Admin Dashboard
  // ─────────────────────────────────────────────────────────────────────────

  http.get('/api/dashboard/admin/metrics', ({ request }) => {
    const url = new URL(request.url);
    const { periodDays } = parseQueryParams(url);
    return HttpResponse.json(adminFixtures.createAdminMetrics(periodDays), { status: 200 });
  }),

  http.get('/api/dashboard/admin/settlements', ({ request }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const settlements = adminFixtures.createSettlements();
    const { paginatedData, meta } = createPaginationMeta(settlements, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  http.get('/api/dashboard/admin/policies', ({ request }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const policies = adminFixtures.createPolicies();
    const { paginatedData, meta } = createPaginationMeta(policies, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Business Dashboard
  // ─────────────────────────────────────────────────────────────────────────

  http.get('/api/dashboard/business/:businessId/metrics', ({ request, params }) => {
    const url = new URL(request.url);
    const { periodDays } = parseQueryParams(url);
    void params.businessId;
    return HttpResponse.json(businessFixtures.createBusinessMetrics(periodDays), { status: 200 });
  }),

  http.get('/api/dashboard/business/:businessId/orders', ({ request, params }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const businessId = String(params.businessId ?? '');
    const orders = businessFixtures.createOrders(businessId);
    const { paginatedData, meta } = createPaginationMeta(orders, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  http.get('/api/dashboard/business/:businessId/deliveries', ({ request, params }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const businessId = String(params.businessId ?? '');
    const deliveries = businessFixtures.createDeliveryHistory(businessId);
    const { paginatedData, meta } = createPaginationMeta(deliveries, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  http.get('/api/dashboard/business/:businessId/invoices', ({ request, params }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const businessId = String(params.businessId ?? '');
    const invoices = businessFixtures.createInvoices(businessId);
    const { paginatedData, meta } = createPaginationMeta(invoices, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Rider Dashboard
  // ─────────────────────────────────────────────────────────────────────────

  http.get('/api/dashboard/rider/:riderId/deliveries/active', ({ request, params }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const riderId = String(params.riderId ?? '');
    const deliveries = riderFixtures.createActiveDeliveries(riderId);
    const { paginatedData, meta } = createPaginationMeta(deliveries, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  http.get('/api/dashboard/rider/:riderId/deliveries/history', ({ request, params }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const riderId = String(params.riderId ?? '');
    const deliveries = riderFixtures.createDeliveryHistory(riderId);
    const { paginatedData, meta } = createPaginationMeta(deliveries, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  http.get('/api/dashboard/rider/:riderId/earnings', ({ request }) => {
    const url = new URL(request.url);
    const { periodDays } = parseQueryParams(url);
    return HttpResponse.json(riderFixtures.createEarningsSummary(periodDays), { status: 200 });
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Operator Dashboard
  // ─────────────────────────────────────────────────────────────────────────

  http.get('/api/dashboard/operator/metrics', () => {
    return HttpResponse.json(operatorFixtures.createOperatorMetrics(), { status: 200 });
  }),

  http.get('/api/dashboard/operator/assignment-queue', ({ request }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const queue = operatorFixtures.createAssignmentQueue();
    const { paginatedData, meta } = createPaginationMeta(queue, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  http.get('/api/dashboard/operator/candidates', ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
    const candidates = operatorFixtures.createCandidates().slice(0, limit);
    return HttpResponse.json(candidates, { status: 200 });
  }),

  http.get('/api/dashboard/operator/route-hint', () => {
    return HttpResponse.json(operatorFixtures.createRouteHint(), { status: 200 });
  }),

  http.get('/api/dashboard/operator/deliveries/:deliveryId/candidates', ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
    const candidates = operatorFixtures.createCandidates().slice(0, limit);
    return HttpResponse.json(candidates, { status: 200 });
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Support Dashboard
  // ─────────────────────────────────────────────────────────────────────────

  http.get('/api/dashboard/support/metrics', ({ request }) => {
    const url = new URL(request.url);
    const { periodDays } = parseQueryParams(url);
    return HttpResponse.json(supportFixtures.createSupportMetrics(periodDays), { status: 200 });
  }),

  http.get('/api/dashboard/support/disputes', ({ request }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const disputes = supportFixtures.createDisputes();
    const { paginatedData, meta } = createPaginationMeta(disputes, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  http.get('/api/dashboard/support/disputes/escalated', ({ request }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const disputes = supportFixtures.createEscalatedDisputes();
    const { paginatedData, meta } = createPaginationMeta(disputes, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  http.get('/api/dashboard/support/refunds', ({ request }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const refunds = supportFixtures.createRefunds();
    const { paginatedData, meta } = createPaginationMeta(refunds, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  http.get('/api/dashboard/support/payments/recent', ({ request }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);
    const payments = supportFixtures.createPaymentActivity();
    const { paginatedData, meta } = createPaginationMeta(payments, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Geo Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  http.get('/api/geo/nearby-riders', ({ request }) => {
    const url = new URL(request.url);
    const lat = parseFloat(url.searchParams.get('lat') ?? '-1.2864');
    const lng = parseFloat(url.searchParams.get('lng') ?? '36.8172');
    const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
    const riders = geoFixtures.createNearbyRiders(lat, lng, limit);
    return HttpResponse.json(riders, { status: 200 });
  }),

  http.get('/api/geo/heatmap', ({ request }) => {
    const url = new URL(request.url);
    const minLat = parseFloat(url.searchParams.get('minLat') ?? '-1.35');
    const maxLat = parseFloat(url.searchParams.get('maxLat') ?? '-1.25');
    const minLng = parseFloat(url.searchParams.get('minLng') ?? '36.75');
    const maxLng = parseFloat(url.searchParams.get('maxLng') ?? '36.85');
    const resolution = parseInt(url.searchParams.get('resolution') ?? '10', 10);
    const cells = geoFixtures.createHeatmapCells(minLat, maxLat, minLng, maxLng, resolution);
    return HttpResponse.json(cells, { status: 200 });
  }),

  http.get('/api/geo/zones', () => {
    const zones = geoFixtures.createZoneClusters();
    return HttpResponse.json(zones, { status: 200 });
  }),

  http.get('/api/geo/eta', ({ request }) => {
    const url = new URL(request.url);
    const originLat = parseFloat(url.searchParams.get('originLat') ?? '0');
    const originLng = parseFloat(url.searchParams.get('originLng') ?? '0');
    const destLat = parseFloat(url.searchParams.get('destLat') ?? '0');
    const destLng = parseFloat(url.searchParams.get('destLng') ?? '0');
    const distance = geoFixtures.createDistanceResult(originLat, originLng, destLat, destLng);
    const eta = geoFixtures.createETAResult(distance.distanceMeters);
    return HttpResponse.json(eta, { status: 200 });
  }),

  http.get('/api/geo/distance', ({ request }) => {
    const url = new URL(request.url);
    const originLat = parseFloat(url.searchParams.get('originLat') ?? '0');
    const originLng = parseFloat(url.searchParams.get('originLng') ?? '0');
    const destLat = parseFloat(url.searchParams.get('destLat') ?? '0');
    const destLng = parseFloat(url.searchParams.get('destLng') ?? '0');
    const distance = geoFixtures.createDistanceResult(originLat, originLng, destLat, destLng);
    return HttpResponse.json(distance, { status: 200 });
  }),

  http.get('/api/geo/service-area/:areaId/contains', ({ request }) => {
    const url = new URL(request.url);
    const lat = parseFloat(url.searchParams.get('lat') ?? '0');
    const lng = parseFloat(url.searchParams.get('lng') ?? '0');
    const inNairobi = lat >= -1.4 && lat <= -1.2 && lng >= 36.7 && lng <= 36.9;
    return HttpResponse.json({ contains: inNairobi }, { status: 200 });
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Messaging
  // ─────────────────────────────────────────────────────────────────────────

  // GET /api/messages - list message threads (inbox)
  http.get('/api/messages', ({ request }) => {
    const url = new URL(request.url);
    const { page, limit } = parseQueryParams(url);

    const previews = messageThreads.map((thread) => {
      const lastMessage = thread.messages[thread.messages.length - 1];
      return {
        id: thread.id,
        subject: thread.subject,
        snippet: lastMessage?.body.slice(0, 100) ?? '',
        senderName: lastMessage?.senderName ?? 'Unknown',
        senderId: lastMessage?.senderId ?? '',
        createdAt: thread.updatedAt,
        read: thread.read,
        replyCount: thread.messages.length,
      };
    });

    // Sort by most recent first
    previews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const { paginatedData, meta } = createPaginationMeta(previews, page, limit);
    return HttpResponse.json({ data: paginatedData, meta }, { status: 200 });
  }),

  // GET /api/messages/:id - get thread details
  http.get('/api/messages/:id', ({ params }) => {
    const threadId = String(params.id ?? '');
    const thread = messageThreads.find((t) => t.id === threadId);

    if (!thread) {
      return HttpResponse.json({ message: 'Thread not found' }, { status: 404 });
    }

    // Mark as read when fetched
    thread.read = true;

    return HttpResponse.json(thread, { status: 200 });
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // AI Assistant
  // ─────────────────────────────────────────────────────────────────────────

  // POST /api/ai/assist
  http.post('/api/ai/assist', async ({ request }) => {
    const body = (await request.json()) as { prompt?: string; context?: string };
    const prompt = body.prompt?.trim() ?? '';

    if (!prompt) {
      return HttpResponse.json({ message: 'Prompt is required' }, { status: 400 });
    }

    // Generate a canned response based on the prompt
    const responses = [
      `I understand you're asking about "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}". Let me help you with that.`,
      `Based on your question, here's what I can tell you about ${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}.`,
      `Great question! Regarding "${prompt.slice(0, 40)}${prompt.length > 40 ? '...' : ''}", here's my response.`,
    ];

    const content = responses[Math.floor(Math.random() * responses.length)] +
      '\n\nThis is a mock AI response. In production, this would be connected to a real AI service. ' +
      'For now, I can confirm your message was received successfully.';

    return HttpResponse.json(
      {
        role: 'assistant',
        content,
        createdAt: nowIso(),
      },
      { status: 200 }
    );
  }),

  // POST /api/messages/:id/reply - add a reply to thread
  http.post('/api/messages/:id/reply', async ({ params, request }) => {
    const threadId = String(params.id ?? '');
    const thread = messageThreads.find((t) => t.id === threadId);

    if (!thread) {
      return HttpResponse.json({ message: 'Thread not found' }, { status: 404 });
    }

    const body = (await request.json()) as { body?: string };
    if (!body.body || typeof body.body !== 'string') {
      return HttpResponse.json({ message: 'Message body is required' }, { status: 400 });
    }

    const newMessage: MockThreadMessage = {
      id: createId('msg'),
      threadId: thread.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      body: body.body,
      createdAt: nowIso(),
    };

    thread.messages.push(newMessage);
    thread.updatedAt = nowIso();

    return HttpResponse.json(thread, { status: 200 });
  }),
];
