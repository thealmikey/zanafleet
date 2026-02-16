/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/restrict-template-expressions */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request, { SuperTest, Test as SuperTestAgent, Response } from 'supertest';

import { AppModule } from '../src/app.module';

/**
 * 3rd Party Integration Test Suite
 * Comprehensive API tests demonstrating how external systems integrate with ZanaFleet
 */
describe('3rd Party Integration - Asset Platform API (e2e)', () => {
    let app: INestApplication;
    let httpRequest: SuperTest<SuperTestAgent>;
    let createdAssetId: string;
    let createdBundleId: string;
    let createdTripId: string;
    let _createdOperatorId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();
        httpRequest = request(app.getHttpServer());
    });

    afterAll(async () => {
        await app.close();
    });

    // ==================== ASSET MANAGEMENT TESTS ====================
    describe('Asset Management', () => {
        it('01: Should create a new vehicle asset', () => {
            return httpRequest
                .post('/assets')
                .send({
                    name: 'Isuzu FRR Truck - 3PL Test',
                    type: 'VEHICLE',
                    ownerId: '3pl-partner-001',
                    ownerType: 'Organization',
                    homeBase: { latitude: -1.286389, longitude: 36.817223, label: 'Nairobi CBD' },
                    capacity: { volumeCBM: 40, weightKG: 8000 },
                    metadata: { licensePlate: 'KCB 123X', color: 'white' },
                })
                .expect(201)
                .expect((res: Response) => {
                    expect(res.body.assetId).toBeDefined();
                    createdAssetId = res.body.assetId;
                });
        });

        it('02: Should create a warehouse asset', () => {
            return httpRequest
                .post('/assets')
                .send({
                    name: 'Secure Storage Unit A7',
                    type: 'WAREHOUSE',
                    ownerId: '3pl-partner-001',
                    ownerType: 'Organization',
                    homeBase: { latitude: -1.319, longitude: 36.928, label: 'Embakasi' },
                    capacity: { areaSquareFeet: 1000 },
                })
                .expect(201);
        });

        it('03: Should create an equipment asset', () => {
            return httpRequest
                .post('/assets')
                .send({
                    name: 'Forklift FL-500',
                    type: 'EQUIPMENT',
                    ownerId: '3pl-partner-001',
                    ownerType: 'Organization',
                    capacity: { liftCapacityKG: 2000 },
                })
                .expect(201);
        });

        it('04: Should retrieve asset by ID', () => {
            return httpRequest
                .get(`/assets/${createdAssetId}`)
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.assetId).toBe(createdAssetId);
                    expect(res.body.name).toContain('Isuzu FRR');
                });
        });

        it('05: Should list assets by owner', () => {
            return httpRequest
                .get('/assets/owner/3pl-partner-001')
                .expect(200)
                .expect((res: Response) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThan(0);
                });
        });

        it('06: Should return 404 for non-existent asset', () => {
            return httpRequest
                .get('/assets/non-existent-id')
                .expect(404);
        });

        it('07: Should reject asset creation without required fields', () => {
            return httpRequest
                .post('/assets')
                .send({
                    name: 'Incomplete Asset',
                    // Missing type, ownerId, ownerType
                })
                .expect(400);
        });
    });

    // ==================== BUNDLE MANAGEMENT TESTS ====================
    describe('Bundle Management', () => {
        it('08: Should create a project bundle', () => {
            return httpRequest
                .post('/bundles')
                .send({
                    name: 'Enterprise Logistics Project',
                    description: 'Multi-asset coordination for client ABC',
                    ownerId: '3pl-partner-001',
                    startDate: '2026-04-01T00:00:00Z',
                    endDate: '2026-04-15T23:59:59Z',
                    budgetAmount: 500000,
                    metadata: { clientName: 'ABC Corp', projectCode: 'ABC-2026-Q2' },
                })
                .expect(201)
                .expect((res: Response) => {
                    expect(res.body.bundleId).toBeDefined();
                    createdBundleId = res.body.bundleId;
                });
        });

        it('09: Should retrieve bundle details', () => {
            return httpRequest
                .get(`/bundles/${createdBundleId}`)
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.bundleId).toBe(createdBundleId);
                    expect(res.body.name).toBe('Enterprise Logistics Project');
                });
        });

        it('10: Should add a trip to bundle', () => {
            return httpRequest
                .patch(`/bundles/${createdBundleId}/trips`)
                .send({
                    assetId: createdAssetId,
                    operatorId: 'operator-test-001',
                    startTime: '2026-04-02T08:00:00Z',
                })
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.bundleId).toBe(createdBundleId);
                    createdTripId = res.body.tripId;
                });
        });

        it('11: Should generate bundle invoice', () => {
            return httpRequest
                .get(`/bundles/${createdBundleId}/invoice`)
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.bundleId).toBe(createdBundleId);
                    expect(res.body).toHaveProperty('summary');
                    expect(res.body.summary).toHaveProperty('totalTrips');
                });
        });

        it('12: Should update bundle status to IN_PROGRESS', () => {
            return httpRequest
                .patch(`/bundles/${createdBundleId}/status`)
                .send({ status: 'IN_PROGRESS' })
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.status).toBe('IN_PROGRESS');
                });
        });

        it('13: Should update bundle status to COMPLETED', () => {
            return httpRequest
                .patch(`/bundles/${createdBundleId}/status`)
                .send({ status: 'COMPLETED' })
                .expect(200);
        });

        it('14: Should reject bundle creation with past dates', () => {
            return httpRequest
                .post('/bundles')
                .send({
                    name: 'Invalid Bundle',
                    ownerId: '3pl-partner-001',
                    startDate: '2020-01-01T00:00:00Z',
                    endDate: '2020-01-02T00:00:00Z',
                    budgetAmount: 1000,
                })
                .expect(400);
        });

        it('15: Should reject adding trip to non-existent bundle', () => {
            return httpRequest
                .patch('/bundles/non-existent-bundle/trips')
                .send({
                    assetId: createdAssetId,
                    operatorId: 'operator-001',
                    startTime: '2026-04-01T00:00:00Z',
                })
                .expect(404);
        });
    });

    // ==================== TRIP MANAGEMENT TESTS ====================
    describe('Trip Management', () => {
        it('16: Should create a standalone trip', () => {
            return httpRequest
                .post('/assets/trips')
                .send({
                    assetId: createdAssetId,
                    operatorId: 'operator-test-002',
                    startTime: '2026-04-10T09:00:00Z',
                })
                .expect(201);
        });

        it('17: Should retrieve trip by ID', () => {
            return httpRequest
                .get(`/assets/trips/${createdTripId}`)
                .expect(200);
        });

        it('18: Should query trips by bundleId', () => {
            return httpRequest
                .get(`/assets/trips?bundleId=${createdBundleId}`)
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.data).toBeDefined();
                    expect(Array.isArray(res.body.data)).toBe(true);
                });
        });

        it('19: Should reject trip without assetId', () => {
            return httpRequest
                .post('/assets/trips')
                .send({
                    operatorId: 'operator-001',
                    startTime: '2026-04-01T00:00:00Z',
                })
                .expect(400);
        });
    });

    // ==================== AI MATCHING ENGINE TESTS ====================
    describe('AI Matching & Discovery', () => {
        it('20: Should match assets for house move', () => {
            return httpRequest
                .post('/assets/match')
                .send({ input: 'Need to move a 4-bedroom house' })
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.estimatedRequirements).toBeDefined();
                    expect(res.body.estimatedRequirements.suggestedType).toBe('VEHICLE');
                });
        });

        it('21: Should detect refrigerated requirement', () => {
            return httpRequest
                .post('/assets/match')
                .send({ input: 'Transport perishable goods with refrigeration' })
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.estimatedRequirements.requiredSkills).toContain('Cold Chain');
                });
        });

        it('22: Should suggest warehouse for storage needs', () => {
            return httpRequest
                .post('/assets/match')
                .send({ input: 'Need warehouse space for 3 months' })
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.estimatedRequirements.suggestedType).toBe('WAREHOUSE');
                });
        });

        it('23: Should detect bundle requirement for office move', () => {
            return httpRequest
                .post('/assets/match')
                .send({ input: 'Moving my entire office to a new building' })
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.bundleSuggested).toBe(true);
                });
        });

        it('24: Should detect heavy lifting skill', () => {
            return httpRequest
                .post('/assets/match')
                .send({ input: 'Need movers for heavy furniture' })
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.estimatedRequirements.requiredSkills).toContain('Heavy Lifting');
                });
        });

        it('25: Should detect cross-border skill', () => {
            return httpRequest
                .post('/assets/match')
                .send({ input: 'Transport goods from Nairobi to Kampala' })
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.estimatedRequirements.requiredSkills).toContain('Cross-Border Transit');
                });
        });
    });

    // ==================== ERROR HANDLING & VALIDATION ====================
    describe('Error Handling & Validation', () => {
        it('26: Should return 400 for invalid asset type', () => {
            return httpRequest
                .post('/assets')
                .send({
                    name: 'Invalid Asset',
                    type: 'INVALID_TYPE',
                    ownerId: 'owner-001',
                    ownerType: 'Organization',
                })
                .expect(400);
        });

        it('27: Should return 404 for non-existent bundle', () => {
            return httpRequest
                .get('/bundles/non-existent-bundle-id')
                .expect(404);
        });

        it('28: Should return 404 for non-existent trip', () => {
            return httpRequest
                .get('/assets/trips/non-existent-trip-id')
                .expect(404);
        });

        it('29: Should validate date formats in bundle creation', () => {
            return httpRequest
                .post('/bundles')
                .send({
                    name: 'Test Bundle',
                    ownerId: 'owner-001',
                    startDate: 'invalid-date',
                    endDate: '2026-05-01T00:00:00Z',
                    budgetAmount: 1000,
                })
                .expect(400);
        });

        it('30: Should reject negative budget amounts', () => {
            return httpRequest
                .post('/bundles')
                .send({
                    name: 'Negative Budget Bundle',
                    ownerId: 'owner-001',
                    startDate: '2026-05-01T00:00:00Z',
                    endDate: '2026-05-10T00:00:00Z',
                    budgetAmount: -1000,
                })
                .expect(400);
        });
    });

    // ==================== BATCH OPERATIONS ====================
    describe('Batch Operations', () => {
        it('31: Should create multiple assets in sequence', async () => {
            const assets = [
                { name: 'Truck 1', type: 'VEHICLE', ownerId: 'batch-owner', ownerType: 'Organization' },
                { name: 'Truck 2', type: 'VEHICLE', ownerId: 'batch-owner', ownerType: 'Organization' },
                { name: 'Truck 3', type: 'VEHICLE', ownerId: 'batch-owner', ownerType: 'Organization' },
            ];

            for (const asset of assets) {
                await httpRequest
                    .post('/assets')
                    .send(asset)
                    .expect(201);
            }
        });

        it('32: Should retrieve all batch-created assets', () => {
            return httpRequest
                .get('/assets/owner/batch-owner')
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.length).toBeGreaterThanOrEqual(3);
                });
        });
    });

    // ==================== ADVANCED SCENARIOS ====================
    describe('Advanced Integration Scenarios', () => {
        let advancedBundleId: string;

        it('33: Should create a multi-day event bundle', () => {
            return httpRequest
                .post('/bundles')
                .send({
                    name: 'Trade Fair 2026',
                    description: '5-day trade fair logistics',
                    ownerId: 'events-corp',
                    startDate: '2026-06-01T00:00:00Z',
                    endDate: '2026-06-05T23:59:59Z',
                    budgetAmount: 2000000,
                    metadata: { eventType: 'Trade Fair', booths: 50 },
                })
                .expect(201)
                .expect((res: Response) => {
                    advancedBundleId = res.body.bundleId;
                });
        });

        it('34: Should add 10 trips to the event bundle', async () => {
            for (let i = 0; i < 10; i++) {
                await httpRequest
                    .patch(`/bundles/${advancedBundleId}/trips`)
                    .send({
                        assetId: createdAssetId,
                        operatorId: `operator-${i}`,
                        startTime: `2026-06-0${Math.floor(i / 2) + 1}T08:00:00Z`,
                    })
                    .expect(200);
            }
        });

        it('35: Should verify bundle has 10 trips', () => {
            return httpRequest
                .get(`/bundles/${advancedBundleId}/invoice`)
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.summary.totalTrips).toBe(10);
                });
        });

        it('36: Should track bundle completion percentage', () => {
            return httpRequest
                .get(`/bundles/${advancedBundleId}/invoice`)
                .expect(200)
                .expect((res: Response) => {
                    const percent = (res.body.summary.completedTrips / res.body.summary.totalTrips) * 100;
                    expect(percent).toBeGreaterThanOrEqual(0);
                    expect(percent).toBeLessThanOrEqual(100);
                });
        });
    });

    // ==================== EDGE CASES ====================
    describe('Edge Cases & Boundary Tests', () => {
        it('37: Should handle empty match query', () => {
            return httpRequest
                .post('/assets/match')
                .send({ input: '' })
                .expect(200);
        });

        it('38: Should handle very long asset names', () => {
            const longName = 'A'.repeat(300);
            return httpRequest
                .post('/assets')
                .send({
                    name: longName,
                    type: 'VEHICLE',
                    ownerId: 'edge-case-owner',
                    ownerType: 'Organization',
                })
                .expect(400); // Should fail validation
        });

        it('39: Should handle special characters in bundle name', () => {
            return httpRequest
                .post('/bundles')
                .send({
                    name: 'Project @2026 #1 (Special & Test)',
                    ownerId: 'special-owner',
                    startDate: '2026-07-01T00:00:00Z',
                    endDate: '2026-07-10T00:00:00Z',
                    budgetAmount: 5000,
                })
                .expect(201);
        });

        it('40: Should handle concurrent trip creation', async () => {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(
                    httpRequest
                        .post('/assets/trips')
                        .send({
                            assetId: createdAssetId,
                            operatorId: `concurrent-op-${i}`,
                            startTime: '2026-08-01T10:00:00Z',
                        })
                );
            }
            const results = await Promise.all(promises);
            results.forEach((res) => expect(res.status).toBe(201));
        });
    });

    // ==================== PERFORMANCE & PAGINATION ====================
    describe('Performance & Scalability', () => {
        it('41: Should handle large bundle with many trips', async () => {
            const largeBundleRes: Response = await httpRequest
                .post('/bundles')
                .send({
                    name: 'Large Scale Project',
                    ownerId: 'perf-test-owner',
                    startDate: '2026-09-01T00:00:00Z',
                    endDate: '2026-09-30T23:59:59Z',
                    budgetAmount: 5000000,
                })
                .expect(201);

            const largeBundleId = largeBundleRes.body.bundleId;

            // Add 50 trips
            for (let i = 0; i < 50; i++) {
                await httpRequest
                    .patch(`/bundles/${largeBundleId}/trips`)
                    .send({
                        assetId: createdAssetId,
                        operatorId: `perf-operator-${i}`,
                        startTime: `2026-09-${String(Math.floor(i / 2) + 1).padStart(2, '0')}T08:00:00Z`,
                    });
            }

            // Verify invoice generation still works
            return httpRequest
                .get(`/bundles/${largeBundleId}/invoice`)
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.summary.totalTrips).toBe(50);
                });
        }, 60000); // 60 second timeout for this test
    });

    // ==================== DATA INTEGRITY ====================
    describe('Data Integrity & Consistency', () => {
        it('42: Should maintain referential integrity for bundle-trip relationship', async () => {
            const bundleRes: Response = await httpRequest
                .post('/bundles')
                .send({
                    name: 'Integrity Test Bundle',
                    ownerId: 'integrity-owner',
                    startDate: '2026-10-01T00:00:00Z',
                    endDate: '2026-10-10T00:00:00Z',
                    budgetAmount: 10000,
                })
                .expect(201);

            const testBundleId = bundleRes.body.bundleId;

            await httpRequest
                .patch(`/bundles/${testBundleId}/trips`)
                .send({
                    assetId: createdAssetId,
                    operatorId: 'integrity-operator',
                    startTime: '2026-10-02T08:00:00Z',
                })
                .expect(200);

            return httpRequest
                .get(`/assets/trips?bundleId=${testBundleId}`)
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.data.length).toBeGreaterThan(0);
                    expect(res.body.data[0].bundleId).toBe(testBundleId);
                });
        });
    });

    // ==================== IDEMPOTENCY & RETRY ====================
    describe('Idempotency & Retry Logic', () => {
        it('43: Should handle duplicate asset creation gracefully', async () => {
            const assetData = {
                name: 'Idempotent Test Asset',
                type: 'VEHICLE',
                ownerId: 'idempotent-owner',
                ownerType: 'Organization',
                metadata: { uniqueRef: 'IDEM-001' },
            };

            const firstRes: Response = await httpRequest
                .post('/assets')
                .send(assetData)
                .expect(201);

            // Second creation with same data (in real system, should check uniqueRef)
            const secondRes: Response = await httpRequest
                .post('/assets')
                .send(assetData)
                .expect(201);

            // Different IDs but same logical asset
            expect(firstRes.body.assetId).not.toBe(secondRes.body.assetId);
        });
    });

    // ==================== SEARCH & FILTERING ====================
    describe('Search & Filtering Capabilities', () => {
        it('44: Should find assets with specific capacity', () => {
            return httpRequest
                .post('/assets/match')
                .send({ input: 'Vehicle with 10 ton capacity' })
                .expect(200);
        });

        it('45: Should filter by asset type implicitly', () => {
            return httpRequest
                .post('/assets/match')
                .send({ input: 'Looking for storage space' })
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.estimatedRequirements.suggestedType).toBe('WAREHOUSE');
                });
        });
    });

    // ==================== COST CALCULATION & BILLING ====================
    describe('Cost Calculation & Billing', () => {
        it('46: Should calculate total cost for completed trips', async () => {
            const billingBundleRes: Response = await httpRequest
                .post('/bundles')
                .send({
                    name: 'Billing Test Bundle',
                    ownerId: 'billing-owner',
                    startDate: '2026-11-01T00:00:00Z',
                    endDate: '2026-11-05T23:59:59Z',
                    budgetAmount: 100000,
                })
                .expect(201);

            const billingBundleId = billingBundleRes.body.bundleId;

            // Add multiple trips
            for (let i = 0; i < 5; i++) {
                await httpRequest
                    .patch(`/bundles/${billingBundleId}/trips`)
                    .send({
                        assetId: createdAssetId,
                        operatorId: `billing-op-${i}`,
                        startTime: '2026-11-02T08:00:00Z',
                    });
            }

            return httpRequest
                .get(`/bundles/${billingBundleId}/invoice`)
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.summary.totalCost).toBeDefined();
                    expect(typeof res.body.summary.totalCost).toBe('number');
                });
        });

        it('47: Should track budget variance', () => {
            return httpRequest
                .get(`/bundles/${createdBundleId}/invoice`)
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.variance).toBeDefined();
                    expect(typeof res.body.variance).toBe('number');
                });
        });
    });

    // ==================== METADATA & CUSTOM FIELDS ====================
    describe('Metadata & Custom Fields', () => {
        it('48: Should store and retrieve custom metadata on assets', async () => {
            const assetRes: Response = await httpRequest
                .post('/assets')
                .send({
                    name: 'Metadata Test Asset',
                    type: 'VEHICLE',
                    ownerId: 'metadata-owner',
                    ownerType: 'Organization',
                    metadata: {
                        customField1: 'value1',
                        customField2: 123,
                        customField3: { nested: 'object' },
                    },
                })
                .expect(201);

            return httpRequest
                .get(`/assets/${assetRes.body.assetId}`)
                .expect(200)
                .expect((res: Response) => {
                    expect(res.body.metadata).toBeDefined();
                    expect(res.body.metadata.customField1).toBe('value1');
                });
        });

        it('49: Should store complex metadata on bundles', () => {
            return httpRequest
                .post('/bundles')
                .send({
                    name: 'Complex Metadata Bundle',
                    ownerId: 'metadata-owner',
                    startDate: '2026-12-01T00:00:00Z',
                    endDate: '2026-12-10T00:00:00Z',
                    budgetAmount: 50000,
                    metadata: {
                        clientInfo: { name: 'ABC Corp', sector: 'Retail' },
                        requirements: ['Refrigeration', 'GPS Tracking'],
                        sla: { responseTime: 24, uptime: 99.9 },
                    },
                })
                .expect(201);
        });

        it('50: Should handle null metadata gracefully', () => {
            return httpRequest
                .post('/assets')
                .send({
                    name: 'No Metadata Asset',
                    type: 'EQUIPMENT',
                    ownerId: 'null-metadata-owner',
                    ownerType: 'Organization',
                })
                .expect(201);
        });
    });

    // ==================== WEBHOOK & EVENTS ====================
    describe('Webhook & Event System', () => {
        it('51: Should create bundle and trigger implicit event', async () => {
            const webhookBundleRes: Response = await httpRequest
                .post('/bundles')
                .send({
                    name: 'Webhook Test Bundle',
                    ownerId: 'webhook-owner',
                    startDate: '2027-01-01T00:00:00Z',
                    endDate: '2027-01-10T00:00:00Z',
                    budgetAmount: 75000,
                })
                .expect(201);

            // In a real system, this would trigger a webhook to 3rd party
            // For now, we just verify the bundle was created successfully
            expect(webhookBundleRes.body.bundleId).toBeDefined();
        });
    });
});
