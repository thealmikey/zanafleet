import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { SearchController } from '../controllers/search.controller';
import { SEARCH_PROVIDER } from '../providers/search-provider.interface';

describe('SearchController (Integration)', () => {
    let app: INestApplication;
    let mockSearchProvider: any;

    const mockUser = {
        workspaceId: 'ws-123',
        businessId: 'biz-123',
    };

    beforeEach(async () => {
        mockSearchProvider = {
            search: jest.fn().mockResolvedValue({
                items: [],
                total: 0,
                query: '',
                processingTimeMs: 10,
            }),
        };

        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [SearchController],
            providers: [
                {
                    provide: SEARCH_PROVIDER,
                    useValue: mockSearchProvider,
                },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();

        // Mock user injection as if CapabilityGuard passed
        app.use((req: any, _res: any, next: any) => {
            req.user = mockUser;
            next();
        });

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('1. should pass query parameter "q" to the provider (Query Resolution)', () => {
        return request(app.getHttpServer())
            .get('/search?q=pizza')
            .expect(200)
            .expect(() => {
                expect(mockSearchProvider.search).toHaveBeenCalledWith(
                    expect.objectContaining({ query: 'pizza' })
                );
            });
    });

    it('2. should split comma-separated "type" parameter (Type Filtering)', () => {
        return request(app.getHttpServer())
            .get('/search?type=Order,Business')
            .expect(200)
            .expect(() => {
                expect(mockSearchProvider.search).toHaveBeenCalledWith(
                    expect.objectContaining({ entityTypes: ['Order', 'Business'] })
                );
            });
    });

    it('3. should handle geolocation parameters correctly (Geo-Param Robustness)', () => {
        return request(app.getHttpServer())
            .get('/search?lat=-1.29&lng=36.82&radius=5000')
            .expect(200)
            .expect(() => {
                expect(mockSearchProvider.search).toHaveBeenCalledWith(
                    expect.objectContaining({
                        location: { latitude: -1.29, longitude: 36.82 },
                        radiusMeters: 5000,
                    })
                );
            });
    });

    it('4. should use workspaceId from request user (Auth Integration)', () => {
        return request(app.getHttpServer())
            .get('/search')
            .expect(200)
            .expect(() => {
                expect(mockSearchProvider.search).toHaveBeenCalledWith(
                    expect.objectContaining({ workspaceId: 'ws-123' })
                );
            });
    });

    it('5. should handle numeric parameters as Numbers (Validation)', () => {
        return request(app.getHttpServer())
            .get('/search?limit=10&offset=20')
            .expect(200)
            .expect(() => {
                expect(mockSearchProvider.search).toHaveBeenCalledWith(
                    expect.objectContaining({ limit: 10, offset: 20 })
                );
            });
    });

    it('6. should return processingTimeMs in the response (Performance Metadata)', () => {
        return request(app.getHttpServer())
            .get('/search?q=test')
            .expect(200)
            .expect((res) => {
                expect(res.body).toHaveProperty('processingTimeMs');
            });
    });

    it('7. should return 200 OK with empty list when no results (Empty State)', () => {
        return request(app.getHttpServer())
            .get('/search?q=nothing')
            .expect(200)
            .expect((res) => {
                expect(res.body.items).toHaveLength(0);
                expect(res.body.total).toBe(0);
            });
    });

    it('8. should return 500 when provider throws error (Error Mapping)', () => {
        mockSearchProvider.search.mockRejectedValue(new Error('Internal FTS Error'));
        return request(app.getHttpServer())
            .get('/search?q=fail')
            .expect(500);
    });

    it('9. should default missing limit/offset/sort (Default Params)', () => {
        return request(app.getHttpServer())
            .get('/search')
            .expect(200)
            .expect(() => {
                expect(mockSearchProvider.search).toHaveBeenCalledWith(
                    expect.objectContaining({
                        limit: 20,
                        offset: 0,
                        sortBy: 'relevance',
                    })
                );
            });
    });

    it('10. should pass sort parameter to the provider (Sorting)', () => {
        return request(app.getHttpServer())
            .get('/search?sort=distance&lat=0&lng=0')
            .expect(200)
            .expect(() => {
                expect(mockSearchProvider.search).toHaveBeenCalledWith(
                    expect.objectContaining({ sortBy: 'distance' })
                );
            });
    });
});
