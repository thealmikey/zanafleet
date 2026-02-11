import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from '../handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Dashboard MSW Handlers', () => {
  describe('Admin Dashboard', () => {
    it('returns system metrics with correct shape', async () => {
      const response = await fetch('/api/dashboard/admin/metrics?periodDays=7');
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data).toMatchObject({
        totalOrders: expect.any(Number),
        totalDeliveries: expect.any(Number),
        totalRevenue: expect.any(Number),
        activeRiders: expect.any(Number),
        periodDays: 7,
      });
    });

    it('returns settlements with pagination meta', async () => {
      const response = await fetch('/api/dashboard/admin/settlements?page=1&limit=2');
      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta).toMatchObject({
        page: 1,
        limit: 2,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });

      if (result.data.length > 0) {
        expect(result.data[0]).toMatchObject({
          batchId: expect.any(String),
          status: expect.any(String),
          totalAmount: expect.any(Number),
          recipientCount: expect.any(Number),
        });
      }
    });

    it('returns policies with pagination meta', async () => {
      const response = await fetch('/api/dashboard/admin/policies');
      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');

      if (result.data.length > 0) {
        expect(result.data[0]).toMatchObject({
          policyId: expect.any(String),
          name: expect.any(String),
          scope: expect.any(String),
          status: expect.any(String),
        });
      }
    });
  });

  describe('Business Dashboard', () => {
    const businessId = 'test-business-123';

    it('returns business metrics', async () => {
      const response = await fetch(`/api/dashboard/business/${businessId}/metrics`);
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data).toMatchObject({
        totalOrders: expect.any(Number),
        totalDeliveries: expect.any(Number),
        totalSpent: expect.any(Number),
        averageDeliveryTime: expect.any(Number),
        periodDays: expect.any(Number),
      });
    });

    it('returns orders with pagination', async () => {
      const response = await fetch(`/api/dashboard/business/${businessId}/orders?page=1&limit=3`);
      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(3);

      if (result.data.length > 0) {
        expect(result.data[0]).toMatchObject({
          orderId: expect.any(String),
          status: expect.any(String),
          totalAmount: expect.any(Number),
          itemCount: expect.any(Number),
        });
      }
    });

    it('returns delivery history', async () => {
      const response = await fetch(`/api/dashboard/business/${businessId}/deliveries`);
      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toBeDefined();
      if (result.data.length > 0) {
        expect(result.data[0]).toMatchObject({
          deliveryId: expect.any(String),
          status: expect.any(String),
          pickupAddress: expect.any(String),
          dropoffAddress: expect.any(String),
        });
      }
    });

    it('returns invoices', async () => {
      const response = await fetch(`/api/dashboard/business/${businessId}/invoices`);
      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toBeDefined();
      if (result.data.length > 0) {
        expect(result.data[0]).toMatchObject({
          invoiceId: expect.any(String),
          status: expect.any(String),
          totalAmount: expect.any(Number),
        });
      }
    });
  });

  describe('Business Owner Dashboard', () => {
    const businessId = 'biz_demo_001';

    it('returns my linked businesses', async () => {
      const response = await fetch('/api/businesses/mine');
      expect(response.ok).toBe(true);
      const payload = await response.json();

      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.data[0]).toMatchObject({
        businessId: expect.any(String),
        businessName: expect.any(String),
      });
    });

    it('returns business overview, deliveries, details and billing summary', async () => {
      const overviewRes = await fetch(`/api/businesses/${businessId}/stats/overview`);
      expect(overviewRes.ok).toBe(true);
      const overview = await overviewRes.json();
      expect(overview).toMatchObject({
        totalDeliveries: expect.any(Number),
        activeDeliveries: expect.any(Number),
        successfulDeliveries: expect.any(Number),
        spendThisMonth: expect.any(Number),
      });

      const deliveriesRes = await fetch(`/api/businesses/${businessId}/deliveries?page=1&limit=10`);
      expect(deliveriesRes.ok).toBe(true);
      const deliveriesPayload = await deliveriesRes.json();
      expect(Array.isArray(deliveriesPayload.data)).toBe(true);
      expect(deliveriesPayload.meta).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });

      const firstDeliveryId = deliveriesPayload.data[0]?.deliveryId;
      expect(firstDeliveryId).toEqual(expect.any(String));

      const detailRes = await fetch(`/api/businesses/${businessId}/deliveries/${firstDeliveryId}`);
      expect(detailRes.ok).toBe(true);
      const detail = await detailRes.json();
      expect(detail).toMatchObject({
        deliveryId: firstDeliveryId,
        status: expect.any(String),
        timeline: expect.any(Array),
      });

      const billingRes = await fetch(`/api/businesses/${businessId}/billing/summary`);
      expect(billingRes.ok).toBe(true);
      const billing = await billingRes.json();
      expect(billing).toMatchObject({
        currency: expect.any(String),
        totalSpend: expect.any(Number),
        pendingCharges: expect.any(Number),
        paidDeliveries: expect.any(Number),
        invoiceHistory: expect.any(Array),
      });
    });

    it('accepts delivery request and makes it visible in list', async () => {
      const createRes = await fetch(`/api/businesses/${businessId}/deliveries/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupLocationId: 'loc_pickup_new',
          dropoffLocationId: 'loc_dropoff_new',
          recipientName: 'Test Recipient',
          recipientPhone: '+254700000111',
          itemDescription: 'MSW seeded package',
        }),
      });
      expect(createRes.ok).toBe(true);
      const created = await createRes.json();
      expect(created).toMatchObject({
        deliveryId: expect.any(String),
        orderId: expect.any(String),
        estimatedCharges: expect.any(Number),
      });

      const deliveriesRes = await fetch(`/api/businesses/${businessId}/deliveries?page=1&limit=10`);
      const deliveriesPayload = await deliveriesRes.json();
      expect(deliveriesPayload.data[0]).toMatchObject({
        deliveryId: created.deliveryId,
        orderId: created.orderId,
      });
    });
  });

  describe('Rider Dashboard', () => {
    const riderId = 'test-rider-456';

    it('returns active deliveries', async () => {
      const response = await fetch(`/api/dashboard/rider/${riderId}/deliveries/active`);
      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toBeDefined();
      expect(result.meta).toBeDefined();

      if (result.data.length > 0) {
        expect(result.data[0]).toMatchObject({
          deliveryId: expect.any(String),
          status: expect.any(String),
          estimatedEarnings: expect.any(Number),
        });
      }
    });

    it('returns earnings summary', async () => {
      const response = await fetch(`/api/dashboard/rider/${riderId}/earnings?periodDays=14`);
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data).toMatchObject({
        totalEarnings: expect.any(Number),
        pendingPayout: expect.any(Number),
        completedDeliveries: expect.any(Number),
        averagePerDelivery: expect.any(Number),
        periodDays: 14,
      });
    });
  });

  describe('Operator Dashboard', () => {
    it('returns operator metrics', async () => {
      const response = await fetch('/api/dashboard/operator/metrics');
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data).toMatchObject({
        activeDeliveries: expect.any(Number),
        pendingAssignments: expect.any(Number),
        availableRiders: expect.any(Number),
        avgAssignmentTime: expect.any(Number),
      });
    });

    it('returns assignment queue with pagination', async () => {
      const response = await fetch('/api/dashboard/operator/assignment-queue');
      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toBeDefined();
      expect(result.meta).toBeDefined();

      if (result.data.length > 0) {
        expect(result.data[0]).toMatchObject({
          deliveryId: expect.any(String),
          status: expect.any(String),
          priority: expect.any(Number),
          attempts: expect.any(Number),
        });
      }
    });

    it('returns candidates by area', async () => {
      const response = await fetch('/api/dashboard/operator/candidates?lat=-1.28&lng=36.81&limit=3');
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeLessThanOrEqual(3);

      if (data.length > 0) {
        expect(data[0]).toMatchObject({
          riderId: expect.any(String),
          name: expect.any(String),
          distance: expect.any(Number),
          eta: expect.any(Number),
          rating: expect.any(Number),
        });
      }
    });

    it('returns route hint', async () => {
      const response = await fetch(
        '/api/dashboard/operator/route-hint?originLat=-1.28&originLng=36.81&destLat=-1.29&destLng=36.82'
      );
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data).toMatchObject({
        distanceMeters: expect.any(Number),
        durationSeconds: expect.any(Number),
      });
    });

    it('returns delivery candidates', async () => {
      const response = await fetch('/api/dashboard/operator/deliveries/del-123/candidates?limit=2');
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Support Dashboard', () => {
    it('returns support metrics', async () => {
      const response = await fetch('/api/dashboard/support/metrics');
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data).toMatchObject({
        openDisputes: expect.any(Number),
        escalatedDisputes: expect.any(Number),
        pendingRefunds: expect.any(Number),
        resolvedToday: expect.any(Number),
        periodDays: expect.any(Number),
      });
    });

    it('returns disputes with pagination', async () => {
      const response = await fetch('/api/dashboard/support/disputes?page=1&limit=10');
      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toBeDefined();
      expect(result.meta).toBeDefined();

      if (result.data.length > 0) {
        expect(result.data[0]).toMatchObject({
          disputeId: expect.any(String),
          status: expect.any(String),
          reason: expect.any(String),
          amount: expect.any(Number),
        });
      }
    });

    it('returns escalated disputes only', async () => {
      const response = await fetch('/api/dashboard/support/disputes/escalated');
      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toBeDefined();
      result.data.forEach((dispute: { status: string }) => {
        expect(dispute.status).toBe('escalated');
      });
    });

    it('returns refunds', async () => {
      const response = await fetch('/api/dashboard/support/refunds');
      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toBeDefined();
      if (result.data.length > 0) {
        expect(result.data[0]).toMatchObject({
          refundId: expect.any(String),
          status: expect.any(String),
          amount: expect.any(Number),
        });
      }
    });

    it('returns recent payment activity', async () => {
      const response = await fetch('/api/dashboard/support/payments/recent');
      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.data).toBeDefined();
      if (result.data.length > 0) {
        expect(result.data[0]).toMatchObject({
          paymentIntentId: expect.any(String),
          status: expect.any(String),
          amount: expect.any(Number),
          currency: expect.any(String),
        });
      }
    });
  });

  describe('Geo Endpoints', () => {
    it('returns nearby riders', async () => {
      const response = await fetch('/api/geo/nearby-riders?lat=-1.2864&lng=36.8172&radius=2000&limit=3');
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeLessThanOrEqual(3);

      if (data.length > 0) {
        expect(data[0]).toMatchObject({
          riderId: expect.any(String),
          name: expect.any(String),
          lat: expect.any(Number),
          lng: expect.any(Number),
          distance: expect.any(Number),
          status: expect.any(String),
        });
      }
    });

    it('returns heatmap cells', async () => {
      const response = await fetch(
        '/api/geo/heatmap?minLat=-1.35&maxLat=-1.25&minLng=36.75&maxLng=36.85&resolution=5'
      );
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(25);

      if (data.length > 0) {
        expect(data[0]).toMatchObject({
          lat: expect.any(Number),
          lng: expect.any(Number),
          weight: expect.any(Number),
        });
      }
    });

    it('returns zone clusters', async () => {
      const response = await fetch('/api/geo/zones?minLat=-1.4&maxLat=-1.2&minLng=36.7&maxLng=36.9');
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toMatchObject({
          zoneId: expect.any(String),
          name: expect.any(String),
          centerLat: expect.any(Number),
          centerLng: expect.any(Number),
          riderCount: expect.any(Number),
          demandLevel: expect.any(String),
        });
      }
    });

    it('returns ETA result', async () => {
      const response = await fetch(
        '/api/geo/eta?originLat=-1.28&originLng=36.81&destLat=-1.29&destLng=36.82'
      );
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data).toMatchObject({
        durationSeconds: expect.any(Number),
        distanceMeters: expect.any(Number),
      });
    });

    it('returns distance result', async () => {
      const response = await fetch(
        '/api/geo/distance?originLat=-1.28&originLng=36.81&destLat=-1.29&destLng=36.82'
      );
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data).toMatchObject({
        distanceMeters: expect.any(Number),
        straightLineMeters: expect.any(Number),
      });
    });

    it('checks service area containment', async () => {
      const response = await fetch('/api/geo/service-area/nairobi-central/contains?lat=-1.28&lng=36.82');
      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data).toMatchObject({
        contains: expect.any(Boolean),
      });
    });
  });
});
