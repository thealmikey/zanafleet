import { ApiError } from './signupApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export interface WorkingHours {
  start: string;
  end: string;
}

export interface MediaReference {
  mediaAssetId?: string;
  url?: string;
}

export interface VehiclePhoto extends MediaReference {
  caption?: string;
}

export interface VehicleInfo {
  type: string;
  make?: string;
  model?: string;
  year?: string;
  color?: string;
  licensePlate?: string;
  photos?: VehiclePhoto[];
}

export interface DocumentsInfo {
  nationalId?: MediaReference;
  driversLicense?: MediaReference;
}

export interface UserSettings {
  availability: boolean;
  workingHours: WorkingHours;
  businessLocations?: string[];
  riderVehicleInfo?: {
    type: string;
    licensePlate: string;
  };
  profileImage?: MediaReference | null;
  vehicle?: VehicleInfo | null;
  documents?: DocumentsInfo | null;
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

export async function getSettings(token?: string): Promise<UserSettings> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/user/settings`, {
    method: 'GET',
    headers,
  });

  return handleResponse<UserSettings>(response);
}

export async function updateSettings(
  update: Partial<UserSettings>,
  token?: string
): Promise<UserSettings> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/user/settings`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(update),
  });

  return handleResponse<UserSettings>(response);
}
