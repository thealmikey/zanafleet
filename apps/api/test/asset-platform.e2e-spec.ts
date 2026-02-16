/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/restrict-template-expressions */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request, { SuperTest, Test as SuperTestAgent, Response } from 'supertest';

import { AppModule } from '../src/app.module';

describe('Asset Platform (e2e)', () => {
    let app: INestApplication;
    let httpRequest: SuperTest<SuperTestAgent>;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        httpRequest = request(app.getHttpServer());
    });

    afterEach(async () => {
        await app.close();
    });

    describe('AI Matching & Bundling', () => {
        it('should identify skill requirements from natural language', () => {
            return httpRequest
                .post('/assets/match')
                .send({ input: 'I need a refrigerated truck for moving meat' })
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.estimatedRequirements.requiredSkills).toContain('Cold Chain');
                });
        });

        it('should suggest a bundle for large scale projects', () => {
            return httpRequest
                .post('/assets/match')
                .send({ input: 'Moving my whole office to Mombasa' })
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.bundleSuggested).toBe(true);
                });
        });
    });

    describe('Trip Lifecycle with Bundles', () => {
        it('should allow grouping multiple trips under a bundleId', async () => {
            const bundleId = 'test-bundle-uuid';

            // Trip 1
            await httpRequest
                .post('/assets/trips')
                .send({
                    assetId: 'asset-1',
                    operatorId: 'operator-1',
                    bundleId: bundleId,
                    startTime: new Date().toISOString()
                })
                .expect(201);

            // Trip 2
            await httpRequest
                .post('/assets/trips')
                .send({
                    assetId: 'asset-2',
                    operatorId: 'operator-2',
                    bundleId: bundleId,
                    startTime: new Date().toISOString()
                })
                .expect(201);

            // Verify the bundle can be queried
            return httpRequest
                .get(`/assets/trips?bundleId=${bundleId}`)
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.data.length).toBe(2);
                });
        });
    });
});
