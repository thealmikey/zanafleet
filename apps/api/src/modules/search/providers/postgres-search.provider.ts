import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { SearchDocumentEntity } from '../entities/search-document.entity';
import { SearchDocument, SearchOptions, SearchResults } from '../dto/search.dto';
import { ISearchProvider } from './search-provider.interface';

@Injectable()
export class PostgresSearchProvider implements ISearchProvider {
    private readonly logger = new Logger(PostgresSearchProvider.name);

    constructor(
        @InjectRepository(SearchDocumentEntity)
        private readonly repository: Repository<SearchDocumentEntity>,
    ) { }

    async search(options: SearchOptions): Promise<SearchResults> {
        const startTime = Date.now();
        const { query, entityTypes, workspaceId, limit = 20, offset = 0, location, radiusMeters, sortBy = 'relevance' } = options;

        const qb = this.repository.createQueryBuilder('doc');

        qb.where('doc.workspaceId = :workspaceId', { workspaceId });

        if (entityTypes && entityTypes.length > 0) {
            qb.andWhere('doc.entityType IN (:...entityTypes)', { entityTypes });
        }

        if (query) {
            // Use websearch_to_tsquery for a more user-friendly search experience (supports "quotes", -negation, OR)
            qb.andWhere("doc.tsv @@ websearch_to_tsquery('english', :query)", { query });
        }

        if (location && radiusMeters) {
            qb.andWhere(
                'ST_DWithin(doc.location, ST_SetSRID(ST_Point(:lng, :lat), 4326), :radius)',
                {
                    lng: location.longitude,
                    lat: location.latitude,
                    radius: radiusMeters,
                }
            );
        }

        // Sorting
        if (sortBy === 'distance' && location) {
            qb.addSelect('ST_Distance(doc.location, ST_SetSRID(ST_Point(:lng, :lat), 4326))', 'distance');
            qb.orderBy('distance', 'ASC');
        } else if (sortBy === 'newest') {
            qb.orderBy('doc.createdAt', 'DESC');
        } else if (query) {
            // Sort by rank
            qb.addSelect("ts_rank(doc.tsv, websearch_to_tsquery('english', :query))", 'rank', { query });
            qb.orderBy('rank', 'DESC');
        } else {
            qb.orderBy('doc.createdAt', 'DESC');
        }

        const [items, total] = await qb
            .take(limit)
            .skip(offset)
            .getManyAndCount();

        return {
            items: items.map(this.mapToDto),
            total,
            query: query || '',
            processingTimeMs: Date.now() - startTime,
        };
    }

    async index(document: SearchDocument): Promise<void> {
        const entity = new SearchDocumentEntity();
        entity.id = document.id || `${document.entityType}-${document.entityId}`; // Custom ID generation for stability if needed
        entity.entityId = document.entityId;
        entity.entityType = document.entityType;
        entity.workspaceId = document.workspaceId;
        entity.title = document.title;
        entity.description = document.description;
        entity.metadata = document.metadata;

        if (document.location) {
            entity.location = {
                type: 'Point',
                coordinates: [document.location.longitude, document.location.latitude],
            };
        }

        await this.repository.save(entity);
    }

    async delete(entityId: string, entityType: string): Promise<void> {
        await this.repository.delete({ entityId, entityType });
    }

    async clear(workspaceId: string): Promise<void> {
        await this.repository.delete({ workspaceId });
    }

    private mapToDto(entity: SearchDocumentEntity): SearchDocument {
        return {
            entityId: entity.entityId,
            entityType: entity.entityType,
            workspaceId: entity.workspaceId,
            title: entity.title,
            description: entity.description || '',
            metadata: entity.metadata,
            location: entity.location
                ? {
                    latitude: entity.location.coordinates[1],
                    longitude: entity.location.coordinates[0],
                }
                : undefined,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        };
    }
}
