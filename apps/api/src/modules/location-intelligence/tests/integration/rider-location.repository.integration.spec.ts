import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { haversineDistanceMeters } from '../../../../core/utils/geo.utils';
import { RiderLocationHistoryEntity } from '../../entities/rider-location-history.entity';
import { RiderLocationSnapshotEntity } from '../../entities/rider-location-snapshot.entity';
import { GeoPoint } from '../../providers/geo-provider.interface';
import { RiderLocationRepository } from '../../repositories/rider-location.repository';
import { H3Service } from '../../services/h3.service';

/**
 * Integration tests for RiderLocationRepository.
 * Requires a running PostgreSQL instance with PostGIS extension.
 *
 * Run with: npm run test:integration
 * Ensure docker-compose.test.yml services are running.
 *
 * Tests are automatically skipped if TEST_DB_HOST is not configured.
 */

const isDbAvailable = Boolean(process.env.TEST_DB_HOST || process.env.CI);
const describeWithDb = isDbAvailable ? describe : describe.skip;

describeWithDb('RiderLocationRepository Integration', () => {
  let module: TestingModule;
  let repository: RiderLocationRepository;
  let dataSource: DataSource;
  let h3Service: H3Service;

  /**
   * Test center point: Nairobi, Kenya
   * All test riders are positioned relative to this point.
   */
  const CENTER_POINT: GeoPoint = {
    latitude: -1.2921,
    longitude: 36.8219,
  };

  /**
   * Test riders with known positions and predictable distances from CENTER_POINT.
   * Distances are approximate based on:
   * - 1° latitude ≈ 111,320 meters
   * - 1° longitude ≈ 111,320 * cos(lat) meters ≈ 111,292 meters at this latitude
   */
  const TEST_RIDERS = [
    {
      id: uuidv4(),
      name: 'rider-at-center',
      latitude: -1.2921,
      longitude: 36.8219,
      expectedDistanceApprox: 0,
    },
    {
      id: uuidv4(),
      name: 'rider-100m-north',
      latitude: -1.2912,
      longitude: 36.8219,
      expectedDistanceApprox: 100,
    },
    {
      id: uuidv4(),
      name: 'rider-500m-east',
      latitude: -1.2921,
      longitude: 36.8264,
      expectedDistanceApprox: 500,
    },
    {
      id: uuidv4(),
      name: 'rider-1km-south',
      latitude: -1.3011,
      longitude: 36.8219,
      expectedDistanceApprox: 1000,
    },
    {
      id: uuidv4(),
      name: 'rider-2km-southwest',
      latitude: -1.3048,
      longitude: 36.8091,
      expectedDistanceApprox: 2000,
    },
    {
      id: uuidv4(),
      name: 'rider-5km-north',
      latitude: -1.2471,
      longitude: 36.8219,
      expectedDistanceApprox: 5000,
    },
  ];

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
          username: process.env.TEST_DB_USER || 'postgres',
          password: process.env.TEST_DB_PASSWORD || 'postgres',
          database: process.env.TEST_DB_NAME || 'zanafleet_test',
          entities: [RiderLocationSnapshotEntity, RiderLocationHistoryEntity],
          synchronize: false,
        }),
        TypeOrmModule.forFeature([RiderLocationSnapshotEntity, RiderLocationHistoryEntity]),
      ],
      providers: [RiderLocationRepository, H3Service],
    }).compile();

    repository = module.get<RiderLocationRepository>(RiderLocationRepository);
    dataSource = module.get<DataSource>(DataSource);
    h3Service = module.get<H3Service>(H3Service);

    await ensurePostGISEnabled();
    await ensureTablesExist();
  });

  afterAll(async () => {
    await cleanupTestData();
    await module.close();
  });

  beforeEach(async () => {
    await cleanupTestData();
    await insertTestRiders();
  });

  async function ensurePostGISEnabled(): Promise<void> {
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS postgis');
  }

  async function ensureTablesExist(): Promise<void> {
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS rider_location_snapshots (
        rider_id uuid NOT NULL PRIMARY KEY,
        latitude double precision NOT NULL,
        longitude double precision NOT NULL,
        point geometry(Point, 4326) NOT NULL,
        h3_index_fine varchar(15) NOT NULL,
        h3_index_medium varchar(15) NOT NULL,
        h3_index_coarse varchar(15) NOT NULL,
        heading double precision,
        speed double precision,
        accuracy double precision,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS rider_location_history (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        rider_id uuid NOT NULL,
        latitude double precision NOT NULL,
        longitude double precision NOT NULL,
        point geometry(Point, 4326) NOT NULL,
        h3_index_fine varchar(15) NOT NULL,
        h3_index_medium varchar(15) NOT NULL,
        h3_index_coarse varchar(15) NOT NULL,
        heading double precision,
        speed double precision,
        accuracy double precision,
        recorded_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_snapshot_h3_fine_test 
      ON rider_location_snapshots (h3_index_fine)
    `);
  }

  async function cleanupTestData(): Promise<void> {
    const riderIds = TEST_RIDERS.map((r) => r.id);
    await dataSource.query('DELETE FROM rider_location_history WHERE rider_id = ANY($1)', [
      riderIds,
    ]);
    await dataSource.query('DELETE FROM rider_location_snapshots WHERE rider_id = ANY($1)', [
      riderIds,
    ]);
  }

  async function insertTestRiders(): Promise<void> {
    for (const rider of TEST_RIDERS) {
      const h3Indices = h3Service.pointToMultiResolution({
        latitude: rider.latitude,
        longitude: rider.longitude,
      });

      await dataSource.query(
        `
        INSERT INTO rider_location_snapshots (
          rider_id, latitude, longitude, point,
          h3_index_fine, h3_index_medium, h3_index_coarse,
          heading, speed, accuracy, updated_at
        ) VALUES (
          $1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326),
          $6, $7, $8, $9, $10, $11, NOW()
        )
        `,
        [
          rider.id,
          rider.latitude,
          rider.longitude,
          rider.longitude,
          rider.latitude,
          h3Indices.fine,
          h3Indices.medium,
          h3Indices.coarse,
          90,
          10,
          5,
        ]
      );
    }
  }

  describe('findNearbyRiders', () => {
    it('should find rider at exact center point within 100m radius', async () => {
      const results = await repository.findNearbyRiders({
        point: CENTER_POINT,
        radiusMeters: 100,
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
      const centerRider = results.find((r) => r.riderId === TEST_RIDERS[0].id);
      expect(centerRider).toBeDefined();
      expect(centerRider!.distanceMeters).toBeLessThan(1);
    });

    it('should find riders within 200m radius (center + 100m rider)', async () => {
      const results = await repository.findNearbyRiders({
        point: CENTER_POINT,
        radiusMeters: 200,
      });

      expect(results.length).toBe(2);
      const riderIds = results.map((r) => r.riderId);
      expect(riderIds).toContain(TEST_RIDERS[0].id);
      expect(riderIds).toContain(TEST_RIDERS[1].id);
    });

    it('should find riders within 600m radius (center + 100m + 500m riders)', async () => {
      const results = await repository.findNearbyRiders({
        point: CENTER_POINT,
        radiusMeters: 600,
      });

      expect(results.length).toBe(3);
      const riderIds = results.map((r) => r.riderId);
      expect(riderIds).toContain(TEST_RIDERS[0].id);
      expect(riderIds).toContain(TEST_RIDERS[1].id);
      expect(riderIds).toContain(TEST_RIDERS[2].id);
    });

    it('should find riders within 1500m radius (includes 1km rider)', async () => {
      const results = await repository.findNearbyRiders({
        point: CENTER_POINT,
        radiusMeters: 1500,
      });

      expect(results.length).toBe(4);
      const riderIds = results.map((r) => r.riderId);
      expect(riderIds).toContain(TEST_RIDERS[3].id);
    });

    it('should find all riders within 6000m radius', async () => {
      const results = await repository.findNearbyRiders({
        point: CENTER_POINT,
        radiusMeters: 6000,
      });

      expect(results.length).toBe(TEST_RIDERS.length);
    });

    it('should exclude riders outside the specified radius', async () => {
      const results = await repository.findNearbyRiders({
        point: CENTER_POINT,
        radiusMeters: 300,
      });

      const riderIds = results.map((r) => r.riderId);
      expect(riderIds).not.toContain(TEST_RIDERS[2].id);
      expect(riderIds).not.toContain(TEST_RIDERS[3].id);
      expect(riderIds).not.toContain(TEST_RIDERS[4].id);
      expect(riderIds).not.toContain(TEST_RIDERS[5].id);
    });

    it('should return results sorted by distance ascending', async () => {
      const results = await repository.findNearbyRiders({
        point: CENTER_POINT,
        radiusMeters: 6000,
      });

      for (let i = 1; i < results.length; i++) {
        expect(results[i].distanceMeters).toBeGreaterThanOrEqual(results[i - 1].distanceMeters!);
      }
    });

    it('should respect the limit parameter', async () => {
      const results = await repository.findNearbyRiders({
        point: CENTER_POINT,
        radiusMeters: 6000,
        limit: 3,
      });

      expect(results.length).toBe(3);
      expect(results[0].riderId).toBe(TEST_RIDERS[0].id);
    });

    it('should calculate accurate distances using haversine formula', async () => {
      const results = await repository.findNearbyRiders({
        point: CENTER_POINT,
        radiusMeters: 6000,
      });

      for (const result of results) {
        const expectedDistance = haversineDistanceMeters(CENTER_POINT, {
          latitude: result.latitude,
          longitude: result.longitude,
        });

        expect(result.distanceMeters).toBeCloseTo(expectedDistance, 1);
      }
    });

    it('should return empty array when no riders in radius', async () => {
      const farPoint: GeoPoint = {
        latitude: 0,
        longitude: 0,
      };

      const results = await repository.findNearbyRiders({
        point: farPoint,
        radiusMeters: 1000,
      });

      expect(results).toEqual([]);
    });

    it('should include all snapshot fields in results', async () => {
      const results = await repository.findNearbyRiders({
        point: CENTER_POINT,
        radiusMeters: 100,
      });

      expect(results.length).toBeGreaterThan(0);
      const rider = results[0];

      expect(rider).toHaveProperty('riderId');
      expect(rider).toHaveProperty('latitude');
      expect(rider).toHaveProperty('longitude');
      expect(rider).toHaveProperty('h3IndexFine');
      expect(rider).toHaveProperty('h3IndexMedium');
      expect(rider).toHaveProperty('h3IndexCoarse');
      expect(rider).toHaveProperty('heading');
      expect(rider).toHaveProperty('speed');
      expect(rider).toHaveProperty('accuracy');
      expect(rider).toHaveProperty('updatedAt');
      expect(rider).toHaveProperty('distanceMeters');
    });
  });

  describe('findRidersInH3Cells', () => {
    it('should find riders in specified H3 cells', async () => {
      const centerH3 = h3Service.pointToH3(CENTER_POINT, 9);
      const neighbors = h3Service.getNeighbors(centerH3, 1);

      const results = await repository.findRidersInH3Cells(neighbors);

      expect(results.length).toBeGreaterThanOrEqual(1);
      const centerRider = results.find((r) => r.riderId === TEST_RIDERS[0].id);
      expect(centerRider).toBeDefined();
    });

    it('should return empty array for cells with no riders', async () => {
      const emptyH3 = h3Service.pointToH3({ latitude: 0, longitude: 0 }, 9);
      const results = await repository.findRidersInH3Cells([emptyH3]);

      expect(results).toEqual([]);
    });
  });

  describe('findRidersInPolygon', () => {
    it('should find riders within a polygon around center', async () => {
      const polygon: GeoPoint[] = [
        { latitude: -1.29, longitude: 36.82 },
        { latitude: -1.29, longitude: 36.825 },
        { latitude: -1.295, longitude: 36.825 },
        { latitude: -1.295, longitude: 36.82 },
      ];

      const results = await repository.findRidersInPolygon(polygon);

      expect(results.length).toBeGreaterThanOrEqual(1);
      const centerRider = results.find((r) => r.riderId === TEST_RIDERS[0].id);
      expect(centerRider).toBeDefined();
    });

    it('should exclude riders outside the polygon', async () => {
      const smallPolygon: GeoPoint[] = [
        { latitude: -1.292, longitude: 36.8218 },
        { latitude: -1.292, longitude: 36.822 },
        { latitude: -1.2922, longitude: 36.822 },
        { latitude: -1.2922, longitude: 36.8218 },
      ];

      const results = await repository.findRidersInPolygon(smallPolygon);

      const riderIds = results.map((r) => r.riderId);
      expect(riderIds).toContain(TEST_RIDERS[0].id);
      expect(riderIds).not.toContain(TEST_RIDERS[5].id);
    });
  });

  describe('upsertSnapshot and appendHistory', () => {
    it('should insert a new snapshot and update on conflict', async () => {
      const testRiderId = uuidv4();
      const locationData = {
        riderId: testRiderId,
        latitude: -1.3,
        longitude: 36.83,
        heading: 45,
        speed: 15,
        accuracy: 8,
        recordedAt: new Date(),
      };

      await repository.upsertSnapshot(locationData);

      let results = await repository.findNearbyRiders({
        point: { latitude: -1.3, longitude: 36.83 },
        radiusMeters: 100,
      });
      let rider = results.find((r) => r.riderId === testRiderId);
      expect(rider).toBeDefined();
      expect(rider!.heading).toBe(45);

      await repository.upsertSnapshot({
        ...locationData,
        heading: 90,
        latitude: -1.301,
      });

      results = await repository.findNearbyRiders({
        point: { latitude: -1.301, longitude: 36.83 },
        radiusMeters: 100,
      });
      rider = results.find((r) => r.riderId === testRiderId);
      expect(rider).toBeDefined();
      expect(rider!.heading).toBe(90);
      expect(rider!.latitude).toBeCloseTo(-1.301, 5);

      await dataSource.query('DELETE FROM rider_location_snapshots WHERE rider_id = $1', [
        testRiderId,
      ]);
    });

    it('should append history records', async () => {
      const testRiderId = uuidv4();
      const baseTime = new Date('2024-01-15T10:00:00Z');

      for (let i = 0; i < 3; i++) {
        await repository.appendHistory({
          riderId: testRiderId,
          latitude: -1.29 - i * 0.001,
          longitude: 36.82,
          heading: i * 30,
          speed: 10 + i,
          accuracy: 5,
          recordedAt: new Date(baseTime.getTime() + i * 60000),
        });
      }

      const history = await repository.getRiderPath(
        testRiderId,
        new Date('2024-01-15T09:00:00Z'),
        new Date('2024-01-15T11:00:00Z')
      );

      expect(history.length).toBe(3);
      expect(history[0].recordedAt.getTime()).toBeLessThan(history[1].recordedAt.getTime());
      expect(history[1].recordedAt.getTime()).toBeLessThan(history[2].recordedAt.getTime());

      await dataSource.query('DELETE FROM rider_location_history WHERE rider_id = $1', [
        testRiderId,
      ]);
    });
  });

  describe('getRiderPath', () => {
    it('should return path points ordered by time ascending', async () => {
      const testRiderId = uuidv4();
      const baseTime = new Date('2024-01-15T10:00:00Z');

      const points = [
        { lat: -1.29, lng: 36.82, time: 0 },
        { lat: -1.291, lng: 36.821, time: 60000 },
        { lat: -1.292, lng: 36.822, time: 120000 },
        { lat: -1.293, lng: 36.823, time: 180000 },
      ];

      for (const point of points) {
        await repository.appendHistory({
          riderId: testRiderId,
          latitude: point.lat,
          longitude: point.lng,
          recordedAt: new Date(baseTime.getTime() + point.time),
        });
      }

      const path = await repository.getRiderPath(
        testRiderId,
        new Date('2024-01-15T09:00:00Z'),
        new Date('2024-01-15T11:00:00Z')
      );

      expect(path.length).toBe(4);
      expect(path[0].latitude).toBeCloseTo(-1.29, 3);
      expect(path[3].latitude).toBeCloseTo(-1.293, 3);

      await dataSource.query('DELETE FROM rider_location_history WHERE rider_id = $1', [
        testRiderId,
      ]);
    });

    it('should filter by time range', async () => {
      const testRiderId = uuidv4();

      await repository.appendHistory({
        riderId: testRiderId,
        latitude: -1.29,
        longitude: 36.82,
        recordedAt: new Date('2024-01-15T09:00:00Z'),
      });
      await repository.appendHistory({
        riderId: testRiderId,
        latitude: -1.291,
        longitude: 36.821,
        recordedAt: new Date('2024-01-15T10:30:00Z'),
      });
      await repository.appendHistory({
        riderId: testRiderId,
        latitude: -1.292,
        longitude: 36.822,
        recordedAt: new Date('2024-01-15T12:00:00Z'),
      });

      const path = await repository.getRiderPath(
        testRiderId,
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-15T11:00:00Z')
      );

      expect(path.length).toBe(1);
      expect(path[0].latitude).toBeCloseTo(-1.291, 3);

      await dataSource.query('DELETE FROM rider_location_history WHERE rider_id = $1', [
        testRiderId,
      ]);
    });
  });
});
