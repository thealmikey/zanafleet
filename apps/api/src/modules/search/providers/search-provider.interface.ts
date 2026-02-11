import { SearchOptions, SearchResults, SearchDocument } from '../dto/search.dto';

/**
 * ISearchProvider
 *
 * Provider-agnostic interface for search engine implementations.
 * (Postgres FTS, Elastic, Meilisearch, or Vector DB).
 */
export interface ISearchProvider {
    /**
     * Search for documents based on query and filters.
     */
    search(options: SearchOptions): Promise<SearchResults>;

    /**
     * Index a single document (upsert).
     */
    index(document: SearchDocument): Promise<void>;

    /**
     * Remove a document from the index.
     */
    delete(entityId: string, entityType: string): Promise<void>;

    /**
     * Clear all documents for a workspace (useful for re-indexing).
     */
    clear(workspaceId: string): Promise<void>;
}

export const SEARCH_PROVIDER = 'SEARCH_PROVIDER';
