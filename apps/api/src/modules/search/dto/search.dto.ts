import { GeoPoint } from '@api/core/utils/geo.utils';

/**
 * Universal SearchDocument schema.
 * Represents a single searchable record in the unified index.
 */
export interface SearchDocument {
    id?: string;
    entityId: string;
    entityType: string;
    workspaceId: string;
    title: string;
    description: string;
    metadata: Record<string, any>;
    location?: GeoPoint;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Common search query options.
 */
export interface SearchOptions {
    query?: string;
    entityTypes?: string[];
    workspaceId: string;
    limit?: number;
    offset?: number;
    location?: GeoPoint;
    radiusMeters?: number;
    sortBy?: 'relevance' | 'distance' | 'newest';
}

/**
 * Search results with metadata.
 */
export interface SearchResults {
    items: SearchDocument[];
    total: number;
    query: string;
    processingTimeMs: number;
}
