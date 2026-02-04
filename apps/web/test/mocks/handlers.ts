import { http, HttpResponse } from 'msw';

import {
  ActorType,
  SignUpSessionStatus,
  SignupSession,
  InitiateSignupResponse,
  UpdateStepResponse,
  FinalizeSignupResponse,
} from '../../types';

const API_BASE_URL = '/api';

// In-memory session store for realistic mock behavior
const sessions = new Map<string, SignupSession>();

function createMockSession(
  sessionId: string,
  actorType: ActorType,
  overrides: Partial<SignupSession> = {}
): SignupSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    sessionId,
    status: SignUpSessionStatus.INITIATED,
    actorType,
    fullName: null,
    nationalId: null,
    location: null,
    saccoId: null,
    businessName: null,
    completedSteps: [],
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  };
}

export const handlers = [
  // POST /auth/keycloak/token - Exchange Keycloak token for local JWT
  http.post(`${API_BASE_URL}/auth/keycloak/token`, async ({ request }) => {
    const body = (await request.json()) as { accessToken?: string };

    if (!body.accessToken) {
      return HttpResponse.json(
        { message: 'accessToken is required', statusCode: 400 },
        { status: 400 }
      );
    }

    // Mock successful token exchange
    return HttpResponse.json({
      user: {
        id: crypto.randomUUID(),
        email: 'keycloak-user@example.com',
        name: 'Keycloak User',
        roles: ['user'],
      },
      token: 'mock-local-jwt-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
  }),

  // POST /signup - Initiate a new sign-up session
  http.post(`${API_BASE_URL}/signup`, async ({ request }) => {
    const body = (await request.json()) as { actorType: ActorType; idempotencyKey?: string };

    if (!body.actorType) {
      return HttpResponse.json(
        { message: 'actorType is required', statusCode: 400 },
        { status: 400 }
      );
    }

    const sessionId = crypto.randomUUID();
    const session = createMockSession(sessionId, body.actorType);
    sessions.set(sessionId, session);

    const response: InitiateSignupResponse = {
      sessionId,
      expiresAt: session.expiresAt,
    };

    return HttpResponse.json(response, { status: 201 });
  }),

  // GET /signup/:id - Get session state
  http.get(`${API_BASE_URL}/signup/:id`, ({ params }) => {
    const sessionId = params.id as string;
    const session = sessions.get(sessionId);

    if (!session) {
      return HttpResponse.json({ message: 'Session not found', statusCode: 404 }, { status: 404 });
    }

    return HttpResponse.json(session);
  }),

  // PATCH /signup/:id - Update a step
  http.patch(`${API_BASE_URL}/signup/:id`, async ({ params, request }) => {
    const sessionId = params.id as string;
    const session = sessions.get(sessionId);

    if (!session) {
      return HttpResponse.json({ message: 'Session not found', statusCode: 404 }, { status: 404 });
    }

    const body = (await request.json()) as {
      stepName?: string;
      fullName?: string;
      nationalId?: string;
      location?: string;
      businessName?: string;
      saccoId?: string;
    };

    // Update session fields
    if (body.fullName !== undefined) {
      session.fullName = body.fullName;
    }
    if (body.nationalId !== undefined) {
      session.nationalId = body.nationalId;
    }
    if (body.location !== undefined) {
      session.location = body.location;
    }
    if (body.businessName !== undefined) {
      session.businessName = body.businessName;
    }
    if (body.saccoId !== undefined) {
      session.saccoId = body.saccoId;
    }

    // Track completed steps
    if (body.stepName && !session.completedSteps.includes(body.stepName)) {
      session.completedSteps.push(body.stepName);
    }

    // Transition status
    if (session.status === SignUpSessionStatus.INITIATED) {
      session.status = SignUpSessionStatus.PARTIAL;
    }

    session.updatedAt = new Date().toISOString();
    sessions.set(sessionId, session);

    const response: UpdateStepResponse = {
      sessionId,
      status: session.status,
      completedSteps: session.completedSteps,
    };

    return HttpResponse.json(response);
  }),

  // POST /signup/:id/finalize - Finalize signup
  http.post(`${API_BASE_URL}/signup/:id/finalize`, ({ params }) => {
    const sessionId = params.id as string;
    const session = sessions.get(sessionId);

    if (!session) {
      return HttpResponse.json({ message: 'Session not found', statusCode: 404 }, { status: 404 });
    }

    // Validate required fields are set
    if (!session.fullName || !session.nationalId || !session.location) {
      return HttpResponse.json(
        { message: 'fullName, nationalId, and location are required for finalization', statusCode: 400 },
        { status: 400 }
      );
    }

    session.status = SignUpSessionStatus.COMPLETED;
    sessions.set(sessionId, session);

    const response: FinalizeSignupResponse = {
      actorId: crypto.randomUUID(),
      workspaceId: crypto.randomUUID(),
    };

    return HttpResponse.json(response);
  }),
];

// Helper to reset mock state between tests
export function resetMockSessions(): void {
  sessions.clear();
}

// Helper to seed a session for recovery tests
export function seedMockSession(session: SignupSession): void {
  sessions.set(session.sessionId, session);
}

// Helper to get current session state for assertions
export function getMockSession(sessionId: string): SignupSession | undefined {
  return sessions.get(sessionId);
}
