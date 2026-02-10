import { ApiError } from './signupApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export interface AssistRequest {
  prompt: string;
  context?: string;
}

export interface AssistResponse {
  role: 'assistant';
  content: string;
  createdAt: string;
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

export async function assist(
  prompt: string,
  context?: string,
  token?: string
): Promise<AssistResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const payload: AssistRequest = { prompt };
  if (context) {
    payload.context = context;
  }

  const response = await fetch(`${API_BASE_URL}/ai/assist`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  return handleResponse<AssistResponse>(response);
}
