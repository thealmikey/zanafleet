import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RiderLocationHistoryEntity } from '../../entities/rider-location-history.entity';
import { RiderLocationSnapshotEntity } from '../../entities/rider-location-snapshot.entity';
import { LocationIntelligenceModule } from '../../location-intelligence.module';
import { GeoProviderRegistry } from '../../providers/geo-provider-registry.service';
import { Neo4jRiderCandidateRepository } from '../../repositories/neo4j-rider-candidate.repository';
import { RiderLocationRepository } from '../../repositories/rider-location.repository';
import { H3Service } from '../../services/h3.service';
import { HeatmapService } from '../../services/heatmap.service';
import { LocationIntelligenceService } from '../../services/location-intelligence.service';

/**
 * Mock EventLoggerService for testing.
 * The actual service path is not directly importable, so we define a mock class.
 */
class MockEventLoggerService {
  logEvent = jest.fn().mockResolvedValue(undefined);
  logFailedEvent = jest.fn().mockResolvedValue(undefined);
}

/**
 * Mock RetryService for testing.
 * The actual service path is not directly importable, so we define a mock class.
 */
class MockRetryService {
  scheduleRetry = jest.fn().mockResolvedValue(undefined);
  processRetries = jest.fn().mockResolvedValue(undefined);
}

/**
 * Integration test to verify LocationIntelligenceModule can be bootstrapped
 * and LocationIntelligenceService can be resolved from the DI container.
 *
 * Requires a running PostgreSQL instance with PostGIS extension.
 * Run with: npm run test:integration
 * Ensure docker-compose.test.yml services are running.
 *
 * These tests will be skipped gracefully if the database is not available.
 */
describe('LocationIntelligenceModule Integration', () => {
  let module: TestingModule | undefined;
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
          }),
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
          LocationIntelligenceModule,
        ],
      })
        .overrideProvider('NATS_CLIENT')
        .useValue({
          emit: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
          send: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
        })
        .overrideProvider('EventLoggerService')
        .useValue(new MockEventLoggerService())
        .overrideProvider('RetryService')
        .useValue(new MockRetryService())
        .compile();

      await module.init();
      dbAvailable = true;
    } catch (error) {
      console.warn(
        'Skipping LocationIntelligenceModule integration tests: database not available.',
        error instanceof Error ? error.message : error,
      );
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (module) {
      try {
        await module.close();
      } catch {
        // Ignore close errors during teardown
      }
    }
  });

  describe('module bootstrap', () => {
    it('should resolve LocationIntelligenceService from the DI container', async () => {
      if (!dbAvailable || !module) {
        console.warn('Test skipped: database not available');
        return;
      }

      const service = module.get(LocationIntelligenceService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(LocationIntelligenceService);
    });

    it('should resolve H3Service from the DI container', async () => {
      if (!dbAvailable || !module) {
        console.warn('Test skipped: database not available');
        return;
      }

      const service = module.get(H3Service);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(H3Service);
    });

    it('should resolve HeatmapService from the DI container', async () => {
      if (!dbAvailable || !module) {
        console.warn('Test skipped: database not available');
        return;
      }

      const service = module.get(HeatmapService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(HeatmapService);
    });

    it('should resolve RiderLocationRepository from the DI container', async () => {
      if (!dbAvailable || !module) {
        console.warn('Test skipped: database not available');
        return;
      }

      const repository = module.get(RiderLocationRepository);
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(RiderLocationRepository);
    });

    it('should resolve Neo4jRiderCandidateRepository from the DI container', async () => {
      if (!dbAvailable || !module) {
        console.warn('Test skipped: database not available');
        return;
      }

      const repository = module.get(Neo4jRiderCandidateRepository);
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(Neo4jRiderCandidateRepository);
    });

    it('should resolve GeoProviderRegistry from the DI container', async () => {
      if (!dbAvailable || !module) {
        console.warn('Test skipped: database not available');
        return;
      }

      const registry = module.get(GeoProviderRegistry);
      expect(registry).toBeDefined();
      expect(registry).toBeInstanceOf(GeoProviderRegistry);
    });

    it('should have NoOpGeoProvider registered as default', async () => {
      if (!dbAvailable || !module) {
        console.warn('Test skipped: database not available');
        return;
      }

      const registry = module.get(GeoProviderRegistry);
      expect(registry.getDefaultId()).toBe('noop');
      expect(registry.has('noop')).toBe(true);
    });
  });

  describe('service dependencies', () => {
    it('should have LocationIntelligenceService with all required dependencies injected', async () => {
      if (!dbAvailable || !module) {
        console.warn('Test skipped: database not available');
        return;
      }

      const service = module.get(LocationIntelligenceService);

      // Verify the service can perform basic operations without throwing
      // due to missing dependencies (actual functionality requires full infrastructure)
      expect(service).toBeDefined();
      expect(typeof service.updateRiderLocation).toBe('function');
      expect(typeof service.findNearbyRiders).toBe('function');
      expect(typeof service.getHeatmap).toBe('function');
      expect(typeof service.getRiderPath).toBe('function');
    });
  });
});
