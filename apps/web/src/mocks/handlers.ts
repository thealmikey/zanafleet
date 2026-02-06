import { http, HttpResponse } from 'msw';
import type { HttpHandler } from 'msw';

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

// Simple in-memory auth token and user
let currentToken: string | null = null;
let currentUser: User = {
  id: 'user_1',
  email: 'test@example.com',
  name: 'Test User',
  roles: ['user'],
};

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
    const email = body.email ?? 'test@example.com';

    currentUser = {
      ...currentUser,
      email,
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
  http.get('/api/auth/me', ({ request }) => {
    // Return current user regardless of token by default (can be tightened to 401 if needed)
    // Keeping this permissive avoids unnecessary auth coupling in tests.
    const _authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization');
    // Optionally, could validate token here against currentToken
    return HttpResponse.json(currentUser, { status: 200 });
  }),

  // POST /api/auth/keycloak/token
  http.post('/api/auth/keycloak/token', async ({ request }) => {
    const _body = (await request.json()) as { accessToken?: string };
    currentToken = createId('token');

    const resp: LoginResponse = {
      user: currentUser,
      token: currentToken,
      expiresAt: futureIso(60 * 4),
    };

    return HttpResponse.json(resp, { status: 200 });
  }),
];
