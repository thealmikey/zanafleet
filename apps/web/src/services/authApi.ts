import { User, LoginRequest, LoginResponse } from '../types';

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

/**
 * Login with email and password
 * POST /api/auth/login
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  return handleResponse<LoginResponse>(response);
}

/**
 * Logout the current user
 * POST /api/auth/logout
 */
export async function logout(token?: string): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers,
  });
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // Response body is not JSON
    }
    throw new ApiError(response.status, response.statusText, body);
  }
}

/**
 * Get the current authenticated user
 * GET /api/auth/me
 */
export async function getCurrentUser(token?: string): Promise<User> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers,
  });
  return handleResponse<User>(response);
}

/**
 * Get the current user's profile
 * GET /api/user/profile
 */
export async function getProfile(token?: string): Promise<User> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'GET',
    headers,
  });
  return handleResponse<User>(response);
}

/**
 * Update the current user's profile
 * PUT /api/user/profile
 */
export async function updateProfile(update: Partial<User>, token?: string): Promise<User> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(update),
  });
  return handleResponse<User>(response);
}
