import {
  UISchema,
  SDUIActionResponse,
  SDUIScreenList,
} from '../types/sdui.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * Get list of available screens
 * GET /api/sdui/screens
 */
export async function listScreens(): Promise<SDUIScreenList> {
  const response = await fetch(`${API_BASE_URL}/sdui/screens`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  const result = await response.json() as { screens: string[] };
  // Map simple screen IDs to title/description format
  const screenTitles: Record<string, string> = {
    'login': 'Sign In',
    'dashboard.admin': 'Admin Dashboard',
    'dashboard.dispatcher': 'Dispatcher Dashboard',
    'dashboard.driver': 'Driver Dashboard',
    'dashboard.business': 'Business Dashboard',
  };
  
  return {
    screens: result.screens.map((id: string) => ({
      id,
      title: screenTitles[id] || id,
      description: `Server-driven ${id} screen`,
    })),
  };
}

/**
 * Get a specific screen schema by ID
 * GET /api/sdui/screens/:screenId
 */
export async function getScreen(screenId: string): Promise<UISchema> {
  const response = await fetch(`${API_BASE_URL}/sdui/screens/${screenId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json() as Promise<UISchema>;
}

/**
 * Execute an action on a screen
 * POST /api/sdui/screens/:screenId/actions/:actionId
 */
export async function executeAction(
  screenId: string,
  actionId: string,
  payload: Record<string, unknown>,
  actorId?: string
): Promise<SDUIActionResponse> {
  const response = await fetch(
    `${API_BASE_URL}/sdui/screens/${screenId}/actions/${actionId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        actorId: actorId || 'anonymous',
        payload,
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json() as Promise<SDUIActionResponse>;
}

/**
 * Get navigation items for a user
 * GET /api/sdui/navigation?actorId=:actorId
 */
export async function getNavigation(actorId: string): Promise<{
  navigation: unknown;
}> {
  const response = await fetch(`${API_BASE_URL}/sdui/navigation?actorId=${actorId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json() as Promise<{ navigation: unknown }>;
}

/**
 * Check SDUI service health
 * GET /api/sdui/health
 */
export async function checkHealth(): Promise<{ status: string; screens: number }> {
  const response = await fetch(`${API_BASE_URL}/sdui/health`, {
    method: 'GET',
  });
  return response.json() as Promise<{ status: string; screens: number }>;
}