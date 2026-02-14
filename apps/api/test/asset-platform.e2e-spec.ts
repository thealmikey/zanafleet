import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Asset Platform (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('AI Matching & Bundling', () => {
        it('should identify skill requirements from natural language', () => {
            return request(app.getHttpServer())
                .post('/assets/match')
                .send({ input: 'I need a refrigerated truck for moving meat' })
                .expect(200)
                .expect((res) => {
                    expect(res.body.estimatedRequirements.requiredSkills).toContain('Cold Chain');
                });
        });

        it('should suggest a bundle for large scale projects', () => {
            return request(app.getHttpServer())
                .post('/assets/match')
                .send({ input: 'Moving my whole office to Mombasa' })
                .expect(200)
                .expect((res) => {
                    expect(res.body.bundleSuggested).toBe(true);
                });
        });
    });

    describe('Trip Lifecycle with Bundles', () => {
        it('should allow grouping multiple trips under a bundleId', async () => {
            const bundleId = 'test-bundle-uuid';

            // Trip 1
            await request(app.getHttpServer())
                .post('/assets/trips')
                .send({
                    assetId: 'asset-1',
                    operatorId: 'operator-1',
                    bundleId: bundleId,
                    startTime: new Date().toISOString()
                })
                .expect(201);

            // Trip 2
            await request(app.getHttpServer())
                .post('/assets/trips')
                .send({
                    assetId: 'asset-2',
                    operatorId: 'operator-2',
                    bundleId: bundleId,
                    startTime: new Date().toISOString()
                })
                .expect(201);

            // Verify the bundle can be queried
            return request(app.getHttpServer())
                .get(`/assets/trips?bundleId=${bundleId}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.data.length).toBe(2);
                });
        });
    });
});
