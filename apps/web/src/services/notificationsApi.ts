import { ApiError } from './signupApi';
import type { NotificationItem } from '../components/common/NotificationList';
import type { PaginationMeta } from './dashboardApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

interface ApiNotification {
  id: string;
  title: string;
  message?: string;
  createdAt: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  read?: boolean;
}

interface GetNotificationsResponse {
  data: ApiNotification[];
  meta: PaginationMeta;
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

function transformNotification(apiNotification: ApiNotification): NotificationItem {
  return {
    id: apiNotification.id,
    title: apiNotification.title,
    message: apiNotification.message,
    createdAt: new Date(apiNotification.createdAt),
    type: apiNotification.type,
    read: apiNotification.read,
  };
}

export async function getNotifications(
  token?: string,
  page = 1,
  limit = 20
): Promise<{ data: NotificationItem[]; meta: PaginationMeta }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(`${API_BASE_URL}/notifications?${params}`, {
    method: 'GET',
    headers,
  });

  const result = await handleResponse<GetNotificationsResponse>(response);
  return {
    data: result.data.map(transformNotification),
    meta: result.meta,
  };
}

export async function markNotificationRead(
  id: string,
  token?: string
): Promise<NotificationItem> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers,
  });

  const result = await handleResponse<ApiNotification>(response);
  return transformNotification(result);
}
