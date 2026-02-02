import {
  ActorType,
  InitiateSignupResponse,
  UpdateStepRequest,
  UpdateStepResponse,
  SignupSession,
  FinalizeSignupResponse,
  Workspace,
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * Structured error class for API failures
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: unknown
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

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

/**
 * Initiate a new sign-up session
 * POST /signup
 */
export async function initiateSignup(
  actorType: ActorType,
  idempotencyKey?: string
): Promise<InitiateSignupResponse> {
  const response = await fetch(`${API_BASE_URL}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ actorType, idempotencyKey }),
  });
  return handleResponse<InitiateSignupResponse>(response);
}

/**
 * Update a step in the sign-up process
 * PATCH /signup/:id
 */
export async function updateStep(
  sessionId: string,
  data: UpdateStepRequest
): Promise<UpdateStepResponse> {
  const response = await fetch(`${API_BASE_URL}/signup/${sessionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<UpdateStepResponse>(response);
}

/**
 * Get the current state of a sign-up session
 * GET /signup/:id
 */
export async function getSession(sessionId: string): Promise<SignupSession> {
  const response = await fetch(`${API_BASE_URL}/signup/${sessionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse<SignupSession>(response);
}

/**
 * Finalize the sign-up process and create the actor
 * POST /signup/:id/finalize
 */
export async function finalizeSignup(sessionId: string): Promise<FinalizeSignupResponse> {
  const response = await fetch(`${API_BASE_URL}/signup/${sessionId}/finalize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse<FinalizeSignupResponse>(response);
}

/**
 * List available workspaces, optionally filtered by type
 * GET /workspaces
 */
export async function listWorkspaces(type?: string): Promise<Workspace[]> {
  const url = type
    ? `${API_BASE_URL}/workspaces?type=${encodeURIComponent(type)}`
    : `${API_BASE_URL}/workspaces`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse<Workspace[]>(response);
}

/**
 * Get allowed workspace types for a given actor type
 * Fetches from backend to centralize the business rule
 * GET /workspaces/allowed-types?actorType=...
 */
export async function getAllowedWorkspaceTypes(actorType: ActorType): Promise<string[]> {
  const response = await fetch(
    `${API_BASE_URL}/workspaces/allowed-types?actorType=${encodeURIComponent(actorType)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  const data = await handleResponse<{ allowedTypes: string[] }>(response);
  return data.allowedTypes;
}
