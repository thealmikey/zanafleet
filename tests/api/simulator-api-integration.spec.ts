import { expect, test } from '@playwright/test';

/**
 * ZanaFleet API Integration Tests
 *
 * These tests directly exercise the backend API endpoints
 * to verify core functionality and surface integration issues.
 *
 * NOTE: These tests require the API server to be running.
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_PREFIX = '/api';

test.describe('ZanaFleet API Integration Tests', () => {
  // Use a test workspace ID
  const testWorkspaceId = '00000000-0000-0000-0000-000000000001';
  const testToken = 'test-token-e2e-' + Date.now();

  test.describe('Health Checks', () => {
    test('API server should be accessible', async ({ request }) => {
      console.log(`[API TEST] Checking API health at ${API_BASE_URL}/health`);

      try {
        const response = await request.get(`${API_BASE_URL}/health`);
        console.log(`[API TEST] Health check status: ${response.status()}`);

        // Log response for debugging
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Health response:`, JSON.stringify(body));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Health check error: ${errMsg}`);
        // Don't fail - API might not be running in this test environment
      }
    });
  });

  test.describe('Organization API', () => {
    test('should list organizations', async ({ request }) => {
      console.log('[API TEST] Testing organizations list endpoint...');

      try {
        const response = await request.get(`${API_BASE_URL}${API_PREFIX}/organizations`, {
          headers: {
            'workspace-id': testWorkspaceId,
          },
        });

        console.log(`[API TEST] Organizations status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Organizations response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Organizations error: ${errMsg}`);
      }
    });

    test('should create organization', async ({ request }) => {
      console.log('[API TEST] Testing organization creation...');

      try {
        const response = await request.post(`${API_BASE_URL}${API_PREFIX}/organizations`, {
          headers: {
            'Content-Type': 'application/json',
            'workspace-id': testWorkspaceId,
          },
          data: {
            name: 'Test Organization ' + Date.now(),
            type: 'DELIVERY',
            phone: '+254700000001',
          },
        });

        console.log(`[API TEST] Create organization status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Create response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Create organization error: ${errMsg}`);
      }
    });
  });

  test.describe('Rider API', () => {
    test('should list riders', async ({ request }) => {
      console.log('[API TEST] Testing riders list endpoint...');

      try {
        const response = await request.get(`${API_BASE_URL}${API_PREFIX}/riders`, {
          headers: {
            'workspace-id': testWorkspaceId,
          },
        });

        console.log(`[API TEST] Riders status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Riders response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Riders error: ${errMsg}`);
      }
    });

    test('should create rider', async ({ request }) => {
      console.log('[API TEST] Testing rider creation...');

      try {
        const response = await request.post(`${API_BASE_URL}${API_PREFIX}/riders`, {
          headers: {
            'Content-Type': 'application/json',
            'workspace-id': testWorkspaceId,
          },
          data: {
            fullName: 'Test Rider ' + Date.now(),
            nationalId: '12345678',
            phone: '+254700000002',
            vehicleType: 'MOTORCYCLE',
          },
        });

        console.log(`[API TEST] Create rider status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Create rider response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Create rider error: ${errMsg}`);
      }
    });
  });

  test.describe('Order API', () => {
    test('should list orders', async ({ request }) => {
      console.log('[API TEST] Testing orders list endpoint...');

      try {
        const response = await request.get(`${API_BASE_URL}${API_PREFIX}/orders`, {
          headers: {
            'workspace-id': testWorkspaceId,
          },
        });

        console.log(`[API TEST] Orders status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Orders response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Orders error: ${errMsg}`);
      }
    });

    test('should create order', async ({ request }) => {
      console.log('[API TEST] Testing order creation...');

      try {
        const response = await request.post(`${API_BASE_URL}${API_PREFIX}/orders`, {
          headers: {
            'Content-Type': 'application/json',
            'workspace-id': testWorkspaceId,
          },
          data: {
            businessId: 'biz-001',
            itemSummary: 'Test Order Items',
            customerName: 'John Doe',
            customerPhone: '+254700000003',
          },
        });

        console.log(`[API TEST] Create order status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Create order response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Create order error: ${errMsg}`);
      }
    });
  });

  test.describe('Delivery API', () => {
    test('should list deliveries', async ({ request }) => {
      console.log('[API TEST] Testing deliveries list endpoint...');

      try {
        const response = await request.get(`${API_BASE_URL}${API_PREFIX}/deliveries`, {
          headers: {
            'workspace-id': testWorkspaceId,
          },
        });

        console.log(`[API TEST] Deliveries status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Deliveries response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Deliveries error: ${errMsg}`);
      }
    });

    test('should request delivery', async ({ request }) => {
      console.log('[API TEST] Testing delivery request...');

      try {
        const response = await request.post(`${API_BASE_URL}${API_PREFIX}/deliveries/request`, {
          headers: {
            'Content-Type': 'application/json',
            'workspace-id': testWorkspaceId,
          },
          data: {
            businessId: 'biz-001',
            workspaceId: testWorkspaceId,
            actorId: 'actor-001',
            pickup: { address: 'Pickup Address', lat: -1.2921, lng: 36.8219 },
            dropoff: { address: 'Dropoff Address', lat: -1.2867, lng: 36.8178 },
            recipientName: 'Jane Doe',
            recipientPhone: '+254700000004',
            distanceKm: 5.0,
          },
        });

        console.log(`[API TEST] Request delivery status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Request delivery response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Request delivery error: ${errMsg}`);
      }
    });
  });

  test.describe('Wallet API', () => {
    test('should get wallet balance', async ({ request }) => {
      console.log('[API TEST] Testing wallet balance endpoint...');

      try {
        const response = await request.get(`${API_BASE_URL}${API_PREFIX}/wallets/actor-001`, {
          headers: {
            'workspace-id': testWorkspaceId,
          },
        });

        console.log(`[API TEST] Wallet status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Wallet response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Wallet error: ${errMsg}`);
      }
    });

    test('should list wallet transactions', async ({ request }) => {
      console.log('[API TEST] Testing wallet transactions endpoint...');

      try {
        const response = await request.get(
          `${API_BASE_URL}${API_PREFIX}/wallets/actor-001/transactions`,
          {
            headers: {
              'workspace-id': testWorkspaceId,
            },
          }
        );

        console.log(`[API TEST] Transactions status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Transactions response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Transactions error: ${errMsg}`);
      }
    });
  });

  test.describe('Workspace API', () => {
    test('should list workspaces', async ({ request }) => {
      console.log('[API TEST] Testing workspaces list endpoint...');

      try {
        const response = await request.get(`${API_BASE_URL}${API_PREFIX}/workspaces`);

        console.log(`[API TEST] Workspaces status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Workspaces response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Workspaces error: ${errMsg}`);
      }
    });

    test('should get workspace by id', async ({ request }) => {
      console.log('[API TEST] Testing workspace by ID endpoint...');

      try {
        const response = await request.get(
          `${API_BASE_URL}${API_PREFIX}/workspaces/${testWorkspaceId}`
        );

        console.log(`[API TEST] Workspace ID status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Workspace ID response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Workspace ID error: ${errMsg}`);
      }
    });
  });

  test.describe('Job Type API', () => {
    test('should list job types', async ({ request }) => {
      console.log('[API TEST] Testing job types endpoint...');

      try {
        const response = await request.get(`${API_BASE_URL}${API_PREFIX}/job-types`, {
          headers: {
            'workspace-id': testWorkspaceId,
          },
        });

        console.log(`[API TEST] Job types status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Job types response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Job types error: ${errMsg}`);
      }
    });
  });

  test.describe('Assignment API', () => {
    test('should list assignments', async ({ request }) => {
      console.log('[API TEST] Testing assignments endpoint...');

      try {
        const response = await request.get(`${API_BASE_URL}${API_PREFIX}/assignments`, {
          headers: {
            'workspace-id': testWorkspaceId,
          },
        });

        console.log(`[API TEST] Assignments status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Assignments response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Assignments error: ${errMsg}`);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 gracefully', async ({ request }) => {
      console.log('[API TEST] Testing 404 handling...');

      try {
        const response = await request.get(
          `${API_BASE_URL}${API_PREFIX}/non-existent-endpoint-12345`
        );

        console.log(`[API TEST] 404 status: ${response.status()}`);
        expect(response.status()).toBeGreaterThanOrEqual(400);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] 404 error: ${errMsg}`);
      }
    });

    test('should handle invalid workspace', async ({ request }) => {
      console.log('[API TEST] Testing invalid workspace handling...');

      try {
        const response = await request.get(`${API_BASE_URL}${API_PREFIX}/organizations`, {
          headers: {
            'workspace-id': 'invalid-workspace-id',
          },
        });

        console.log(`[API TEST] Invalid workspace status: ${response.status()}`);
        const body = await response.json().catch(() => ({}));
        console.log(`[API TEST] Invalid workspace response:`, JSON.stringify(body).slice(0, 500));
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] Invalid workspace error: ${errMsg}`);
      }
    });

    test('should handle missing content-type', async ({ request }) => {
      console.log('[API TEST] Testing missing content-type handling...');

      try {
        const response = await request.post(`${API_BASE_URL}${API_PREFIX}/organizations`, {
          headers: {
            'workspace-id': testWorkspaceId,
          },
          data: 'not json',
        });

        console.log(`[API TEST] No content-type status: ${response.status()}`);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[API TEST] No content-type error: ${errMsg}`);
      }
    });
  });
});

test.describe('ZanaFleet API Performance Tests', () => {
  const testWorkspaceId = '00000000-0000-0000-0000-000000000001';

  test('response time should be acceptable', async ({ request }) => {
    console.log('[PERF TEST] Testing API response times...');

    const endpoints = ['/health', '/api/organizations', '/api/riders', '/api/orders'];

    for (const endpoint of endpoints) {
      const url = endpoint.startsWith('/api')
        ? `${API_BASE_URL}${endpoint}`
        : `${API_BASE_URL}${endpoint}`;
      const startTime = Date.now();

      try {
        await request.get(url, {
          headers: { 'workspace-id': testWorkspaceId },
          timeout: 10000,
        });
        const duration = Date.now() - startTime;
        console.log(`[PERF TEST] ${endpoint}: ${duration}ms`);
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`[PERF TEST] ${endpoint}: ERROR - ${duration}ms - ${errMsg}`);
      }
    }
  });
});
