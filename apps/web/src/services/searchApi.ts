import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export interface SearchDocument {
    entityId: string;
    entityType: string;
    title: string;
    description: string;
    metadata: Record<string, any>;
    location?: {
        latitude: number;
        longitude: number;
    };
    createdAt: string;
}

export interface SearchResults {
    items: SearchDocument[];
    total: number;
    query: string;
    processingTimeMs: number;
}

export interface SearchParams {
    q?: string;
    type?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    limit?: number;
    offset?: number;
    sort?: 'relevance' | 'distance' | 'newest';
}

/**
 * Performs a unified search across the platform.
 */
export async function search(params: SearchParams, token?: string): Promise<SearchResults> {
    const response = await axios.get<SearchResults>(`${API_BASE_URL}/search`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
}
