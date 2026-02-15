import { CapabilityGuard } from '@api/core/api/guards';
import { Controller, Get, Query, Inject, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { SearchOptions, SearchResults } from '../dto/search.dto';
import { SEARCH_PROVIDER, ISearchProvider } from '../providers/search-provider.interface';

@ApiTags('Search')
@Controller('search')
@UseGuards(CapabilityGuard)
export class SearchController {
    constructor(
        @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Perform a unified search across entities' })
    @ApiQuery({ name: 'q', required: false, description: 'Search query string' })
    @ApiQuery({ name: 'type', required: false, description: 'Comma-separated entity types' })
    @ApiQuery({ name: 'lat', required: false, type: Number })
    @ApiQuery({ name: 'lng', required: false, type: Number })
    @ApiQuery({ name: 'radius', required: false, type: Number, description: 'Radius in meters' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    @ApiQuery({ name: 'sort', required: false, enum: ['relevance', 'distance', 'newest'] })
    async search(
        @Req() req: any,
        @Query('q') q?: string,
        @Query('type') type?: string,
        @Query('lat') lat?: number,
        @Query('lng') lng?: number,
        @Query('radius') radius?: number,
        @Query('limit') limit = 20,
        @Query('offset') offset = 0,
        @Query('sort') sort: 'relevance' | 'distance' | 'newest' = 'relevance',
    ): Promise<SearchResults> {
        const workspaceId = req.user?.workspaceId || req.user?.businessId; // Fallback to businessId if workspaceId not in token

        const options: SearchOptions = {
            query: q,
            entityTypes: type ? type.split(',') : undefined,
            workspaceId: workspaceId || '00000000-0000-0000-0000-000000000000', // Default or fail?
            limit: Number(limit),
            offset: Number(offset),
            sortBy: sort,
        };

        if (lat !== undefined && lng !== undefined) {
            options.location = {
                latitude: Number(lat),
                longitude: Number(lng),
            };
            options.radiusMeters = radius ? Number(radius) : 10000; // Default 10km
        }

        return this.searchProvider.search(options);
    }
}
