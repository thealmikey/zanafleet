import { ApiError } from './signupApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export interface CreateMediaAssetInput {
  filename: string;
  mimeType: string;
  size: number;
  ownerId: string;
  ownerType: string;
}

export interface CreateMediaAssetResponse {
  mediaAssetId: string;
  storageKey: string;
}

export interface SignedUrlOptions {
  expiresInSeconds?: number;
  contentType?: string;
}

export interface SignedUrlResponse {
  url: string;
  method: 'GET' | 'PUT';
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

export async function createMediaAsset(
  input: CreateMediaAssetInput,
  token?: string
): Promise<CreateMediaAssetResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/media/assets`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  const result = await handleResponse<{
    mediaAssetId: string;
    storageKey: string;
  }>(response);

  return {
    mediaAssetId: result.mediaAssetId,
    storageKey: result.storageKey,
  };
}

export async function getSignedUrl(
  mediaAssetId: string,
  op: 'GET' | 'PUT',
  opts?: SignedUrlOptions,
  token?: string
): Promise<SignedUrlResponse> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const params = new URLSearchParams({ op });
  if (opts?.expiresInSeconds) {
    params.set('expiresInSeconds', String(opts.expiresInSeconds));
  }
  if (opts?.contentType) {
    params.set('contentType', opts.contentType);
  }

  const response = await fetch(
    `${API_BASE_URL}/media/assets/${encodeURIComponent(mediaAssetId)}/signed-url?${params.toString()}`,
    {
      method: 'GET',
      headers,
    }
  );

  const result = await handleResponse<{
    url: string;
    method: 'GET' | 'PUT';
  }>(response);

  return {
    url: result.url,
    method: result.method,
  };
}

export async function uploadToSignedUrl(
  url: string,
  body: Blob | ArrayBuffer | ArrayBufferView,
  contentType: string
): Promise<void> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body,
  });

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText);
  }
}
